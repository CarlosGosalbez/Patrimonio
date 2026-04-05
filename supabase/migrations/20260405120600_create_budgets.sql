-- supabase/migrations/20260405120600_create_budgets.sql
-- Description: Category budgets (monthly/annual limits)
-- ROLLBACK: DROP TABLE IF EXISTS budgets CASCADE;

CREATE TABLE budgets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id       UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  
  -- Budget configuration
  period            budget_period NOT NULL DEFAULT 'monthly',
  limit_cents       INTEGER NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'EUR',
  
  -- Alert threshold (percentage, e.g., 80 for 80%)
  alert_threshold   INTEGER NOT NULL DEFAULT 80,
  
  -- Active period
  start_date        DATE NOT NULL,
  end_date          DATE,  -- NULL = ongoing
  
  is_active         BOOLEAN NOT NULL DEFAULT true,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  
  CONSTRAINT chk_budgets_limit CHECK (limit_cents > 0),
  CONSTRAINT chk_budgets_currency CHECK (char_length(currency) = 3),
  CONSTRAINT chk_budgets_threshold CHECK (alert_threshold BETWEEN 1 AND 100),
  CONSTRAINT chk_budgets_deleted_order CHECK (deleted_at IS NULL OR deleted_at >= created_at),
  CONSTRAINT chk_budgets_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Indexes
CREATE INDEX idx_budgets_user ON budgets(user_id);
CREATE INDEX idx_budgets_category ON budgets(category_id);
CREATE INDEX idx_budgets_active ON budgets(user_id) WHERE is_active = true AND deleted_at IS NULL;

-- RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_budgets" ON budgets
  FOR SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

CREATE POLICY "users_insert_budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_budgets" ON budgets
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
