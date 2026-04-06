-- =================================================================
-- supabase/migrations/20260406170000_phase5_budget_analytics_hardening.sql
-- Description: Harden Phase 5 budgets + analytics with safe budget validation and notification dedupe indexes
--
-- ROLLBACK:
--   DROP INDEX IF EXISTS public.idx_transactions_budget_analytics;
--   DROP INDEX IF EXISTS public.idx_budgets_user_category_period_start_active;
--   DROP INDEX IF EXISTS public.idx_notifications_user_event_key_unique;
--   DROP TRIGGER IF EXISTS trg_budgets_no_resurrect ON public.budgets;
--   DROP TRIGGER IF EXISTS trg_budgets_validate_category ON public.budgets;
--   DROP FUNCTION IF EXISTS public.validate_budget_category();
-- =================================================================

-- ─── 1. Notification dedupe index for upsert(user_id,event_key) ────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_event_key_unique
  ON public.notifications(user_id, event_key)
  WHERE event_key IS NOT NULL;

-- ─── 2. Budget uniqueness + analytics access pattern indexes ───────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_category_period_start_active
  ON public.budgets(user_id, category_id, period, start_date)
  WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_budget_analytics
  ON public.transactions(user_id, category_id, transaction_date DESC)
  WHERE deleted_at IS NULL AND is_income = false;

-- ─── 3. Budget category validation trigger ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_budget_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_category RECORD;
BEGIN
  SELECT c.id, c.user_id, c.is_income, c.deleted_at
    INTO v_category
    FROM public.categories c
   WHERE c.id = NEW.category_id;

  IF v_category.id IS NULL THEN
    RAISE EXCEPTION 'Budget category % does not exist', NEW.category_id;
  END IF;

  IF v_category.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Budget category % is deleted', NEW.category_id;
  END IF;

  IF v_category.is_income = true THEN
    RAISE EXCEPTION 'Budgets only support expense categories';
  END IF;

  IF v_category.user_id IS NOT NULL AND v_category.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'Budget category % does not belong to the user', NEW.category_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_budgets_validate_category ON public.budgets;
CREATE TRIGGER trg_budgets_validate_category
  BEFORE INSERT OR UPDATE OF category_id, user_id
  ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.validate_budget_category();

-- ─── 4. Prevent resurrecting soft-deleted budgets ──────────────────────────
DROP TRIGGER IF EXISTS trg_budgets_no_resurrect ON public.budgets;
CREATE TRIGGER trg_budgets_no_resurrect
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.prevent_resurrect();
