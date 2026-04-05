-- =================================================================
-- supabase/migrations/20260405233000_phase3_dashboard_commitments_alerts_enhancements.sql
-- Description: Phase 3 enhancements for dashboard materialized views, commitments, and alert digest preferences
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_refresh_dashboard_materialized_views ON transactions;
--   DROP FUNCTION IF EXISTS refresh_dashboard_materialized_views();
--   ALTER TABLE profiles DROP COLUMN IF EXISTS last_alert_digest_sent_at;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS weekly_alert_digest_enabled;
--   DROP INDEX IF EXISTS idx_custom_alerts_category_due_active;
--   DROP INDEX IF EXISTS idx_commitments_service_name_lookup;
--   DROP INDEX IF EXISTS idx_commitments_type_active;
--   ALTER TABLE recurring_commitments DROP CONSTRAINT IF EXISTS chk_commitments_interest_rate_range;
--   ALTER TABLE recurring_commitments DROP COLUMN IF EXISTS allows_early_repayment;
--   REFRESH MATERIALIZED VIEW monthly_category_spending;
--   REFRESH MATERIALIZED VIEW monthly_account_balance;
-- =================================================================

ALTER TABLE recurring_commitments
  ADD COLUMN IF NOT EXISTS allows_early_repayment BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_commitments_interest_rate_range'
  ) THEN
    ALTER TABLE recurring_commitments
      ADD CONSTRAINT chk_commitments_interest_rate_range CHECK (
        interest_rate IS NULL
        OR (interest_rate >= 0 AND interest_rate <= 100)
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_commitments_type_active
  ON recurring_commitments(user_id, commitment_type, next_due_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_commitments_service_name_lookup
  ON recurring_commitments(user_id, lower(service_name))
  WHERE service_name IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_custom_alerts_category_due_active
  ON custom_alerts(user_id, category_id, due_date)
  WHERE is_active = true AND deleted_at IS NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS weekly_alert_digest_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_alert_digest_sent_at DATE;

CREATE OR REPLACE FUNCTION refresh_dashboard_materialized_views()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW monthly_account_balance;
  REFRESH MATERIALIZED VIEW monthly_category_spending;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_dashboard_materialized_views ON transactions;

CREATE TRIGGER trg_refresh_dashboard_materialized_views
  AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON transactions
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_materialized_views();

REFRESH MATERIALIZED VIEW monthly_account_balance;
REFRESH MATERIALIZED VIEW monthly_category_spending;
