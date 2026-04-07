-- supabase/migrations/20260408030000_gdpr_data_export.sql
-- Description: GDPR-compliant data export function (RLS-aware, SECURITY DEFINER)
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS export_user_data(UUID);

-- ============================================================
-- RPC: export_user_data (GDPR Article 20 — Right to data portability)
-- ============================================================
CREATE OR REPLACE FUNCTION export_user_data(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with DB owner privileges to bypass RLS
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Security check: caller must own this user_id (verified via JWT)
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot export data for other users';
  END IF;

  -- Aggregate all user data into a single JSON object
  SELECT jsonb_build_object(
    'user_id', target_user_id,
    'exported_at', NOW() AT TIME ZONE 'UTC',
    'export_version', '1.0',
    
    -- Profile data
    'profile', (
      SELECT row_to_json(p.*)
      FROM profiles p
      WHERE p.user_id = target_user_id
    ),
    
    -- User preferences
    'preferences', (
      SELECT row_to_json(up.*)
      FROM user_preferences up
      WHERE up.user_id = target_user_id
    ),
    
    -- Financial accounts
    'accounts', (
      SELECT COALESCE(jsonb_agg(row_to_json(a.*)), '[]'::jsonb)
      FROM accounts a
      WHERE a.user_id = target_user_id AND a.deleted_at IS NULL
    ),
    
    -- Transactions
    'transactions', (
      SELECT COALESCE(jsonb_agg(row_to_json(t.*)), '[]'::jsonb)
      FROM transactions t
      WHERE t.user_id = target_user_id AND t.deleted_at IS NULL
    ),
    
    -- Categories
    'categories', (
      SELECT COALESCE(jsonb_agg(row_to_json(c.*)), '[]'::jsonb)
      FROM categories c
      WHERE c.user_id = target_user_id AND c.deleted_at IS NULL
    ),
    
    -- Budgets
    'budgets', (
      SELECT COALESCE(jsonb_agg(row_to_json(b.*)), '[]'::jsonb)
      FROM budgets b
      WHERE b.user_id = target_user_id AND b.deleted_at IS NULL
    ),
    
    -- Investments
    'investments', (
      SELECT COALESCE(jsonb_agg(row_to_json(i.*)), '[]'::jsonb)
      FROM investments i
      WHERE i.user_id = target_user_id AND i.deleted_at IS NULL
    ),
    
    -- Investment operations
    'investment_operations', (
      SELECT COALESCE(jsonb_agg(row_to_json(io.*)), '[]'::jsonb)
      FROM investment_operations io
      WHERE io.user_id = target_user_id AND io.deleted_at IS NULL
    ),
    
    -- Recurring commitments
    'commitments', (
      SELECT COALESCE(jsonb_agg(row_to_json(rc.*)), '[]'::jsonb)
      FROM recurring_commitments rc
      WHERE rc.user_id = target_user_id AND rc.deleted_at IS NULL
    ),
    
    -- Custom alerts
    'custom_alerts', (
      SELECT COALESCE(jsonb_agg(row_to_json(ca.*)), '[]'::jsonb)
      FROM custom_alerts ca
      WHERE ca.user_id = target_user_id AND ca.deleted_at IS NULL
    ),
    
    -- Notifications (last 90 days only — GDPR data minimization)
    'notifications', (
      SELECT COALESCE(jsonb_agg(row_to_json(n.*)), '[]'::jsonb)
      FROM notifications n
      WHERE n.user_id = target_user_id
        AND n.created_at >= NOW() - INTERVAL '90 days'
    ),
    
    -- Auto-categorization rules
    'categorization_rules', (
      SELECT COALESCE(jsonb_agg(row_to_json(acr.*)), '[]'::jsonb)
      FROM auto_categorization_rules acr
      WHERE acr.user_id = target_user_id AND acr.deleted_at IS NULL
    ),
    
    -- Transaction correlation rules
    'correlation_rules', (
      SELECT COALESCE(jsonb_agg(row_to_json(tcr.*)), '[]'::jsonb)
      FROM transaction_correlation_rules tcr
      WHERE tcr.user_id = target_user_id AND tcr.deleted_at IS NULL
    ),
    
    -- Summary statistics
    'summary', jsonb_build_object(
      'total_accounts', (SELECT COUNT(*) FROM accounts WHERE user_id = target_user_id AND deleted_at IS NULL),
      'total_transactions', (SELECT COUNT(*) FROM transactions WHERE user_id = target_user_id AND deleted_at IS NULL),
      'total_investments', (SELECT COUNT(*) FROM investments WHERE user_id = target_user_id AND deleted_at IS NULL),
      'total_commitments', (SELECT COUNT(*) FROM recurring_commitments WHERE user_id = target_user_id AND deleted_at IS NULL),
      'account_created_at', (SELECT created_at FROM profiles WHERE user_id = target_user_id)
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION export_user_data (UUID) TO authenticated;

-- Comment
COMMENT ON FUNCTION export_user_data (UUID) IS 'GDPR Article 20: Export all user data as JSON (data portability right)';