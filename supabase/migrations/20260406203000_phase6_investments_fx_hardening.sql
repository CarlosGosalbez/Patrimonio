-- =================================================================
-- supabase/migrations/20260406203000_phase6_investments_fx_hardening.sql
-- Description: Phase 6 hardening for investments with FX cache, dividend metadata,
--              price alerts, account linkage and normalized portfolio snapshots.
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.refresh_investment_snapshots(DATE);
--   DROP FUNCTION IF EXISTS public.convert_currency_amount(BIGINT, VARCHAR, VARCHAR);
--   DROP FUNCTION IF EXISTS public.validate_investment_account();
--   DROP FUNCTION IF EXISTS public.validate_investment_operation_owner();
--   DROP FUNCTION IF EXISTS public.soft_delete_investment_operations();
--   DROP TRIGGER IF EXISTS trg_investments_validate_account ON public.investments;
--   DROP TRIGGER IF EXISTS trg_investment_operations_validate_owner ON public.investment_operations;
--   DROP TRIGGER IF EXISTS trg_investments_no_resurrect ON public.investments;
--   DROP TRIGGER IF EXISTS trg_investments_soft_delete_operations ON public.investments;
--   DROP TRIGGER IF EXISTS trg_investment_operations_no_resurrect ON public.investment_operations;
--   DROP INDEX IF EXISTS public.idx_investments_account_active;
--   DROP INDEX IF EXISTS public.idx_investments_dividend_calendar;
--   DROP INDEX IF EXISTS public.idx_investments_price_alerts;
--   ALTER TABLE public.investment_operations DROP CONSTRAINT IF EXISTS chk_operations_withholding_non_negative;
--   ALTER TABLE public.investment_operations DROP CONSTRAINT IF EXISTS chk_operations_withholding_by_type;
--   ALTER TABLE public.investment_operations DROP CONSTRAINT IF EXISTS chk_operations_price_valid;
--   ALTER TABLE public.investment_operations DROP CONSTRAINT IF EXISTS chk_operations_total_valid;
--   ALTER TABLE public.investment_operations DROP COLUMN IF EXISTS withholding_cents;
--   ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS chk_investments_alert_threshold_percent;
--   ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS chk_investments_annual_dividend_non_negative;
--   ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS chk_investments_dividend_frequency;
--   ALTER TABLE public.investments DROP COLUMN IF EXISTS daily_price_alert_threshold_percent;
--   ALTER TABLE public.investments DROP COLUMN IF EXISTS dividend_frequency;
--   ALTER TABLE public.investments DROP COLUMN IF EXISTS next_dividend_date;
--   ALTER TABLE public.investments DROP COLUMN IF EXISTS annual_dividend_per_share_cents;
--   ALTER TABLE public.investments DROP COLUMN IF EXISTS sector;
--   ALTER TABLE public.investments DROP COLUMN IF EXISTS account_id;
--   DROP TABLE IF EXISTS public.exchange_rates_cache CASCADE;
-- =================================================================

-- ─── 1. FX cache table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exchange_rates_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency VARCHAR(3) NOT NULL,
  quote_currency VARCHAR(3) NOT NULL,
  rate_value NUMERIC(18, 8) NOT NULL,
  data_source VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_exchange_rates_currency_pair CHECK (
    char_length(base_currency) = 3
    AND char_length(quote_currency) = 3
    AND upper(base_currency) <> upper(quote_currency)
  ),
  CONSTRAINT chk_exchange_rates_positive CHECK (rate_value > 0),
  CONSTRAINT exchange_rates_cache_pair_unique UNIQUE (base_currency, quote_currency)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair
  ON public.exchange_rates_cache(base_currency, quote_currency);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_updated
  ON public.exchange_rates_cache(updated_at DESC);

ALTER TABLE public.exchange_rates_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates_cache FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_exchange_rates_cache" ON public.exchange_rates_cache;

CREATE POLICY "public_select_exchange_rates_cache" ON public.exchange_rates_cache
  FOR SELECT USING (true);

