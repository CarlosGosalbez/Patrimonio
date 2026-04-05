-- supabase/migrations/20260405121100_create_investment_snapshots.sql
-- Description: Historical snapshots of portfolio value (for net worth evolution)
-- ROLLBACK: DROP TABLE IF EXISTS investment_snapshots CASCADE;

CREATE TABLE investment_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  snapshot_date       DATE NOT NULL,
  
  -- Portfolio totals
  total_invested_cents INTEGER NOT NULL DEFAULT 0,
  total_value_cents   INTEGER NOT NULL DEFAULT 0,
  unrealized_pl_cents INTEGER NOT NULL DEFAULT 0,
  currency            VARCHAR(3) NOT NULL DEFAULT 'EUR',
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_snapshots_currency CHECK (char_length(currency) = 3),
  UNIQUE(user_id, snapshot_date)
);

-- Indexes
CREATE INDEX idx_snapshots_user_date ON investment_snapshots(user_id, snapshot_date DESC);

-- RLS
ALTER TABLE investment_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_snapshots" ON investment_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_snapshots" ON investment_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
