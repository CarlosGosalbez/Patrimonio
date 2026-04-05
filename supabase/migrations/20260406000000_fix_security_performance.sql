-- supabase/migrations/20260406000000_fix_security_performance.sql
-- Description: Fix all Supabase linter warnings: security (function search_path, materialized
--              view exposure) and performance (RLS initplan, duplicate index).
--
-- ROLLBACK:
--   -- Re-expose materialized views (undo anon revoke):
--   GRANT SELECT ON monthly_account_balance TO anon;
--   GRANT SELECT ON monthly_category_spending TO anon;
--   -- Recreate dropped duplicate index:
--   CREATE INDEX idx_transactions_recurring_id_active ON transactions(recurring_id)
--     WHERE recurring_id IS NOT NULL AND deleted_at IS NULL;
--   -- Recreate original policies (replace (select auth.uid()) → auth.uid()):
--   -- (reverse of all the DROP/CREATE POLICY blocks below)

-- ============================================================
-- 1. SECURITY: Fix moddatetime() mutable search_path
-- ============================================================
ALTER FUNCTION public.moddatetime() SET search_path = '';

-- ============================================================
-- 2. SECURITY: Revoke anon access to materialized views
--    (authenticated access kept because server-side code
--     always filters with .eq('user_id', userId))
-- ============================================================
REVOKE SELECT ON monthly_account_balance FROM anon;

REVOKE SELECT ON monthly_category_spending FROM anon;

-- ============================================================
-- 3. PERFORMANCE: Duplicate index — drop the extra one
-- ============================================================
DROP INDEX IF EXISTS idx_transactions_recurring_id_active;

-- ============================================================
-- 4. PERFORMANCE: RLS initplan — replace auth.uid() with
--    (select auth.uid()) in every affected policy.
--    Pattern: DROP + recreate with the subquery form.
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select_profiles" ON profiles;

DROP POLICY IF EXISTS "users_insert_profiles" ON profiles;

DROP POLICY IF EXISTS "users_update_profiles" ON profiles;

CREATE POLICY "users_select_profiles" ON profiles FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_insert_profiles" ON profiles FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_profiles" ON profiles FOR
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

-- ── categories ───────────────────────────────────────────────
DROP POLICY IF EXISTS "categories_select" ON categories;

DROP POLICY IF EXISTS "users_insert_categories" ON categories;

DROP POLICY IF EXISTS "users_update_categories" ON categories;

CREATE POLICY "categories_select" ON categories FOR
SELECT USING (
        (
            user_id IS NULL
            OR (
                select auth.uid ()
            ) = user_id
        )
        AND deleted_at IS NULL
    );

CREATE POLICY "users_insert_categories" ON categories FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_categories" ON categories FOR
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

-- ── accounts ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select_accounts" ON accounts;

DROP POLICY IF EXISTS "users_insert_accounts" ON accounts;

DROP POLICY IF EXISTS "users_update_accounts" ON accounts;

CREATE POLICY "users_select_accounts" ON accounts FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "users_insert_accounts" ON accounts FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_accounts" ON accounts FOR
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

-- ── transactions ─────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select_transactions" ON transactions;

DROP POLICY IF EXISTS "users_insert_transactions" ON transactions;

DROP POLICY IF EXISTS "users_update_transactions" ON transactions;

CREATE POLICY "users_select_transactions" ON transactions FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "users_insert_transactions" ON transactions FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_transactions" ON transactions FOR
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

-- ── recurring_commitments ─────────────────────────────────────
DROP POLICY IF EXISTS "users_select_commitments" ON recurring_commitments;

DROP POLICY IF EXISTS "users_insert_commitments" ON recurring_commitments;

DROP POLICY IF EXISTS "users_update_commitments" ON recurring_commitments;

CREATE POLICY "users_select_commitments" ON recurring_commitments FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "users_insert_commitments" ON recurring_commitments FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_commitments" ON recurring_commitments FOR
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

-- ── budgets ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select_budgets" ON budgets;

DROP POLICY IF EXISTS "users_insert_budgets" ON budgets;

DROP POLICY IF EXISTS "users_update_budgets" ON budgets;

CREATE POLICY "users_select_budgets" ON budgets FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "users_insert_budgets" ON budgets FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_budgets" ON budgets FOR
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

-- ── auto_categorization_rules ─────────────────────────────────
DROP POLICY IF EXISTS "users_select_rules" ON auto_categorization_rules;

DROP POLICY IF EXISTS "users_insert_rules" ON auto_categorization_rules;

DROP POLICY IF EXISTS "users_update_rules" ON auto_categorization_rules;

CREATE POLICY "users_select_rules" ON auto_categorization_rules FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "users_insert_rules" ON auto_categorization_rules FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_rules" ON auto_categorization_rules FOR
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

-- ── custom_alerts ─────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select_alerts" ON custom_alerts;

DROP POLICY IF EXISTS "users_insert_alerts" ON custom_alerts;

DROP POLICY IF EXISTS "users_update_alerts" ON custom_alerts;

CREATE POLICY "users_select_alerts" ON custom_alerts FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "users_insert_alerts" ON custom_alerts FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_alerts" ON custom_alerts FOR
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

-- ── investments ───────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select_investments" ON investments;

DROP POLICY IF EXISTS "users_insert_investments" ON investments;

DROP POLICY IF EXISTS "users_update_investments" ON investments;

CREATE POLICY "users_select_investments" ON investments FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "users_insert_investments" ON investments FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_investments" ON investments FOR
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

-- ── investment_operations ─────────────────────────────────────
DROP POLICY IF EXISTS "users_select_operations" ON investment_operations;

DROP POLICY IF EXISTS "users_insert_operations" ON investment_operations;

DROP POLICY IF EXISTS "users_update_operations" ON investment_operations;

CREATE POLICY "users_select_operations" ON investment_operations FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "users_insert_operations" ON investment_operations FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_operations" ON investment_operations FOR
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

-- ── investment_snapshots ──────────────────────────────────────
DROP POLICY IF EXISTS "users_select_snapshots" ON investment_snapshots;

DROP POLICY IF EXISTS "users_insert_snapshots" ON investment_snapshots;

CREATE POLICY "users_select_snapshots" ON investment_snapshots FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_insert_snapshots" ON investment_snapshots FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

-- ── notifications ─────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select_notifications" ON notifications;

DROP POLICY IF EXISTS "users_update_notifications" ON notifications;

CREATE POLICY "users_select_notifications" ON notifications FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_notifications" ON notifications FOR
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

-- ── recovery_codes ────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select_recovery_codes" ON recovery_codes;

DROP POLICY IF EXISTS "users_insert_recovery_codes" ON recovery_codes;

DROP POLICY IF EXISTS "users_update_recovery_codes" ON recovery_codes;

DROP POLICY IF EXISTS "users_delete_recovery_codes" ON recovery_codes;

CREATE POLICY "users_select_recovery_codes" ON recovery_codes FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_insert_recovery_codes" ON recovery_codes FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_recovery_codes" ON recovery_codes FOR
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

CREATE POLICY "users_delete_recovery_codes" ON recovery_codes FOR DELETE USING (
    (
        select auth.uid ()
    ) = user_id
);