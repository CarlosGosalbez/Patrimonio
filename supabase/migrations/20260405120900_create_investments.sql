-- supabase/migrations/20260405120900_create_investments.sql
-- Description: Investment positions (stocks, ETFs, crypto, etc.)
-- ROLLBACK: DROP TABLE IF EXISTS investments CASCADE;

CREATE TABLE investments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Investment identification
  ticker                  VARCHAR(20) NOT NULL,  -- Stock ticker, crypto symbol, ISIN, etc.
  name                    VARCHAR(200) NOT NULL,
  investment_type         investment_type NOT NULL,
  
  -- Market data
  currency                VARCHAR(3) NOT NULL DEFAULT 'EUR',
  market                  VARCHAR(50),  -- 'NYSE', 'NASDAQ', 'BME', 'crypto', etc.
  
  -- Position summary (calculated from operations)
  quantity                DECIMAL(18, 8) NOT NULL DEFAULT 0,
  avg_purchase_price_cents INTEGER NOT NULL DEFAULT 0,
  total_invested_cents    INTEGER NOT NULL DEFAULT 0,
  
  -- Current valuation (from market_cache)
  current_price_cents     INTEGER,
  current_value_cents     INTEGER,
  last_price_update       TIMESTAMPTZ,
  
  -- Display
  notes                   TEXT,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ,
  
  CONSTRAINT chk_investments_ticker_not_empty CHECK (char_length(trim(ticker)) > 0),
  CONSTRAINT chk_investments_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT chk_investments_currency CHECK (char_length(currency) = 3),
  CONSTRAINT chk_investments_quantity CHECK (quantity >= 0),
  CONSTRAINT chk_investments_deleted_order CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

-- Indexes
CREATE INDEX idx_investments_user ON investments(user_id);
CREATE INDEX idx_investments_ticker ON investments(ticker);
CREATE INDEX idx_investments_active ON investments(user_id) WHERE is_active = true AND deleted_at IS NULL;

-- RLS
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_investments" ON investments
  FOR SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

CREATE POLICY "users_insert_investments" ON investments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_investments" ON investments
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON investments
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
