-- =================================================================
-- supabase/migrations/20260405230000_phase3_dashboard_commitments_alerts.sql
-- Description: Phase 3 support for dashboard, recurring commitments, subscriptions and alert workflows
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS refresh_dashboard_materialized_views(UUID);
--   DROP FUNCTION IF EXISTS get_net_worth(UUID);
--   DROP FUNCTION IF EXISTS project_cash_flow(UUID, INTEGER);
--   DROP INDEX IF EXISTS idx_notifications_dedupe_key;
--   DROP INDEX IF EXISTS idx_notifications_type_user;
--   DROP INDEX IF EXISTS idx_transactions_recurring_id;
--   DROP INDEX IF EXISTS idx_transactions_recurring_instance_unique;
--   DROP INDEX IF EXISTS idx_commitments_type_active;
--   ALTER TABLE notifications DROP COLUMN IF EXISTS dedupe_key;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS weekly_alert_digest_enabled;
--   ALTER TABLE recurring_commitments DROP COLUMN IF EXISTS early_repayment_allowed;
--   ALTER TABLE transactions DROP COLUMN IF EXISTS is_recurring_instance;
--   ALTER TABLE transactions DROP COLUMN IF EXISTS recurring_id;
-- =================================================================

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS recurring_id UUID REFERENCES recurring_commitments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_recurring_instance BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_transactions_recurring_id
  ON transactions(recurring_id)
  WHERE recurring_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurring_instance_unique
  ON transactions(user_id, recurring_id, transaction_date)
  WHERE recurring_id IS NOT NULL AND is_recurring_instance = true AND deleted_at IS NULL;

ALTER TABLE recurring_commitments
  ADD COLUMN IF NOT EXISTS early_repayment_allowed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_commitments_type_active
  ON recurring_commitments(user_id, commitment_type, next_due_date)
  WHERE is_active = true AND deleted_at IS NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS weekly_alert_digest_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key
  ON notifications(dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_type_user
  ON notifications(user_id, type, created_at DESC);

CREATE OR REPLACE FUNCTION refresh_dashboard_materialized_views(p_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF p_user_id IS NOT NULL AND auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  REFRESH MATERIALIZED VIEW monthly_account_balance;
  REFRESH MATERIALIZED VIEW monthly_category_spending;
END;
$$;

CREATE OR REPLACE FUNCTION get_net_worth(p_user_id UUID)
RETURNS TABLE(
  total_cents INTEGER,
  cash_cents INTEGER,
  investments_cents INTEGER,
  currency VARCHAR(3)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH profile_currency AS (
    SELECT COALESCE(MAX(p.currency), 'EUR')::VARCHAR(3) AS value
    FROM profiles p
    WHERE p.user_id = p_user_id
      AND p.deleted_at IS NULL
  ),
  account_balances AS (
    SELECT COALESCE(
      SUM(
        a.initial_balance_cents + COALESCE(tx.net_amount_cents, 0)
      ),
      0
    )::INTEGER AS total_cents
    FROM accounts a
    LEFT JOIN (
      SELECT
        t.account_id,
        SUM(CASE WHEN t.is_income THEN t.amount_cents ELSE -t.amount_cents END)::INTEGER AS net_amount_cents
      FROM transactions t
      WHERE t.user_id = p_user_id
        AND t.deleted_at IS NULL
      GROUP BY t.account_id
    ) tx ON tx.account_id = a.id
    WHERE a.user_id = p_user_id
      AND a.deleted_at IS NULL
  ),
  investment_balances AS (
    SELECT COALESCE(
      SUM(COALESCE(i.current_value_cents, i.total_invested_cents)),
      0
    )::INTEGER AS total_cents
    FROM investments i
    WHERE i.user_id = p_user_id
      AND i.deleted_at IS NULL
      AND i.is_active = true
  )
  SELECT
    account_balances.total_cents + investment_balances.total_cents AS total_cents,
    account_balances.total_cents AS cash_cents,
    investment_balances.total_cents AS investments_cents,
    profile_currency.value AS currency
  FROM account_balances
  CROSS JOIN investment_balances
  CROSS JOIN profile_currency;
END;
$$;

CREATE OR REPLACE FUNCTION project_cash_flow(
  p_user_id UUID,
  p_months INTEGER DEFAULT 12
)
RETURNS TABLE(
  month_date DATE,
  projected_income_cents INTEGER,
  projected_expense_cents INTEGER,
  net_cents INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH horizon AS (
    SELECT
      date_trunc('month', CURRENT_DATE)::DATE AS start_date,
      (
        date_trunc('month', CURRENT_DATE)
        + ((GREATEST(p_months, 1) - 1) || ' months')::INTERVAL
        + INTERVAL '1 month'
        - INTERVAL '1 day'
      )::DATE AS end_date
  ),
  month_series AS (
    SELECT generate_series(
      (SELECT start_date FROM horizon),
      (
        date_trunc('month', (SELECT end_date FROM horizon))::DATE
      ),
      '1 month'::INTERVAL
    )::DATE AS month_date
  ),
  occurrences AS (
    SELECT
      date_trunc('month', occurrence.due_date)::DATE AS month_date,
      c.is_income,
      c.amount_cents
    FROM recurring_commitments c
    CROSS JOIN horizon h
    CROSS JOIN LATERAL (
      SELECT due_date::DATE
      FROM generate_series(
        GREATEST(c.next_due_date, c.start_date)::TIMESTAMP,
        LEAST(COALESCE(c.end_date, h.end_date), h.end_date)::TIMESTAMP,
        CASE c.frequency
          WHEN 'daily' THEN INTERVAL '1 day'
          WHEN 'weekly' THEN INTERVAL '1 week'
          WHEN 'biweekly' THEN INTERVAL '2 weeks'
          WHEN 'monthly' THEN INTERVAL '1 month'
          WHEN 'bimonthly' THEN INTERVAL '2 months'
          WHEN 'quarterly' THEN INTERVAL '3 months'
          WHEN 'semiannual' THEN INTERVAL '6 months'
          WHEN 'annual' THEN INTERVAL '1 year'
        END
      ) AS due_date
    ) occurrence
    WHERE c.user_id = p_user_id
      AND c.deleted_at IS NULL
      AND c.is_active = true
      AND c.start_date <= h.end_date
      AND (c.end_date IS NULL OR c.end_date >= h.start_date)
      AND occurrence.due_date BETWEEN h.start_date AND h.end_date
  ),
  totals AS (
    SELECT
      o.month_date,
      COALESCE(SUM(CASE WHEN o.is_income THEN o.amount_cents ELSE 0 END), 0)::INTEGER AS projected_income_cents,
      COALESCE(SUM(CASE WHEN o.is_income THEN 0 ELSE o.amount_cents END), 0)::INTEGER AS projected_expense_cents
    FROM occurrences o
    GROUP BY o.month_date
  )
  SELECT
    ms.month_date,
    COALESCE(t.projected_income_cents, 0) AS projected_income_cents,
    COALESCE(t.projected_expense_cents, 0) AS projected_expense_cents,
    COALESCE(t.projected_income_cents, 0) - COALESCE(t.projected_expense_cents, 0) AS net_cents
  FROM month_series ms
  LEFT JOIN totals t ON t.month_date = ms.month_date
  ORDER BY ms.month_date;
END;
$$;
