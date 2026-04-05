-- supabase/migrations/20260405120700_create_auto_categorization_rules.sql
-- Description: Rules for automatic transaction categorization
-- ROLLBACK: DROP TABLE IF EXISTS auto_categorization_rules CASCADE;

CREATE TABLE auto_categorization_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  
  -- Pattern matching
  pattern         VARCHAR(200) NOT NULL,  -- Text pattern to match in description
  is_regex        BOOLEAN NOT NULL DEFAULT false,
  is_case_sensitive BOOLEAN NOT NULL DEFAULT false,
  
  -- Priority (higher = applied first)
  priority        INTEGER NOT NULL DEFAULT 0,
  
  is_active       BOOLEAN NOT NULL DEFAULT true,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  
  CONSTRAINT chk_rules_pattern_not_empty CHECK (char_length(trim(pattern)) > 0),
  CONSTRAINT chk_rules_deleted_order CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

-- Indexes
CREATE INDEX idx_rules_user ON auto_categorization_rules(user_id);
CREATE INDEX idx_rules_priority ON auto_categorization_rules(user_id, priority DESC) WHERE is_active = true AND deleted_at IS NULL;

-- RLS
ALTER TABLE auto_categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_rules" ON auto_categorization_rules
  FOR SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

CREATE POLICY "users_insert_rules" ON auto_categorization_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_rules" ON auto_categorization_rules
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON auto_categorization_rules
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
