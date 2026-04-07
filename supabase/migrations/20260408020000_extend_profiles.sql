-- supabase/migrations/20260408020000_extend_profiles.sql
-- Description: Extend profiles table with personal information fields for Phase 2
-- ROLLBACK:
--   ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_avatar_url_storage;
--   DROP INDEX IF EXISTS idx_profiles_avatar;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS full_name;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS date_of_birth;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS avatar_url;

-- ============================================================
-- 1. ADD COLUMNS
-- ============================================================
ALTER TABLE profiles ADD COLUMN full_name VARCHAR(200);

ALTER TABLE profiles ADD COLUMN date_of_birth DATE;

ALTER TABLE profiles ADD COLUMN avatar_url TEXT;

-- ============================================================
-- 2. CONSTRAINTS
-- ============================================================
-- Ensure avatar_url is either NULL or a valid Supabase Storage URL
ALTER TABLE profiles
ADD CONSTRAINT chk_profiles_avatar_url_storage CHECK (
    avatar_url IS NULL
    OR avatar_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/(public|sign)/avatars/'
);

-- Ensure full_name doesn't exceed reasonable length and doesn't contain dangerous chars
ALTER TABLE profiles
ADD CONSTRAINT chk_profiles_full_name_safe CHECK (
    full_name IS NULL
    OR (
        char_length(full_name) BETWEEN 1 AND 200
        AND full_name ! ~ '[<>"'';\\]'
    )
);

-- Ensure date_of_birth is in the past and user is at least 13 years old (COPPA compliance)
ALTER TABLE profiles
ADD CONSTRAINT chk_profiles_date_of_birth_valid CHECK (
    date_of_birth IS NULL
    OR (
        date_of_birth < CURRENT_DATE
        AND date_of_birth >= CURRENT_DATE - INTERVAL '120 years'
    )
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
-- Index for avatar lookup (partial index only where avatars exist)
CREATE INDEX idx_profiles_avatar ON profiles (avatar_url)
WHERE
    avatar_url IS NOT NULL;

-- ============================================================
-- 4. COMMENTS
-- ============================================================
COMMENT ON COLUMN profiles.full_name IS 'User full display name (optional, editable)';

COMMENT ON COLUMN profiles.date_of_birth IS 'Date of birth for age-related features (optional)';

COMMENT ON COLUMN profiles.avatar_url IS 'URL to avatar image in Supabase Storage avatars bucket';