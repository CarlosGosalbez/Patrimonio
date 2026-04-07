-- supabase/migrations/20260408010000_create_user_preferences.sql
-- Description: Creates user_preferences table for storing user display and formatting preferences
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
--   DROP TABLE IF EXISTS user_preferences CASCADE;

-- ============================================================
-- 1. TABLE CREATION
-- ============================================================
CREATE TABLE user_preferences (
  -- Primary Key: user_id (one preference row per user)
  user_id        UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

-- Display preferences
base_currency VARCHAR(3) NOT NULL DEFAULT 'EUR' CHECK (
    base_currency IN (
        'EUR',
        'USD',
        'GBP',
        'CHF',
        'MXN',
        'ARS',
        'COP',
        'CLP',
        'BRL',
        'CAD',
        'AUD',
        'JPY',
        'CNY'
    )
),
locale VARCHAR(5) NOT NULL DEFAULT 'es' CHECK (locale IN ('es', 'en')),
date_format VARCHAR(10) NOT NULL DEFAULT 'DD/MM/YYYY' CHECK (
    date_format IN (
        'DD/MM/YYYY',
        'MM/DD/YYYY',
        'YYYY-MM-DD'
    )
),
decimal_places SMALLINT NOT NULL DEFAULT 2 CHECK (
    decimal_places BETWEEN 0 AND 4
),
first_day_week SMALLINT NOT NULL DEFAULT 1 CHECK (first_day_week IN (0, 1)), -- 0=Sunday, 1=Monday
theme VARCHAR(10) NOT NULL DEFAULT 'auto' CHECK (
    theme IN ('auto', 'light', 'dark')
),

-- Audit fields
created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================
CREATE INDEX idx_user_preferences_currency ON user_preferences (base_currency);

-- ============================================================
-- 3. ROW LEVEL SECURITY (MANDATORY)
-- ============================================================
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can do all operations on their own preferences
CREATE POLICY "users_all_user_preferences" ON user_preferences FOR ALL USING (auth.uid () = user_id);

-- ============================================================
-- 4. TRIGGERS
-- ============================================================
-- Auto-update updated_at on every change
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- 5. SEED DATA (idempotent — creates defaults for existing users)
-- ============================================================
INSERT INTO
    user_preferences (user_id)
SELECT id
FROM auth.users ON CONFLICT (user_id) DO NOTHING;