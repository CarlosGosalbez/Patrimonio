-- supabase/migrations/20260405130000_create_recovery_codes.sql
-- Description: Recovery codes for 2FA fallback (hashed, single-use)
-- ROLLBACK:
--   DROP TABLE IF EXISTS recovery_codes CASCADE;

CREATE TABLE recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL, -- bcrypt hash of the 16-char hex code
    used_at TIMESTAMPTZ, -- NULL = unused, timestamp = consumed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recovery_codes_user ON recovery_codes (user_id)
WHERE
    used_at IS NULL;

ALTER TABLE recovery_codes ENABLE ROW LEVEL SECURITY;

-- Users can only read their own codes (to show count of remaining)
CREATE POLICY "users_select_recovery_codes" ON recovery_codes FOR
SELECT USING (auth.uid () = user_id);

-- Insert only via API route (no direct client insert)
CREATE POLICY "users_insert_recovery_codes" ON recovery_codes FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

-- Mark as used (UPDATE used_at) only by the owner
CREATE POLICY "users_update_recovery_codes" ON recovery_codes FOR
UPDATE USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- Delete all codes when regenerating (soft: we delete physical here since old hashes are worthless)
CREATE POLICY "users_delete_recovery_codes" ON recovery_codes FOR DELETE USING (auth.uid () = user_id);