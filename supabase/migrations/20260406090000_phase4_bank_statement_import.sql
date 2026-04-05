-- supabase/migrations/20260406090000_phase4_bank_statement_import.sql
-- Description: Secure bank statement import batches, dedupe keys, and rollback helpers
-- ROLLBACK:
--   REVOKE EXECUTE ON FUNCTION public.rollback_import_batch(UUID) FROM authenticated;
--   REVOKE EXECUTE ON FUNCTION public.create_user_notification(public.notification_type, public.alert_severity, TEXT, TEXT, TEXT, UUID, TEXT) FROM authenticated;
--   DROP FUNCTION IF EXISTS public.rollback_import_batch(UUID);
--   DROP FUNCTION IF EXISTS public.create_user_notification(public.notification_type, public.alert_severity, TEXT, TEXT, TEXT, UUID, TEXT);
--   ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_import_batch_id_fkey;
--   DROP INDEX IF EXISTS public.idx_transactions_import_dedupe_key;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS import_dedupe_key;
--   DROP TRIGGER IF EXISTS trg_transaction_import_batches_no_resurrect ON public.transaction_import_batches;
--   DROP TRIGGER IF EXISTS trg_transaction_import_batches_updated_at ON public.transaction_import_batches;
--   DROP TABLE IF EXISTS public.transaction_import_batches;
--   DROP TYPE IF EXISTS public.import_batch_status;
--   DROP TYPE IF EXISTS public.import_file_format;

CREATE TYPE public.import_file_format AS ENUM ('xlsx', 'xls', 'csv', 'ofx', 'qif');
CREATE TYPE public.import_batch_status AS ENUM ('processing', 'confirmed', 'rolled_back', 'failed');

CREATE OR REPLACE FUNCTION public.prevent_resurrect()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'Cannot restore a soft-deleted record';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TABLE public.transaction_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  source_format public.import_file_format NOT NULL,
  source_bank VARCHAR(50),
  file_name VARCHAR(255) NOT NULL,
  file_checksum VARCHAR(64) NOT NULL,
  status public.import_batch_status NOT NULL DEFAULT 'processing',
  row_count INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  unexpected_charge_count INTEGER NOT NULL DEFAULT 0,
  expected_income_gap_count INTEGER NOT NULL DEFAULT 0,
  source_range_start DATE,
  source_range_end DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_transaction_import_batches_file_name_not_empty CHECK (char_length(trim(file_name)) > 0),
  CONSTRAINT chk_transaction_import_batches_checksum_length CHECK (char_length(file_checksum) = 64),
  CONSTRAINT chk_transaction_import_batches_row_count_non_negative CHECK (row_count >= 0),
  CONSTRAINT chk_transaction_import_batches_imported_count_non_negative CHECK (imported_count >= 0),
  CONSTRAINT chk_transaction_import_batches_duplicate_count_non_negative CHECK (duplicate_count >= 0),
  CONSTRAINT chk_transaction_import_batches_unexpected_charge_count_non_negative CHECK (unexpected_charge_count >= 0),
  CONSTRAINT chk_transaction_import_batches_expected_income_gap_count_non_negative CHECK (expected_income_gap_count >= 0),
  CONSTRAINT chk_transaction_import_batches_deleted_order CHECK (deleted_at IS NULL OR deleted_at >= created_at),
  CONSTRAINT chk_transaction_import_batches_confirmed_after_created CHECK (confirmed_at IS NULL OR confirmed_at >= created_at),
  CONSTRAINT chk_transaction_import_batches_completed_after_created CHECK (completed_at IS NULL OR completed_at >= created_at),
  CONSTRAINT chk_transaction_import_batches_rolled_back_after_created CHECK (rolled_back_at IS NULL OR rolled_back_at >= created_at),
  CONSTRAINT chk_transaction_import_batches_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE public.transaction_import_batches IS 'Tracks user-owned bank statement import jobs for preview confirmation and rollback.';
