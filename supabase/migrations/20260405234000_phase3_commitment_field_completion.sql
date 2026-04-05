-- =================================================================
-- supabase/migrations/20260405234000_phase3_commitment_field_completion.sql
-- Description: Complete missing recurring commitment metadata for Phase 3 forms and lookups
--
-- ROLLBACK:
--   DROP INDEX IF EXISTS idx_commitments_service_name_lookup;
--   DROP INDEX IF EXISTS idx_commitments_type_active;
--   ALTER TABLE recurring_commitments DROP COLUMN IF EXISTS allows_early_repayment;
-- =================================================================

ALTER TABLE recurring_commitments
  ADD COLUMN IF NOT EXISTS allows_early_repayment BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_commitments_type_active
  ON recurring_commitments(user_id, commitment_type, next_due_date)
  WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_commitments_service_name_lookup
  ON recurring_commitments(user_id, lower(service_name))
  WHERE service_name IS NOT NULL AND deleted_at IS NULL;
