-- supabase/migrations/20260408020001_create_avatars_bucket.sql
-- Description: Create Storage bucket for user avatars with RLS policies
-- ROLLBACK:
--   DELETE FROM storage.buckets WHERE id = 'avatars';

-- ============================================================
-- 1. CREATE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- public read access (signed URLs not needed for avatars)
  2097152,  -- 2MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. RLS POLICIES FOR AVATARS BUCKET
-- ============================================================

-- Users can upload their own avatar (folder structure: {user_id}/avatar.{ext})
CREATE POLICY "users_insert_own_avatar" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    -- Prevent path traversal: no .. or / in filename after folder
    (storage.filename(name)) !~ '\.\.|/'
  );

-- Users can update/replace their own avatar
CREATE POLICY "users_update_own_avatar" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "users_delete_own_avatar" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read access for all avatars (bucket is public)
CREATE POLICY "public_read_avatars" ON storage.objects FOR
SELECT TO public USING (bucket_id = 'avatars');

-- ============================================================
-- 3. COMMENTS
-- ============================================================
COMMENT ON POLICY "users_insert_own_avatar" ON storage.objects IS 'Allow authenticated users to upload avatars to their own folder only';

COMMENT ON POLICY "public_read_avatars" ON storage.objects IS 'Allow anyone to read avatar images (public bucket)';