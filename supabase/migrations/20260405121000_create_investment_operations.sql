-- supabase/migrations/20260405121000_create_investment_operations.sql
-- Description: Investment transactions (buy, sell, dividends, etc.)
-- ROLLBACK: DROP TABLE IF EXISTS investment_operations CASCADE;

CREATE TABLE investment_operations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id     UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  
  -- Operation details
  operation_type    operation_type NOT NULL,
  operation_date    DATE NOT NULL,
  
  -- Quantity and price
  quantity          DECIMAL(18, 8) NOT NULL,
  price_cents       INTEGER NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'EUR',
  
  -- Costs
  fee_cents         INTEGER NOT NULL DEFAULT 0,
  total_cents       INTEGER NOT NULL,  -- price * quantity + fee
  
  -- Additional info
  notes             TEXT,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  
  CONSTRAINT chk_operations_quantity CHECK (quantity > 0),
  CONSTRAINT chk_operations_price CHECK (price_cents > 0),
  CONSTRAINT chk_operations_fee CHECK (fee_cents >= 0),
  CONSTRAINT chk_operations_currency CHECK (char_length(currency) = 3),
  CONSTRAINT chk_operations_deleted_order CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

-- Indexes
CREATE INDEX idx_operations_user ON investment_operations(user_id);
CREATE INDEX idx_operations_investment ON investment_operations(investment_id);
CREATE INDEX idx_operations_date ON investment_operations(operation_date DESC);
CREATE INDEX idx_operations_active ON investment_operations(user_id) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE investment_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_operations" ON investment_operations
  FOR SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

CREATE POLICY "users_insert_operations" ON investment_operations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_operations" ON investment_operations
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON investment_operations
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
