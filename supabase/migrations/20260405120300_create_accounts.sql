-- supabase/migrations/20260405120300_create_accounts.sql
-- Description: Financial accounts (bank accounts, cash, credit cards)
-- ROLLBACK: DROP TABLE IF EXISTS accounts CASCADE;

CREATE TABLE accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name           VARCHAR(200) NOT NULL,
  account_type   VARCHAR(50) NOT NULL,  -- 'checking', 'savings', 'cash', 'credit_card', 'investment' 
  currency       VARCHAR(3) NOT NULL DEFAULT 'EUR',
  
  initial_balance_cents INTEGER NOT NULL DEFAULT 0,  -- Balance inicial en centavos
  current_balance_cents INTEGER NOT NULL DEFAULT 0,  -- Balance actual calculado
  
  -- Bank info (optional)
  bank_name      VARCHAR(100),
  iban           VARCHAR(34),           -- Partial IBAN for display (last 4 digits)
  
  -- Display
  color          VARCHAR(7),            -- Hex color
  icon           VARCHAR(50),
  is_default     BOOLEAN NOT NULL DEFAULT false,
  is_hidden      BOOLEAN NOT NULL DEFAULT false,
  
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  
  CONSTRAINT chk_accounts_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT chk_accounts_currency CHECK (char_length(currency) = 3),
  CONSTRAINT chk_accounts_deleted_order CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

-- Indexes
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_active ON accounts(user_id) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_accounts" ON accounts
  FOR SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

CREATE POLICY "users_insert_accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_accounts" ON accounts
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
