-- supabase/migrations/20260405120200_create_categories.sql  
-- Description: Transaction categories (system + user custom)
-- ROLLBACK: DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = system category
  
  name        VARCHAR(100) NOT NULL,
  icon        VARCHAR(50),    -- Emoji or icon identifier
  color       VARCHAR(7),     -- Hex color code
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL, -- For subcategories
  
  -- Category type
  is_income   BOOLEAN NOT NULL DEFAULT false,  -- true = income, false = expense
  
  -- Display order
  sort_order  INTEGER NOT NULL DEFAULT 0,
  
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  
  CONSTRAINT chk_categories_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT chk_categories_deleted_order CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

-- Indexes
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(user_id) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- System categories (user_id IS NULL) visible to all
-- User categories only visible to owner
CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (
    (user_id IS NULL OR auth.uid() = user_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "users_insert_categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_categories" ON categories
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