DROP TRIGGER IF EXISTS trg_exchange_rates_cache_updated_at ON public.exchange_rates_cache;

CREATE TRIGGER trg_exchange_rates_cache_updated_at
  BEFORE UPDATE ON public.exchange_rates_cache
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ─── 2. Investments metadata ──────────────────────────────────────
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS sector VARCHAR(120),
  ADD COLUMN IF NOT EXISTS annual_dividend_per_share_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_dividend_date DATE,
  ADD COLUMN IF NOT EXISTS dividend_frequency public.frequency_type NOT NULL DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS daily_price_alert_threshold_percent NUMERIC(7, 4);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_investments_annual_dividend_non_negative'
  ) THEN
    ALTER TABLE public.investments
      ADD CONSTRAINT chk_investments_annual_dividend_non_negative
      CHECK (annual_dividend_per_share_cents >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_investments_alert_threshold_percent'
  ) THEN
    ALTER TABLE public.investments
      ADD CONSTRAINT chk_investments_alert_threshold_percent
      CHECK (
        daily_price_alert_threshold_percent IS NULL
        OR (
          daily_price_alert_threshold_percent >= 0.1
          AND daily_price_alert_threshold_percent <= 50
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_investments_dividend_frequency'
  ) THEN
    ALTER TABLE public.investments
      ADD CONSTRAINT chk_investments_dividend_frequency
      CHECK (dividend_frequency IN ('monthly', 'quarterly', 'semiannual', 'annual'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_investments_account_active
  ON public.investments(account_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_investments_user_account_ticker_active
  ON public.investments(
    user_id,
    COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::UUID),
    ticker
  )
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_investments_dividend_calendar
  ON public.investments(user_id, next_dividend_date)
  WHERE deleted_at IS NULL
    AND is_active = true
    AND annual_dividend_per_share_cents > 0
    AND next_dividend_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_investments_price_alerts
  ON public.investments(user_id, daily_price_alert_threshold_percent)
  WHERE deleted_at IS NULL
    AND is_active = true
    AND daily_price_alert_threshold_percent IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_investment_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_user_id UUID;
  v_deleted_at TIMESTAMPTZ;
BEGIN
  IF NEW.account_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.user_id, a.deleted_at
  INTO v_account_user_id, v_deleted_at
  FROM public.accounts a
  WHERE a.id = NEW.account_id;

  IF v_account_user_id IS NULL OR v_deleted_at IS NOT NULL OR v_account_user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'Invalid investment account.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_investments_validate_account ON public.investments;

CREATE TRIGGER trg_investments_validate_account
  BEFORE INSERT OR UPDATE OF account_id, user_id
  ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.validate_investment_account();

DROP TRIGGER IF EXISTS trg_investments_no_resurrect ON public.investments;

CREATE TRIGGER trg_investments_no_resurrect
  BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_resurrect();

DROP TRIGGER IF EXISTS trg_investment_operations_no_resurrect ON public.investment_operations;

CREATE TRIGGER trg_investment_operations_no_resurrect
  BEFORE UPDATE ON public.investment_operations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_resurrect();

-- ─── 3. Operation constraints for splits ─────────────────────────
ALTER TABLE public.investment_operations
  ADD COLUMN IF NOT EXISTS realized_pl_cents INTEGER,
  ADD COLUMN IF NOT EXISTS withholding_cents INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_investment_operations_user_date_active
  ON public.investment_operations(user_id, operation_date DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.investment_operations
  DROP CONSTRAINT IF EXISTS chk_operations_price;

ALTER TABLE public.investment_operations
  DROP CONSTRAINT IF EXISTS chk_operations_price_valid;

ALTER TABLE public.investment_operations
  ADD CONSTRAINT chk_operations_price_valid
  CHECK (
    (operation_type = 'split' AND price_cents = 0)
    OR (operation_type <> 'split' AND price_cents > 0)
  );

ALTER TABLE public.investment_operations
  DROP CONSTRAINT IF EXISTS chk_operations_total_valid;

ALTER TABLE public.investment_operations
  ADD CONSTRAINT chk_operations_total_valid
  CHECK (
    (operation_type = 'split' AND total_cents = 0 AND fee_cents = 0)
    OR (operation_type <> 'split' AND total_cents > 0)
  );

ALTER TABLE public.investment_operations
  DROP CONSTRAINT IF EXISTS chk_operations_withholding_non_negative;

ALTER TABLE public.investment_operations
  ADD CONSTRAINT chk_operations_withholding_non_negative
  CHECK (withholding_cents >= 0);

ALTER TABLE public.investment_operations
  DROP CONSTRAINT IF EXISTS chk_operations_withholding_by_type;

ALTER TABLE public.investment_operations
  ADD CONSTRAINT chk_operations_withholding_by_type
  CHECK (
    (operation_type = 'dividend' AND withholding_cents <= total_cents)
    OR (operation_type <> 'dividend' AND withholding_cents = 0)
  );

CREATE OR REPLACE FUNCTION public.validate_investment_operation_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_investment_user_id UUID;
  v_investment_currency VARCHAR(3);
  v_deleted_at TIMESTAMPTZ;
BEGIN
  SELECT i.user_id, i.currency, i.deleted_at
  INTO v_investment_user_id, v_investment_currency, v_deleted_at
  FROM public.investments i
  WHERE i.id = NEW.investment_id;

  IF v_investment_user_id IS NULL OR v_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid investment.';
  END IF;

  IF v_investment_user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'Investment owner mismatch.';
  END IF;

  IF upper(NEW.currency) <> upper(v_investment_currency) THEN
    RAISE EXCEPTION 'Operation currency must match investment currency.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_investment_operations_validate_owner ON public.investment_operations;

CREATE TRIGGER trg_investment_operations_validate_owner
  BEFORE INSERT OR UPDATE OF investment_id, user_id, currency
  ON public.investment_operations
  FOR EACH ROW EXECUTE FUNCTION public.validate_investment_operation_owner();

CREATE OR REPLACE FUNCTION public.soft_delete_investment_operations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE public.investment_operations
    SET
      deleted_at = NEW.deleted_at,
      updated_at = NOW()
    WHERE investment_id = NEW.id
      AND deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_investments_soft_delete_operations ON public.investments;

CREATE TRIGGER trg_investments_soft_delete_operations
  AFTER UPDATE OF deleted_at ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.soft_delete_investment_operations();

-- ─── 4. Currency conversion helper ───────────────────────────────
CREATE OR REPLACE FUNCTION public.convert_currency_amount(
  p_amount_cents BIGINT,
  p_from_currency VARCHAR,
  p_to_currency VARCHAR
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_direct_rate NUMERIC(18, 8);
  v_from_currency VARCHAR(3);
  v_to_currency VARCHAR(3);
BEGIN
  IF p_amount_cents IS NULL THEN
    RETURN NULL;
  END IF;

  v_from_currency := upper(coalesce(p_from_currency, p_to_currency, 'EUR'));
  v_to_currency := upper(coalesce(p_to_currency, p_from_currency, 'EUR'));

  IF v_from_currency = v_to_currency THEN
    RETURN p_amount_cents;
  END IF;

  SELECT er.rate_value
  INTO v_direct_rate
  FROM public.exchange_rates_cache er
  WHERE er.base_currency = v_from_currency
    AND er.quote_currency = v_to_currency
  ORDER BY er.updated_at DESC
  LIMIT 1;

  IF v_direct_rate IS NULL THEN
    SELECT (1 / er.rate_value)
    INTO v_direct_rate
    FROM public.exchange_rates_cache er
    WHERE er.base_currency = v_to_currency
      AND er.quote_currency = v_from_currency
    ORDER BY er.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_direct_rate IS NULL THEN
    RETURN p_amount_cents;
  END IF;

  RETURN ROUND(p_amount_cents::NUMERIC * v_direct_rate)::BIGINT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_currency_amount(BIGINT, VARCHAR, VARCHAR)
  TO authenticated, anon, service_role;

-- ─── 5. Net worth normalized to profile base currency ────────────
CREATE OR REPLACE FUNCTION public.get_net_worth(p_user_id UUID)
RETURNS TABLE(
  total_cents INTEGER,
  cash_cents INTEGER,
  investments_cents INTEGER,
  currency VARCHAR(3)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_currency VARCHAR(3);
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT coalesce(p.currency, 'EUR')
  INTO v_currency
  FROM public.profiles p
  WHERE p.user_id = p_user_id
    AND p.deleted_at IS NULL
  LIMIT 1;

  v_currency := coalesce(v_currency, 'EUR');

  RETURN QUERY
  WITH account_balances AS (
    SELECT
      COALESCE(
        SUM(public.convert_currency_amount(a.current_balance_cents::BIGINT, a.currency, v_currency)),
        0
      )::INTEGER AS cash_cents
    FROM public.accounts a
    WHERE a.user_id = p_user_id
      AND a.deleted_at IS NULL
      AND a.is_hidden = false
  ),
  investment_balances AS (
    SELECT
      COALESCE(
        SUM(
          public.convert_currency_amount(
            COALESCE(i.current_value_cents, i.total_invested_cents)::BIGINT,
            i.currency,
            v_currency
          )
        ),
        0
      )::INTEGER AS investments_cents
    FROM public.investments i
    WHERE i.user_id = p_user_id
      AND i.deleted_at IS NULL
      AND i.is_active = true
  )
  SELECT
    (ab.cash_cents + ib.investments_cents)::INTEGER AS total_cents,
    ab.cash_cents,
    ib.investments_cents,
    v_currency
  FROM account_balances ab
  CROSS JOIN investment_balances ib;
END;
$$;

-- ─── 6. Recalculate average price, realized P&L and live position ──────────
CREATE OR REPLACE FUNCTION public.recalculate_avg_purchase_price(p_investment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_current_price_cents INTEGER;
  v_total_quantity NUMERIC(18, 8) := 0;
  v_total_cost_cents NUMERIC(18, 8) := 0;
  v_avg_price_cents INTEGER := 0;
  v_avg_cost_per_unit NUMERIC(18, 8) := 0;
  v_cost_basis_delta NUMERIC(18, 8) := 0;
  v_realized_pl_cents INTEGER;
  v_operation RECORD;
BEGIN
  SELECT i.user_id, i.current_price_cents
  INTO v_user_id, v_current_price_cents
  FROM public.investments i
  WHERE i.id = p_investment_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Investment not found.';
  END IF;

  IF auth.role() <> 'service_role' AND auth.uid() <> v_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR v_operation IN
    SELECT
      io.id,
      io.operation_type,
      io.quantity,
      io.total_cents
    FROM public.investment_operations io
    WHERE io.investment_id = p_investment_id
      AND io.deleted_at IS NULL
    ORDER BY io.operation_date ASC, io.created_at ASC, io.id ASC
  LOOP
    v_realized_pl_cents := NULL;

    CASE v_operation.operation_type
      WHEN 'buy', 'transfer_in' THEN
        v_total_quantity := v_total_quantity + v_operation.quantity;
        v_total_cost_cents := v_total_cost_cents + v_operation.total_cents;
      WHEN 'sell', 'transfer_out' THEN
        IF v_total_quantity <= 0 OR v_operation.quantity > v_total_quantity + 0.00000001 THEN
          RAISE EXCEPTION 'Operation % exceeds available quantity.', v_operation.id;
        END IF;

        v_avg_cost_per_unit := v_total_cost_cents / v_total_quantity;
        v_cost_basis_delta := ROUND(v_avg_cost_per_unit * v_operation.quantity);
        v_realized_pl_cents := (v_operation.total_cents - v_cost_basis_delta)::INTEGER;
        v_total_quantity := GREATEST(v_total_quantity - v_operation.quantity, 0);
        v_total_cost_cents := GREATEST(v_total_cost_cents - v_cost_basis_delta, 0);
      WHEN 'split' THEN
        IF v_operation.quantity > 0 AND v_total_quantity > 0 THEN
          v_total_quantity := ROUND(v_total_quantity * v_operation.quantity, 8);
        END IF;
      ELSE
        NULL;
    END CASE;

    IF v_total_quantity > 0 THEN
      v_avg_price_cents := ROUND(v_total_cost_cents / v_total_quantity)::INTEGER;
    ELSE
      v_total_quantity := 0;
      v_total_cost_cents := 0;
      v_avg_price_cents := 0;
    END IF;

    UPDATE public.investment_operations
    SET
      realized_pl_cents = v_realized_pl_cents,
      updated_at = NOW()
    WHERE id = v_operation.id
      AND realized_pl_cents IS DISTINCT FROM v_realized_pl_cents;
  END LOOP;

  UPDATE public.investments
  SET
    quantity = ROUND(v_total_quantity, 8),
    total_invested_cents = ROUND(v_total_cost_cents)::INTEGER,
    avg_purchase_price_cents = v_avg_price_cents,
    current_value_cents = CASE
      WHEN v_current_price_cents IS NULL THEN current_value_cents
      ELSE ROUND(v_total_quantity * v_current_price_cents)::INTEGER
    END,
    is_active = v_total_quantity > 0,
    updated_at = NOW()
  WHERE id = p_investment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_avg_purchase_price(UUID)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_investment_operation_refresh()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.recalculate_avg_purchase_price(COALESCE(NEW.investment_id, OLD.investment_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_investment_operations_refresh_position ON public.investment_operations;

CREATE TRIGGER trg_investment_operations_refresh_position
  AFTER INSERT OR DELETE OR UPDATE OF
    investment_id,
    operation_type,
    operation_date,
    quantity,
    price_cents,
    fee_cents,
    total_cents,
    currency,
    withholding_cents,
    deleted_at
  ON public.investment_operations
  FOR EACH ROW EXECUTE FUNCTION public.handle_investment_operation_refresh();

-- ─── 7. Snapshot refresh normalized to profile currency ──────────
CREATE OR REPLACE FUNCTION public.refresh_investment_snapshots(
  p_snapshot_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.investment_snapshots (
    user_id,
    snapshot_date,
    total_invested_cents,
    total_value_cents,
    unrealized_pl_cents,
    currency
  )
  SELECT
    i.user_id,
    p_snapshot_date,
    COALESCE(
      SUM(public.convert_currency_amount(i.total_invested_cents::BIGINT, i.currency, coalesce(p.currency, 'EUR'))),
      0
    )::INTEGER AS total_invested_cents,
    COALESCE(
      SUM(
        public.convert_currency_amount(
          COALESCE(i.current_value_cents, i.total_invested_cents)::BIGINT,
          i.currency,
          coalesce(p.currency, 'EUR')
        )
      ),
      0
    )::INTEGER AS total_value_cents,
    (
      COALESCE(
        SUM(
          public.convert_currency_amount(
            COALESCE(i.current_value_cents, i.total_invested_cents)::BIGINT,
            i.currency,
            coalesce(p.currency, 'EUR')
          )
        ),
        0
      ) -
      COALESCE(
        SUM(public.convert_currency_amount(i.total_invested_cents::BIGINT, i.currency, coalesce(p.currency, 'EUR'))),
        0
      )
    )::INTEGER AS unrealized_pl_cents,
    coalesce(p.currency, 'EUR') AS currency
  FROM public.investments i
  LEFT JOIN public.profiles p
    ON p.user_id = i.user_id
   AND p.deleted_at IS NULL
  WHERE i.is_active = true
    AND i.deleted_at IS NULL
  GROUP BY i.user_id, coalesce(p.currency, 'EUR')
  ON CONFLICT (user_id, snapshot_date)
  DO UPDATE SET
    total_invested_cents = EXCLUDED.total_invested_cents,
    total_value_cents = EXCLUDED.total_value_cents,
    unrealized_pl_cents = EXCLUDED.unrealized_pl_cents,
    currency = EXCLUDED.currency;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_investment_snapshots(DATE) TO service_role;
