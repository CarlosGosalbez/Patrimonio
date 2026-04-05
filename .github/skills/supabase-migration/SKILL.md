---
name: supabase-migration
description: "Create Supabase SQL migration files for Patrimio following all project conventions: UUID PKs, soft deletes, RLS policies, updated_at triggers, proper indexes. Use when adding new tables, modifying schema, or creating new RLS policies."
argument-hint: "Describe the schema change needed (e.g., 'add price_alerts table for investment notifications')"
---

# Supabase Migration Skill

Creates complete, ready-to-apply Supabase migration files following Patrimio conventions.

## Procedure

1. **Identify** the table purpose and required columns
2. **Check** existing tables for FK relationships (`docs/patrimio-technical-spec.md` section 4)
3. **Apply** naming convention: `YYYYMMDDHHMMSS_verb_noun.sql`
4. **Generate** the complete migration using the template below
5. **Verify** all security requirements: RLS enabled, policies for SELECT/INSERT/UPDATE

## Migration Template

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_table_name.sql
-- Description: [What this migration does]
-- ROLLBACK:
--   DROP TABLE IF EXISTS table_name CASCADE;
--   DROP TYPE IF EXISTS enum_name;

-- ============================================================
-- 1. ENUM TYPES (if needed)
-- ============================================================
CREATE TYPE enum_name AS ENUM ('value1', 'value2', 'value3');

-- ============================================================
-- 2. TABLE CREATION
-- ============================================================
CREATE TABLE table_name (
  -- Primary Key: always UUID
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner: always links to auth.users with CASCADE
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Business columns
  name        VARCHAR(200) NOT NULL,
  amount_cents INTEGER NOT NULL,        -- Monetary: always cents INTEGER
  currency    VARCHAR(3) NOT NULL DEFAULT 'EUR',
  status      enum_name NOT NULL DEFAULT 'value1',
  metadata    JSONB,                    -- Flexible data (if needed)

  -- FK to other tables
  related_id  UUID REFERENCES other_table(id),

  -- Audit fields: always these 3
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ               -- Soft delete: null = active
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
-- Always index user_id
CREATE INDEX idx_table_name_user ON table_name(user_id);
-- Index date columns used in range queries
CREATE INDEX idx_table_name_user_date ON table_name(user_id, created_at DESC);
-- Partial index for active records (common query pattern)
CREATE INDEX idx_table_name_active ON table_name(user_id)
  WHERE deleted_at IS NULL;
-- GIN index for array/JSONB columns
-- CREATE INDEX idx_table_name_tags ON table_name USING gin(tags);

-- ============================================================
-- 4. ROW LEVEL SECURITY (MANDATORY)
-- ============================================================
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- SELECT: user sees only their active records
CREATE POLICY "users_select_table_name" ON table_name
  FOR SELECT USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

-- INSERT: user can only create records for themselves
CREATE POLICY "users_insert_table_name" ON table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: user can only modify their own records
CREATE POLICY "users_update_table_name" ON table_name
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- NOTE: No DELETE policy. Use UPDATE SET deleted_at = NOW() for soft delete.

-- ============================================================
-- 5. TRIGGERS
-- ============================================================
-- Auto-update updated_at on every change
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- 6. SEED DATA (if needed, must be idempotent)
-- ============================================================
-- INSERT INTO table_name (...) VALUES (...)
-- ON CONFLICT (unique_column) DO NOTHING;
```

## Common Patterns

### Adding a column to existing table

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_column_to_table.sql
-- ROLLBACK: ALTER TABLE table_name DROP COLUMN IF EXISTS new_column;

ALTER TABLE table_name
  ADD COLUMN new_column VARCHAR(100);

-- If adding a NOT NULL column, provide a default:
ALTER TABLE table_name
  ADD COLUMN new_column VARCHAR(100) NOT NULL DEFAULT '';
```

### System table (no user_id, shared data)

```sql
-- For tables like market_cache that are global:
ALTER TABLE market_cache ENABLE ROW LEVEL SECURITY;
-- Public read:
CREATE POLICY "public_select_market_cache" ON market_cache
  FOR SELECT USING (true);
-- Write only by service_role (Edge Functions):
-- No INSERT/UPDATE policy = only service_role bypass can write
```

## Validation Checklist

Before finalizing a migration, verify:

- [ ] Table has `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- [ ] Table has `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` (unless system table)
- [ ] Table has `created_at`, `updated_at`, `deleted_at`
- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is present
- [ ] SELECT, INSERT, UPDATE policies created (no DELETE policy)
- [ ] `updated_at` trigger is added
- [ ] Rollback is documented at the top
- [ ] Monetary columns are `INTEGER` with `_cents` suffix

## Applying Migrations to Remote Supabase (NO Docker)

Patrimio works **remote-only**. Never use `supabase start` or Docker.

### Prerequisites

The `moddatetime` extension must be enabled via a setup migration before any table migration that uses `updated_at` triggers. The project has `20260405120001_setup_extensions.sql` for this purpose. **Do not create new migrations without this extension already applied.**

### DB Push Command

```powershell
# Use DATABASE_URL_POOLER from .env.local (port 6543, Transaction pooler)
npx supabase db push --db-url "postgresql://postgres.febokmcgjatrfdfuaeyk:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
```

**Important notes:**

- Use **port 6543** (Transaction pooler) NOT 5432 (direct connection — DNS often fails)
- URL format: `postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
- Region for this project: `eu-west-1` (verify in Supabase Dashboard > Settings > Database)
- `supabase link` requires a Personal Access Token (`sbp_...`). As of 2026 Supabase issues tokens with `sb_` prefix that are NOT compatible with `supabase link`. Use `--db-url` directly instead.

### Generate Types After Migration

**Use the Management API (no Docker required):**

```powershell
# Option A — preferred: uses SUPABASE_ACCESS_TOKEN via npm script
npm run db:types

# Option B — explicit (no --linked needed):
npx supabase gen types typescript --project-id febokmcgjatrfdfuaeyk --schema public > types/database.ts

# Option C — via --db-url (direct DB connection, no Docker):
npx supabase db pull --db-url "postgresql://postgres.febokmcgjatrfdfuaeyk:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
npx supabase gen types typescript --local > types/database.ts  # Only after db pull sets up local schema
```

**Correct approach: ALWAYS use Option A or B. Never Docker.**

### moddatetime Extension

Supabase does not auto-enable the `moddatetime` extension. The project uses a wrapper function in `public` schema:

```sql
-- In 20260405120001_setup_extensions.sql (already applied):
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.moddatetime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

This wrapper lets all triggers use `EXECUTE FUNCTION moddatetime(updated_at)` without schema prefix. **Always verify this migration is applied before adding new tables with `updated_at` triggers.**
