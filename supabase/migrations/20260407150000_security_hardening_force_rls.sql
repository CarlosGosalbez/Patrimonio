-- supabase/migrations/20260407150000_security_hardening_force_rls.sql
-- Description: Security hardening:
--   1. FORCE ROW LEVEL SECURITY on all user-data tables (protects against DB-owner bypass)
--   2. Fix RLS initplan on newer tables (push_subscriptions, feedback, notifications)
--      using (select auth.uid()) pattern for better query performance
--
-- ROLLBACK:
--   ALTER TABLE public.transactions           NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.accounts               NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.profiles               NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.categories             NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.recurring_commitments  NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.budgets                NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.investments            NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.investment_operations  NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.investment_snapshots   NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.custom_alerts          NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.notifications          NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.push_subscriptions     NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.recovery_codes         NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.feedback               NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.auto_categorization_rules NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.transaction_import_batches NO FORCE ROW LEVEL SECURITY;
--   -- Restore original policies for push_subscriptions, feedback, notifications
--   -- (recreate without the (select ...) wrapper)

-- ============================================================
-- 1. FORCE ROW LEVEL SECURITY — all user-data tables
--    Ensures RLS applies even when accessed by the table owner
--    (e.g., superuser, service_role with set_config bypass attempts)
-- ============================================================
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;

ALTER TABLE public.recurring_commitments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.budgets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.investments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.investment_operations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.investment_snapshots FORCE ROW LEVEL SECURITY;

ALTER TABLE public.custom_alerts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE public.push_subscriptions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.recovery_codes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.feedback FORCE ROW LEVEL SECURITY;

ALTER TABLE public.auto_categorization_rules FORCE ROW LEVEL SECURITY;

ALTER TABLE public.transaction_import_batches FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 2. FIX RLS initplan — push_subscriptions
--    Replace auth.uid() with (select auth.uid()) to prevent
--    re-evaluation of the auth function on every row scan
-- ============================================================
DROP POLICY IF EXISTS "users_select_push_subscriptions" ON public.push_subscriptions;

DROP POLICY IF EXISTS "users_insert_push_subscriptions" ON public.push_subscriptions;

DROP POLICY IF EXISTS "users_update_push_subscriptions" ON public.push_subscriptions;

DROP POLICY IF EXISTS "users_delete_push_subscriptions" ON public.push_subscriptions;

CREATE POLICY "users_select_push_subscriptions" ON public.push_subscriptions FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_insert_push_subscriptions" ON public.push_subscriptions FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_push_subscriptions" ON public.push_subscriptions FOR
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

CREATE POLICY "users_delete_push_subscriptions" ON public.push_subscriptions FOR DELETE USING (
    (
        select auth.uid ()
    ) = user_id
);

-- ============================================================
-- 3. FIX RLS initplan — feedback
-- ============================================================
DROP POLICY IF EXISTS "users_select_feedback" ON public.feedback;

DROP POLICY IF EXISTS "users_insert_feedback" ON public.feedback;

CREATE POLICY "users_select_feedback" ON public.feedback FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "users_insert_feedback" ON public.feedback FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

-- ============================================================
-- 4. FIX RLS initplan — notifications (if policies exist)
-- ============================================================
-- notifications has no deleted_at column — only SELECT and UPDATE policies exist
DROP POLICY IF EXISTS "users_select_notifications" ON public.notifications;

DROP POLICY IF EXISTS "users_insert_notifications" ON public.notifications;

DROP POLICY IF EXISTS "users_update_notifications" ON public.notifications;

CREATE POLICY "users_select_notifications" ON public.notifications FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_notifications" ON public.notifications FOR
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
-- 5. FIX RLS initplan — recovery_codes
-- ============================================================
DROP POLICY IF EXISTS "users_select_recovery_codes" ON public.recovery_codes;

DROP POLICY IF EXISTS "users_insert_recovery_codes" ON public.recovery_codes;

DROP POLICY IF EXISTS "users_update_recovery_codes" ON public.recovery_codes;

DROP POLICY IF EXISTS "users_delete_recovery_codes" ON public.recovery_codes;

CREATE POLICY "users_select_recovery_codes" ON public.recovery_codes FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_insert_recovery_codes" ON public.recovery_codes FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_update_recovery_codes" ON public.recovery_codes FOR
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

CREATE POLICY "users_delete_recovery_codes" ON public.recovery_codes FOR DELETE USING (
    (
        select auth.uid ()
    ) = user_id
);

-- ============================================================
-- 6. FIX RLS initplan — investment_snapshots
--    Table has user_id directly — use (select auth.uid()) subquery pattern
-- ============================================================
DROP POLICY IF EXISTS "users_select_snapshots" ON public.investment_snapshots;

DROP POLICY IF EXISTS "users_insert_snapshots" ON public.investment_snapshots;

CREATE POLICY "users_select_snapshots" ON public.investment_snapshots FOR
SELECT USING (
        (
            select auth.uid ()
        ) = user_id
    );

CREATE POLICY "users_insert_snapshots" ON public.investment_snapshots FOR
INSERT
WITH
    CHECK (
        (
            select auth.uid ()
        ) = user_id
    );