COMMENT ON COLUMN public.transaction_import_batches.file_checksum IS 'SHA-256 checksum of the uploaded source file to detect repeated imports safely.';
COMMENT ON COLUMN public.transaction_import_batches.row_count IS 'Number of normalized rows detected in the source file before filtering.';
COMMENT ON COLUMN public.transaction_import_batches.imported_count IS 'Number of transactions inserted into transactions for the batch.';
COMMENT ON COLUMN public.transaction_import_batches.duplicate_count IS 'Number of rows skipped or flagged as duplicates for the batch.';
COMMENT ON COLUMN public.transaction_import_batches.unexpected_charge_count IS 'Number of imported rows linked to cancelled subscriptions.';
COMMENT ON COLUMN public.transaction_import_batches.expected_income_gap_count IS 'Number of overdue expected income commitments still missing after import.';
COMMENT ON COLUMN public.transaction_import_batches.metadata IS 'Structured import metadata such as parser hints, generated notifications, and preview stats.';

CREATE INDEX idx_transaction_import_batches_user_created
  ON public.transaction_import_batches(user_id, created_at DESC);

CREATE INDEX idx_transaction_import_batches_active
  ON public.transaction_import_batches(user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_transaction_import_batches_status
  ON public.transaction_import_batches(user_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.transaction_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_transaction_import_batches" ON public.transaction_import_batches
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "users_insert_transaction_import_batches" ON public.transaction_import_batches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_transaction_import_batches" ON public.transaction_import_batches
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.transaction_import_batches TO authenticated;

CREATE TRIGGER trg_transaction_import_batches_updated_at
  BEFORE UPDATE ON public.transaction_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

CREATE TRIGGER trg_transaction_import_batches_no_resurrect
  BEFORE UPDATE ON public.transaction_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.prevent_resurrect();

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS import_dedupe_key TEXT;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_import_batch_id_fkey
    FOREIGN KEY (import_batch_id)
    REFERENCES public.transaction_import_batches(id)
    ON DELETE SET NULL;

COMMENT ON COLUMN public.transactions.import_dedupe_key IS 'Stable hash used to prevent duplicate inserts from repeated statement imports.';

CREATE UNIQUE INDEX idx_transactions_import_dedupe_key
  ON public.transactions(user_id, import_dedupe_key)
  WHERE import_dedupe_key IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.create_user_notification(
  p_type public.notification_type,
  p_severity public.alert_severity,
  p_title TEXT,
  p_message TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_event_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
  v_notification_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF char_length(trim(p_title)) = 0 OR char_length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'Notification title and message are required';
  END IF;

  IF p_event_key IS NOT NULL THEN
    SELECT id
      INTO v_notification_id
      FROM public.notifications
     WHERE user_id = v_user_id
       AND event_key = p_event_key
     LIMIT 1;

    IF v_notification_id IS NOT NULL THEN
      RETURN v_notification_id;
    END IF;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    severity,
    title,
    message,
    target_type,
    target_id,
    event_key
  )
  VALUES (
    v_user_id,
    p_type,
    p_severity,
    trim(p_title),
    trim(p_message),
    p_target_type,
    p_target_id,
    p_event_key
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_user_notification(
  public.notification_type,
  public.alert_severity,
  TEXT,
  TEXT,
  TEXT,
  UUID,
  TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_user_notification(
  public.notification_type,
  public.alert_severity,
  TEXT,
  TEXT,
  TEXT,
  UUID,
  TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION public.rollback_import_batch(p_batch_id UUID)
RETURNS TABLE(rolled_back_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
  v_batch public.transaction_import_batches%ROWTYPE;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
    INTO v_batch
    FROM public.transaction_import_batches
   WHERE id = p_batch_id
     AND user_id = v_user_id
     AND deleted_at IS NULL
   LIMIT 1;

  IF v_batch.id IS NULL THEN
    RAISE EXCEPTION 'Import batch not found';
  END IF;

  IF v_batch.status = 'rolled_back' THEN
    RETURN QUERY SELECT 0;
    RETURN;
  END IF;

  UPDATE public.transactions
     SET deleted_at = NOW()
   WHERE user_id = v_user_id
     AND import_batch_id = p_batch_id
     AND deleted_at IS NULL;

  GET DIAGNOSTICS rolled_back_count = ROW_COUNT;

  UPDATE public.transaction_import_batches
     SET status = 'rolled_back',
         rolled_back_at = NOW(),
         metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{rollback_count}',
           to_jsonb(rolled_back_count),
           true
         )
   WHERE id = p_batch_id
     AND user_id = v_user_id;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_import_batch(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollback_import_batch(UUID) TO authenticated;
