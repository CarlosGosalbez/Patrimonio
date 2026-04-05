-- supabase/migrations/20260405120500_create_recurring_commitments.sql
-- Description: Recurring commitments (subscriptions, rent, mortgage, etc.)
-- ROLLBACK: DROP TABLE IF EXISTS recurring_commitments CASCADE;

CREATE TABLE recurring_commitments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  -- Commitment details
  name                VARCHAR(200) NOT NULL,
  description         TEXT,
  commitment_type     commitment_type_enum NOT NULL DEFAULT 'other',
  
  -- Amount
  amount_cents        INTEGER NOT NULL,
  currency            VARCHAR(3) NOT NULL DEFAULT 'EUR',
  is_income           BOOLEAN NOT NULL DEFAULT false,
  
  -- Recurrence
  frequency           frequency_type NOT NULL,
  start_date          DATE NOT NULL,
  end_date            DATE,  -- NULL = indefinido
  next_due_date       DATE NOT NULL,
  
  -- Subscription-specific fields
  service_name        VARCHAR(200),  -- Exact text in bank statement
  cancelled_at        TIMESTAMPTZ,   -- When user cancelled subscription
  
  -- Mortgage-specific fields
  maturity_year       INTEGER,
  interest_rate       DECIMAL(5,3),  -- Percentage (e.g., 2.750 for 2.75%)
  is_variable_rate    BOOLEAN DEFAULT false,
  
  -- Alerting
  advance_notice_days INTEGER DEFAULT 7,
  tolerance_days      INTEGER DEFAULT 3,  -- For unpaid income detection
  
  -- Status
  is_active           BOOLEAN NOT NULL DEFAULT true,
  is_automated        BOOLEAN NOT NULL DEFAULT true,  -- Auto-generate transactions
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  
  CONSTRAINT chk_commitments_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT chk_commitments_amount CHECK (amount_cents > 0),
  CONSTRAINT chk_commitments_currency CHECK (char_length(currency) = 3),
  CONSTRAINT chk_commitments_deleted_order CHECK (deleted_at IS NULL OR deleted_at >= created_at),
  CONSTRAINT chk_commitments_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Indexes
CREATE INDEX idx_commitments_user ON recurring_commitments(user_id);
CREATE INDEX idx_commitments_account ON recurring_commitments(account_id);
CREATE INDEX idx_commitments_next_due ON recurring_commitments(next_due_date) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_commitments_active ON recurring_commitments(user_id) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE recurring_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_commitments" ON recurring_commitments
  FOR SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

CREATE POLICY "users_insert_commitments" ON recurring_commitments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_commitments" ON recurring_commitments
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON recurring_commitments
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
