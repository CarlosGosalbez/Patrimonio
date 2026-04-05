-- supabase/migrations/20260405121300_create_notifications.sql
-- Description: In-app notifications queue
-- ROLLBACK: DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification details
  type            notification_type NOT NULL,
  severity        alert_severity NOT NULL DEFAULT 'info',
  title           VARCHAR(200) NOT NULL,
  message         TEXT NOT NULL,
  
  -- Target (optional link to specific resource)
  target_type     VARCHAR(50),  -- 'transaction', 'budget', 'commitment', 'investment', etc.
  target_id       UUID,
  
  -- Status
  is_read         BOOLEAN NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_notifications_title_not_empty CHECK (char_length(trim(title)) > 0)
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(user_id, created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_update_notifications" ON notifications
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
