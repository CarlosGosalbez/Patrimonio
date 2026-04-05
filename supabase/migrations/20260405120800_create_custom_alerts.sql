-- supabase/migrations/20260405120800_create_custom_alerts.sql
-- Description: User-defined custom alerts (IBI, IRPF, insurance, etc.)
-- ROLLBACK: DROP TABLE IF EXISTS custom_alerts CASCADE;

CREATE TABLE custom_alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id           UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  -- Alert details
  name                  VARCHAR(200) NOT NULL,
  description           TEXT,
  
  -- Financial info
  expected_amount_cents INTEGER,
  currency              VARCHAR(3) NOT NULL DEFAULT 'EUR',
  
  -- Recurrence
  recurrence            alert_recurrence_type NOT NULL,
  due_date              DATE NOT NULL,
  advance_notice_days   INTEGER NOT NULL DEFAULT 30,
  
  -- Snooze/dismiss
  dismissed_until       DATE,
  
  -- Auto-deactivate when payment detected in category
  auto_deactivate       BOOLEAN NOT NULL DEFAULT true,
  
  is_active             BOOLEAN NOT NULL DEFAULT true,
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  
  CONSTRAINT chk_alerts_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT chk_alerts_currency CHECK (char_length(currency) = 3),
  CONSTRAINT chk_alerts_advance CHECK (advance_notice_days >= 0),
  CONSTRAINT chk_alerts_deleted_order CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

-- Indexes
CREATE INDEX idx_alerts_user ON custom_alerts(user_id);
CREATE INDEX idx_alerts_due ON custom_alerts(due_date) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_alerts_active ON custom_alerts(user_id) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE custom_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_alerts" ON custom_alerts
  FOR SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

CREATE POLICY "users_insert_alerts" ON custom_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_alerts" ON custom_alerts
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON custom_alerts
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
