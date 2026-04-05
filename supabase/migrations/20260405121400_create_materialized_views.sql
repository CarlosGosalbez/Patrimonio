-- supabase/migrations/20260405121400_create_materialized_views.sql
-- Description: Materialized views for dashboard performance
-- ROLLBACK:
--   DROP MATERIALIZED VIEW IF EXISTS monthly_category_spending CASCADE;
--   DROP MATERIALIZED VIEW IF EXISTS monthly_account_balance CASCADE;

-- Monthly balance per account
CREATE MATERIALIZED VIEW monthly_account_balance AS
SELECT
  user_id,
  account_id,
  date_trunc('month', transaction_date)::date AS month,
  SUM(CASE WHEN is_income THEN amount_cents ELSE -amount_cents END) AS net_amount_cents,
  COUNT(*) AS transaction_count
FROM transactions
WHERE deleted_at IS NULL
GROUP BY user_id, account_id, date_trunc('month', transaction_date);

CREATE INDEX idx_monthly_balance_user_month ON monthly_account_balance(user_id, month DESC);

-- Monthly spending per category
CREATE MATERIALIZED VIEW monthly_category_spending AS
SELECT
  user_id,
  category_id,
  date_trunc('month', transaction_date)::date AS month,
  SUM(amount_cents) AS total_cents,
  AVG(amount_cents) AS avg_cents,
  COUNT(*) AS transaction_count
FROM transactions
WHERE deleted_at IS NULL AND is_income = false
GROUP BY user_id, category_id, date_trunc('month', transaction_date);

CREATE INDEX idx_monthly_spending_user_month ON monthly_category_spending(user_id, month DESC);
