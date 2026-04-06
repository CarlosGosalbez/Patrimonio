-- ============================================================
-- PHASE 8 — PWA Push Notifications
-- Migration: 20260406210000_phase8_push_subscriptions.sql
-- ROLLBACK:
--   DROP TABLE IF EXISTS push_subscriptions CASCADE;
-- ============================================================

-- Push subscription storage for Web Push API (VAPID)
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    -- Web Push API PushSubscription JSON fields
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL, -- client public key
    auth_key TEXT NOT NULL, -- client auth secret
    -- Device info (for UX: allow user to see/remove per device)
    user_agent TEXT,
    device_label TEXT, -- "iPhone de Carlos" (user-editable)
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- One subscription per endpoint per user
    CONSTRAINT uq_push_subscription UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions (user_id)
WHERE
    is_active = true;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_push_subscriptions" ON push_subscriptions FOR
SELECT USING (auth.uid () = user_id);

CREATE POLICY "users_insert_push_subscriptions" ON push_subscriptions FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "users_update_push_subscriptions" ON push_subscriptions FOR
UPDATE USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "users_delete_push_subscriptions" ON push_subscriptions FOR DELETE USING (auth.uid () = user_id);

CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime(updated_at);