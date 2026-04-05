-- =================================================================
-- supabase/migrations/20260405234000_phase3_schema_alignment.sql
-- Description: Align the local migration history with the remote Phase 3 schema exposed through generated types.
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS refresh_dashboard_views();
--   DROP INDEX IF EXISTS idx_notifications_event_key;
--   ALTER TABLE notifications DROP COLUMN IF EXISTS event_key;
-- =================================================================

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS event_key TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_event_key
  ON notifications(event_key)
  WHERE event_key IS NOT NULL;

CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW monthly_account_balance;
  REFRESH MATERIALIZED VIEW monthly_category_spending;
END;
$$;

COMMENT ON FUNCTION refresh_dashboard_views IS 'Refreshes the dashboard materialized views used by the authenticated application.';
