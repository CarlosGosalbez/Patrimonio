-- supabase/migrations/20260406140000_realtime_and_market_sync.sql
-- Description: Enable Realtime on market_cache + notifications; add sync_investment_prices RPC
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.sync_investment_prices();
--   ALTER TABLE public.notifications REPLICA IDENTITY DEFAULT;
--   ALTER TABLE public.market_cache REPLICA IDENTITY DEFAULT;
--   ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
--   ALTER PUBLICATION supabase_realtime DROP TABLE public.market_cache;

-- ─── 1. Realtime: market_cache ────────────────────────────────────────────────
-- FULL so UPDATE events include OLD values (needed for price change calculation client-side)
ALTER TABLE public.market_cache REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.market_cache;

-- ─── 2. Realtime: notifications ──────────────────────────────────────────────
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ─── 3. sync_investment_prices() ─────────────────────────────────────────────
-- Called by market-updater Edge Function after every price refresh.
-- Updates investments.current_price_cents and current_value_cents from market_cache.
-- SECURITY DEFINER + SET search_path ensures no privilege escalation.
CREATE OR REPLACE FUNCTION public.sync_investment_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.investments i
  SET
    current_price_cents  = mc.price_cents,
    current_value_cents  = ROUND(i.quantity::NUMERIC * mc.price_cents),
    last_price_update    = mc.updated_at,
    updated_at           = NOW()
  FROM public.market_cache mc
  WHERE i.ticker       = mc.ticker
    AND i.is_active    = true
    AND i.deleted_at   IS NULL;
END;
$$;

GRANT
EXECUTE ON FUNCTION public.sync_investment_prices () TO service_role;
-- Note: this function is only called by the service_role (Edge Function).
-- Regular authenticated users do not need EXECUTE.