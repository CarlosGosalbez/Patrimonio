-- supabase/migrations/20260405120100_create_profiles.sql
-- Description: User profiles table
-- ROLLBACK: DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  full_name   VARCHAR(200),
  avatar_url  TEXT,
  currency    VARCHAR(3) NOT NULL DEFAULT 'EUR',
  locale      VARCHAR(10) NOT NULL DEFAULT 'es-ES',
  timezone    VARCHAR(50) NOT NULL DEFAULT 'Europe/Madrid',
  
  -- Feature flags
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  
  CONSTRAINT chk_profiles_currency CHECK (char_length(currency) = 3),
  CONSTRAINT chk_profiles_deleted_order CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

-- Indexes
CREATE INDEX idx_profiles_user ON profiles(user_id);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_profiles" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_profiles" ON profiles  
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_profiles" ON profiles
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
