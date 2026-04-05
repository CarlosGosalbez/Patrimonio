-- supabase/migrations/20260405121500_create_rpc_functions.sql
-- Description: Stored procedures for complex calculations
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS get_net_worth(UUID);
--   DROP FUNCTION IF EXISTS project_cash_flow(UUID, INTEGER);
--   DROP FUNCTION IF EXISTS recalculate_avg_purchase_price(UUID);

-- ============================================================
-- get_net_worth: Calculate total net worth for a user
-- ============================================================
CREATE OR REPLACE FUNCTION get_net_worth(p_user_id UUID)
RETURNS TABLE(
  total_cents INTEGER,
  cash_cents INTEGER,
  investments_cents INTEGER,
  currency VARCHAR(3)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario autenticado es el propietario
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY
  SELECT
    COALESCE(SUM(a.current_balance_cents), 0)::INTEGER + 
      COALESCE(SUM(i.current_value_cents), 0)::INTEGER AS total_cents,
    COALESCE(SUM(a.current_balance_cents), 0)::INTEGER AS cash_cents,
    COALESCE(SUM(i.current_value_cents), 0)::INTEGER AS investments_cents,
    COALESCE(MAX(p.currency), 'EUR')::VARCHAR(3) AS currency
  FROM profiles p
  LEFT JOIN accounts a ON a.user_id = p.user_id AND a.deleted_at IS NULL
  LEFT JOIN investments i ON i.user_id = p.user_id AND i.deleted_at IS NULL AND i.is_active = true
  WHERE p.user_id = p_user_id
  GROUP BY p.user_id;
END;
$$ ;

-- ============================================================
-- project_cash_flow: Project future cash flow from commitments
-- ============================================================
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
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario autenticado es el propietario
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY
  WITH future_months AS (
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE),
      date_trunc('month', CURRENT_DATE) + (p_months || ' months')::INTERVAL,
      '1 month'::INTERVAL
    )::DATE AS month_start
  ),
  commitment_projections AS (
    SELECT
      date_trunc('month', fm.month_start)::DATE AS month_date,
      SUM(CASE WHEN c.is_income THEN c.amount_cents ELSE 0 END) AS income_cents,
      SUM(CASE WHEN NOT c.is_income THEN c.amount_cents ELSE 0 END) AS expense_cents
    FROM future_months fm
    CROSS JOIN recurring_commitments c
    WHERE c.user_id = p_user_id
      AND c.is_active = true
      AND c.deleted_at IS NULL
      AND c.start_date <= fm.month_start
      AND (c.end_date IS NULL OR c.end_date >= fm.month_start)
    GROUP BY month_date
  )
  SELECT
    cp.month_date,
    COALESCE(cp.income_cents, 0)::INTEGER AS projected_income_cents,
    COALESCE(cp.expense_cents, 0)::INTEGER AS projected_expense_cents,
    (COALESCE(cp.income_cents, 0) - COALESCE(cp.expense_cents, 0))::INTEGER AS net_cents
  FROM commitment_projections cp
  ORDER BY cp.month_date;
END;
$$;

-- ============================================================
-- recalculate_avg_purchase_price: Recalculate weighted average purchase price
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_avg_purchase_price(p_investment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_total_quantity DECIMAL(18,8);
  v_total_cost_cents BIGINT;
  v_avg_price_cents INTEGER;
BEGIN
  -- Get investment owner
  SELECT user_id INTO v_user_id
  FROM investments
  WHERE id = p_investment_id;
  
  -- Verificar que el usuario autenticado es el propietario
  IF auth.uid() != v_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Calculate totals from operations
  SELECT
    COALESCE(SUM(CASE 
      WHEN operation_type IN ('buy', 'transfer_in') THEN quantity
      WHEN operation_type = 'sell' THEN -quantity
      ELSE 0
    END), 0),
    COALESCE(SUM(CASE 
      WHEN operation_type IN ('buy', 'transfer_in') THEN total_cents
      WHEN operation_type = 'sell' THEN -total_cents
      ELSE 0
    END), 0)
  INTO v_total_quantity, v_total_cost_cents
  FROM investment_operations
  WHERE investment_id = p_investment_id
    AND deleted_at IS NULL;
  
  -- Calculate weighted average price
  IF v_total_quantity > 0 THEN
    v_avg_price_cents := (v_total_cost_cents / v_total_quantity)::INTEGER;
  ELSE
    v_avg_price_cents := 0;
  END IF;
  
  -- Update investment
  UPDATE investments
  SET 
    quantity = v_total_quantity,
    total_invested_cents = v_total_cost_cents::INTEGER,
    avg_purchase_price_cents = v_avg_price_cents,
    updated_at = NOW()
  WHERE id = p_investment_id;
END;
$$;
