-- supabase/migrations/20260411010000_account_cascade_soft_delete.sql
-- Description: Cascade soft-delete: when an account is soft-deleted,
--              propagate deleted_at to its transactions and investments.
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_cascade_soft_delete_account ON accounts;
--   DROP FUNCTION IF EXISTS cascade_soft_delete_account();

-- ============================================================
-- 1. FUNCTION: cascade_soft_delete_account()
-- ============================================================
CREATE OR REPLACE FUNCTION cascade_soft_delete_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when deleted_at transitions from NULL → non-NULL
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Soft-delete child transactions
    UPDATE transactions
    SET deleted_at = NEW.deleted_at
    WHERE account_id = NEW.id
      AND deleted_at IS NULL;

    -- Soft-delete child investments
    UPDATE investments
    SET deleted_at = NEW.deleted_at
    WHERE account_id = NEW.id
      AND deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. TRIGGER: fire AFTER UPDATE on accounts
-- ============================================================
DROP TRIGGER IF EXISTS trg_cascade_soft_delete_account ON accounts;

CREATE TRIGGER trg_cascade_soft_delete_account
  AFTER UPDATE OF deleted_at ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION cascade_soft_delete_account();