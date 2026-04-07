-- supabase/migrations/20260407130000_fix_dashboard_dynamic.sql
-- Description: Fix dashboard showing 0 values — two root causes:
--   1. get_net_worth and refresh_dashboard_views have no GRANT TO authenticated
--   2. accounts.current_balance_cents never synced when transactions change
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_transactions_sync_account_balance ON public.transactions;
--   DROP FUNCTION IF EXISTS public.sync_account_balance_on_transaction();
--   REVOKE EXECUTE ON FUNCTION public.get_net_worth(UUID) FROM authenticated;
--   REVOKE EXECUTE ON FUNCTION public.refresh_dashboard_views() FROM authenticated;

-- ============================================================
-- 1. GRANTS for RPC functions
-- ============================================================

GRANT
EXECUTE ON FUNCTION public.get_net_worth (UUID) TO authenticated,
service_role;

GRANT
EXECUTE ON FUNCTION public.refresh_dashboard_views () TO authenticated,
service_role;

-- ============================================================
-- 2. Trigger: keep accounts.current_balance_cents in sync
--    when transactions are inserted, soft-deleted or modified.
--
--    Amount convention:
--      amount_cents is always positive in the DB.
--      is_income=true  → adds to account balance
--      is_income=false → subtracts from account balance
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_account_balance_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_delta INTEGER;
BEGIN
  -- ── INSERT ──────────────────────────────────────────────────────
  IF TG_OP = 'INSERT' THEN
    -- Only count active (non-deleted) rows
    IF NEW.deleted_at IS NULL THEN
      v_delta := CASE WHEN NEW.is_income THEN NEW.amount_cents ELSE -NEW.amount_cents END;
      UPDATE public.accounts
      SET current_balance_cents = current_balance_cents + v_delta
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;

  -- ── UPDATE ──────────────────────────────────────────────────────
  ELSIF TG_OP = 'UPDATE' THEN
    DECLARE
      v_old_delta INTEGER;
      v_new_delta INTEGER;
    BEGIN
      -- Compute effective delta for OLD state (0 if was already deleted)
      v_old_delta := CASE
        WHEN OLD.deleted_at IS NOT NULL THEN 0
        ELSE CASE WHEN OLD.is_income THEN OLD.amount_cents ELSE -OLD.amount_cents END
      END;

      -- Compute effective delta for NEW state (0 if now deleted)
      v_new_delta := CASE
        WHEN NEW.deleted_at IS NOT NULL THEN 0
        ELSE CASE WHEN NEW.is_income THEN NEW.amount_cents ELSE -NEW.amount_cents END
      END;

      v_delta := v_new_delta - v_old_delta;

      -- Handle account change: unwind from old account, apply to new
      IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
        UPDATE public.accounts
        SET current_balance_cents = current_balance_cents - v_old_delta
        WHERE id = OLD.account_id;

        UPDATE public.accounts
        SET current_balance_cents = current_balance_cents + v_new_delta
        WHERE id = NEW.account_id;
      ELSIF v_delta <> 0 THEN
        UPDATE public.accounts
        SET current_balance_cents = current_balance_cents + v_delta
        WHERE id = NEW.account_id;
      END IF;
    END;
    RETURN NEW;

  -- ── DELETE (hard — should not happen per project rules but guard anyway) ──
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      v_delta := CASE WHEN OLD.is_income THEN OLD.amount_cents ELSE -OLD.amount_cents END;
      UPDATE public.accounts
      SET current_balance_cents = current_balance_cents - v_delta
      WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_sync_account_balance ON public.transactions;

CREATE TRIGGER trg_transactions_sync_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_account_balance_on_transaction();

-- ============================================================
-- 3. Back-fill: recalculate current_balance_cents for all
--    existing accounts from their transactions history.
--    (run once; idempotent because we overwrite anyway)
-- ============================================================

UPDATE public.accounts a
SET
    current_balance_cents = a.initial_balance_cents + COALESCE(
        (
            SELECT SUM(
                    CASE
                        WHEN t.is_income THEN t.amount_cents
                        ELSE - t.amount_cents
                    END
                )
            FROM public.transactions t
            WHERE
                t.account_id = a.id
                AND t.deleted_at IS NULL
        ),
        0
    );