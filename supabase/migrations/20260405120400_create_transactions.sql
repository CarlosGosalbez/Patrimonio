-- supabase/migrations/20260405120400_create_transactions.sql
-- Description: Financial transactions (income/expense)
-- ROLLBACK: DROP TABLE IF EXISTS transactions CASCADE;

CREATE TABLE transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id        UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  -- Transaction data
  amount_cents      INTEGER NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'EUR',
  description       VARCHAR(500) NOT NULL,
  notes             TEXT,
  
  -- Transaction type: positive = income, negative = expense
  is_income         BOOLEAN NOT NULL DEFAULT false,
  
  -- Dates
  transaction_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  value_date        DATE,  -- Fecha valor (opcional)
  
  -- Metadata
  tags              TEXT[],
  receipt_url       TEXT,  -- URL firmada a Supabase Storage
  
  -- Import metadata
  import_source     VARCHAR(100),  -- 'santander', 'bbva', 'manual', etc.
  import_batch_id   UUID,          -- Agrupar transacciones del mismo  import
  
  -- Transfer linking (for transfers between own accounts)
  transfer_id       UUID REFERENCES transactions(id) ON DELETE SET NULL,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  
  CONSTRAINT chk_transactions_amount CHECK (amount_cents != 0),
  CONSTRAINT chk_transactions_currency CHECK (char_length(currency) = 3),
  CONSTRAINT chk_transactions_description CHECK (char_length(trim(description)) > 0),
  CONSTRAINT chk_transactions_deleted_order CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

-- Indexes
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_import ON transactions(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX idx_transactions_active ON transactions(user_id) WHERE deleted_at IS NULL;

-- Full text search index on description and notes
CREATE INDEX idx_transactions_search ON transactions 
  USING gin(to_tsvector('spanish', coalesce(description, '') || ' ' || coalesce(notes, '')));

-- RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_transactions" ON transactions
  FOR SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

CREATE POLICY "users_insert_transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_transactions" ON transactions
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
