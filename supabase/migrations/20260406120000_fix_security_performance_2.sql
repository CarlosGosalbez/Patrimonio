-- supabase/migrations/20260406120000_fix_security_performance_2.sql
-- Description: Fix remaining Supabase linter warnings after Phase 4 migration:
--   1. prevent_resurrect() mutable search_path
--   2. transaction_import_batches RLS initplan
--   3. Materialized views accessible by authenticated role → revoke + SECURITY DEFINER RPCs
--
-- ROLLBACK:
--   GRANT SELECT ON monthly_account_balance TO authenticated;
--   GRANT SELECT ON monthly_category_spending TO authenticated;
--   DROP FUNCTION IF EXISTS get_monthly_balance(DATE);
--   DROP FUNCTION IF EXISTS get_top_category_spending(DATE, INT);
--   DROP FUNCTION IF EXISTS get_category_spending(DATE);
--   ALTER FUNCTION public.prevent_resurrect() RESET search_path;
--   DROP POLICY IF EXISTS "users_select_transaction_import_batches" ON public.transaction_import_batches;
--   DROP POLICY IF EXISTS "users_insert_transaction_import_batches" ON public.transaction_import_batches;
--   DROP POLICY IF EXISTS "users_update_transaction_import_batches" ON public.transaction_import_batches;
--   CREATE POLICY "users_select_transaction_import_batches" ON public.transaction_import_batches
--     FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
--   CREATE POLICY "users_insert_transaction_import_batches" ON public.transaction_import_batches
--     FOR INSERT WITH CHECK (auth.uid() = user_id);
--   CREATE POLICY "users_update_transaction_import_batches" ON public.transaction_import_batches
--     FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 1. SECURITY: Fix prevent_resurrect() mutable search_path
-- ============================================================
ALTER FUNCTION public.prevent_resurrect() SET search_path = '';

-- ============================================================
-- 2. PERFORMANCE: Fix transaction_import_batches RLS initplan
-- ============================================================
DROP POLICY IF EXISTS "users_select_transaction_import_batches" ON public.transaction_import_batches;

DROP POLICY IF EXISTS "users_insert_transaction_import_batches" ON public.transaction_import_batches;

DROP POLICY IF EXISTS "users_update_transaction_import_batches" ON public.transaction_import_batches;

CREATE POLICY "users_select_transaction_import_batches" ON public.transaction_import_batches FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "users_insert_transaction_import_batches" ON public.transaction_import_batches FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_transaction_import_batches" ON public.transaction_import_batches FOR
UPDATE USING (
    (
        select auth.uid ()
    ) = user_id
)
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

-- ============================================================
-- 3. SECURITY: Revoke authenticated access to materialized views
--    + create SECURITY DEFINER RPCs (filter by auth.uid() at DB level)
-- ============================================================
REVOKE SELECT ON public.monthly_account_balance FROM authenticated;

REVOKE SELECT ON public.monthly_category_spending FROM authenticated;

-- ── get_monthly_balance(p_month) ──────────────────────────────
-- Returns net_amount_cents for the calling user for a given month.
-- Used in dashboard: current month + previous month balances.
CREATE OR REPLACE FUNCTION public.get_monthly_balance(p_month DATE)
RETURNS TABLE(net_amount_cents BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT mab.net_amount_cents
  FROM   public.monthly_account_balance mab
  WHERE  mab.user_id = auth.uid()
  AND    mab.month   = p_month;
$$;

GRANT
EXECUTE ON FUNCTION public.get_monthly_balance (DATE) TO authenticated;

-- ── get_top_category_spending(p_month, p_limit) ───────────────
-- Returns top N spending categories for the calling user for a month.
-- Used in dashboard: top categories widget.
CREATE OR REPLACE FUNCTION public.get_top_category_spending(
  p_month  DATE,
  p_limit  INT DEFAULT 5
)
RETURNS TABLE(
  category_id       UUID,
  total_cents       BIGINT,
  transaction_count BIGINT,
  category_name     TEXT,
  category_color    TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    mcs.category_id,
    mcs.total_cents,
    mcs.transaction_count,
    c.name  AS category_name,
    c.color AS category_color
  FROM   public.monthly_category_spending mcs
  JOIN   public.categories c ON c.id = mcs.category_id
  WHERE  mcs.user_id = auth.uid()
  AND    mcs.month   = p_month
  ORDER  BY mcs.total_cents DESC
  LIMIT  p_limit;
$$;

GRANT
EXECUTE ON FUNCTION public.get_top_category_spending (DATE, INT) TO authenticated;

-- ── get_category_spending(p_month) ───────────────────────────
-- Returns all category spending for the calling user for a month.
-- Used in: budget pressure + commitments budget check.
CREATE OR REPLACE FUNCTION public.get_category_spending(p_month DATE)
RETURNS TABLE(
  category_id UUID,
  total_cents BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT mcs.category_id, mcs.total_cents
  FROM   public.monthly_category_spending mcs
  WHERE  mcs.user_id = auth.uid()
  AND    mcs.month   = p_month;
$$;

GRANT
EXECUTE ON FUNCTION public.get_category_spending (DATE) TO authenticated;