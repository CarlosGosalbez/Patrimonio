-- supabase/migrations/20260407100000_storage_informe_bucket.sql
-- Description: Create private 'informe' bucket for bank statement uploads + RLS policies
-- ROLLBACK:
--   DELETE FROM storage.objects WHERE bucket_id = 'informe';
--   DELETE FROM storage.buckets WHERE id = 'informe';
--   ALTER TABLE public.transaction_import_batches DROP COLUMN IF EXISTS storage_path;

-- ============================================================
-- 1. BUCKET CREATION
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'informe',
  'informe',
  false,
  5242880, -- 5 MB
  ARRAY[
    'text/csv',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. STORAGE RLS POLICIES
-- ============================================================

-- SELECT: user can only read files in their own folder
CREATE POLICY "informe_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'informe'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- INSERT: user can only upload to their own folder
CREATE POLICY "informe_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'informe'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE: user can only delete their own files
CREATE POLICY "informe_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'informe'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- UPDATE: user can update their own files (needed for upsert)
CREATE POLICY "informe_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'informe'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 3. EXTEND TRANSACTION_IMPORT_BATCHES WITH STORAGE PATH
-- ============================================================
ALTER TABLE public.transaction_import_batches
ADD COLUMN IF NOT EXISTS storage_path TEXT;

COMMENT ON COLUMN public.transaction_import_batches.storage_path IS 'Path to the uploaded file in the informe Storage bucket: {user_id}/{timestamp}_{filename}';