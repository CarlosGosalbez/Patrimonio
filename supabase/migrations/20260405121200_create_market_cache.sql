-- supabase/migrations/20260405121200_create_market_cache.sql
-- Description: Cache for market prices (updated by Edge Function cron)
-- ROLLBACK: DROP TABLE IF EXISTS market_cache CASCADE;

CREATE TABLE market_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  ticker          VARCHAR(20) NOT NULL UNIQUE,
  name            VARCHAR(200),
  asset_type      investment_type NOT NULL,
  
  -- Current price
  price_cents     INTEGER NOT NULL,
  currency        VARCHAR(3) NOT NULL DEFAULT 'EUR',
  
  -- Daily change
  change_cents    INTEGER,
  change_percent  DECIMAL(7, 4),
  
  -- Volume
  volume          BIGINT,
  
  -- Metadata
  market          VARCHAR(50),
  data_source     VARCHAR(50),  -- 'yahoo', 'alphavantage', 'fmp', 'coingecko'
  
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_cache_ticker_not_empty CHECK (char_length(trim(ticker)) > 0),
  CONSTRAINT chk_cache_currency CHECK (char_length(currency) = 3)
);

-- Indexes
CREATE INDEX idx_cache_ticker ON market_cache(ticker);
CREATE INDEX idx_cache_updated ON market_cache(updated_at DESC);

-- RLS - Public read (no user_id)
ALTER TABLE market_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_select_market_cache" ON market_cache
  FOR SELECT USING (true);

-- No INSERT/UPDATE policies = only service_role can write
