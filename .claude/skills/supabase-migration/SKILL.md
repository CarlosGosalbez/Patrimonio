---
name: supabase-migration
description: "Create production-grade Supabase SQL migration files for Patrimio. Generates complete migration with UUID PKs, check constraints, RLS (SELECT/INSERT/UPDATE), business logic triggers, audit triggers, materialized views if needed, proper indexes (B-tree/partial/GIN/BRIN), FK with correct ON DELETE, and rollback. Use when adding tables, altering schema, or creating RLS policies."
---

# Supabase Migration Generator

**Goal:** Produce a complete, production-grade `.sql` file in `supabase/migrations/`.

## Pre-flight checklist

1. Read `docs/patrimio-technical-spec.md` §4 for existing tables and FK targets
2. Determine: column nullability, business constraints, FK ON DELETE behavior
3. Decide index strategy (see §6 in `.claude/rules/database.md`)
4. Generate filename: `YYYYMMDDHHMMSS_verb_noun.sql`
5. **Never skip any section** of the template below

## Complete Migration Template

```sql
-- =================================================================
-- supabase/migrations/YYYYMMDDHHMMSS_add_table_name.sql
-- Description: [1-line description of what this migration does]
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_table_name_updated_at ON table_name;
--   DROP TRIGGER IF EXISTS trg_table_name_no_resurrect ON table_name;
--   DROP TRIGGER IF EXISTS trg_table_name_audit ON table_name;
--   DROP TABLE IF EXISTS table_name CASCADE;
--   DROP TYPE IF EXISTS enum_name;
-- =================================================================

-- ─── 0. EXTENSIONS (only if needed) ─────────────────────────────
-- moddatetime should already be enabled; add others here if new
-- CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ─── 1. ENUM TYPES ───────────────────────────────────────────────
CREATE TYPE table_status AS ENUM ('active', 'pending', 'completed', 'cancelled');

-- ─── 2. TABLE ────────────────────────────────────────────────────
CREATE TABLE table_name (
  -- Identity
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Business columns (adjust nullability per business rules)
  name          VARCHAR(200)  NOT NULL,
  description   TEXT,                                       -- nullable: optional
  amount_cents  INTEGER       NOT NULL,                     -- MONEY: always cents
  currency      VARCHAR(3)    NOT NULL DEFAULT 'EUR',
  status        table_status  NOT NULL DEFAULT 'active',
  metadata      JSONB,                                      -- nullable: flexible data

  -- FK to other Patrimio tables (set correct ON DELETE)
  -- category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  -- account_id  UUID REFERENCES accounts(id)   ON DELETE RESTRICT,

  -- Audit (mandatory)
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,                                -- soft delete

  -- ── Business-level CHECK constraints ─────────────────────────
  CONSTRAINT chk_table_name_amount_positive  CHECK (amount_cents > 0),
  CONSTRAINT chk_table_name_name_not_empty   CHECK (char_length(trim(name)) > 0),
  CONSTRAINT chk_table_name_currency_format  CHECK (char_length(currency) = 3),
  CONSTRAINT chk_table_name_deleted_order    CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

COMMENT ON TABLE  table_name IS '[Business description of the table]';
COMMENT ON COLUMN table_name.amount_cents IS 'Amount in minor currency unit (cents). 850.75€ = 85075';

-- ─── 3. INDEXES ──────────────────────────────────────────────────
-- Ownership (always)
CREATE INDEX idx_table_name_user   ON table_name(user_id);

-- Active records only (partial — smaller than full index)
CREATE INDEX idx_table_name_active ON table_name(user_id)
  WHERE deleted_at IS NULL;

-- Time-series access (transactions, operations)
CREATE INDEX idx_table_name_user_date ON table_name(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- FK joins (add one per FK column)
-- CREATE INDEX idx_table_name_category ON table_name(category_id) WHERE deleted_at IS NULL;

-- Full-text search on description (Spanish stemming)
-- CREATE INDEX idx_table_name_fts ON table_name
--   USING gin(to_tsvector('spanish', coalesce(description, '') || ' ' || name));

-- JSONB metadata queries
-- CREATE INDEX idx_table_name_metadata ON table_name USING gin(metadata jsonb_path_ops);

-- Time-series BRIN (millions of rows, cheap to maintain)
-- CREATE INDEX idx_table_name_created_brin ON table_name USING brin(created_at);

-- ─── 4. ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- SELECT: user sees only their active records
CREATE POLICY "users_select_table_name" ON table_name
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- INSERT: enforces ownership
CREATE POLICY "users_insert_table_name" ON table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: enforces ownership on both sides (prevents row hijacking)
CREATE POLICY "users_update_table_name" ON table_name
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 5. TRIGGERS ─────────────────────────────────────────────────
-- 5a. Auto-maintain updated_at
CREATE TRIGGER trg_table_name_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- 5b. Prevent resurrecting soft-deleted records
-- (function prevent_resurrect() must exist — created in 0_bootstrap.sql)
CREATE TRIGGER trg_table_name_no_resurrect
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION prevent_resurrect();

-- 5c. Audit log — apply to financial tables (transactions, investment_operations, etc.)
-- Requires audit_log table from bootstrap migration
-- CREATE TRIGGER trg_table_name_audit
--   AFTER INSERT OR UPDATE OR DELETE ON table_name
--   FOR EACH ROW EXECUTE FUNCTION audit_financial_mutation();

-- ─── 6. GRANTS (if accessing from Edge Functions via service_role) ──
-- No extra grants needed: service_role bypasses RLS by default.
-- Never grant anon/authenticated role directly on financial tables.
```

## Validation Checklist (run before committing)

- [ ] `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- [ ] `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- [ ] `amount_cents INTEGER NOT NULL` (no DECIMAL/FLOAT)
- [ ] `deleted_at TIMESTAMPTZ` (nullable, no DEFAULT)
- [ ] `CONSTRAINT chk_*_amount_positive CHECK (amount_cents > 0)` on financial tables
- [ ] `CONSTRAINT chk_*_deleted_order` present
- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- [ ] SELECT policy with `deleted_at IS NULL`
- [ ] INSERT policy with `WITH CHECK`
- [ ] UPDATE policy with both `USING` and `WITH CHECK`
- [ ] `trg_*_updated_at` trigger
- [ ] `trg_*_no_resurrect` trigger
- [ ] Partial index `WHERE deleted_at IS NULL` for active records
- [ ] FK ON DELETE behavior is correct for each relationship
- [ ] ROLLBACK comment at top of file covers all created objects

## Altering existing tables

```sql
-- Always use IF NOT EXISTS / IF EXISTS to make migrations idempotent
ALTER TABLE existing_table
  ADD COLUMN IF NOT EXISTS new_column VARCHAR(100),
  ADD COLUMN IF NOT EXISTS status table_status NOT NULL DEFAULT 'active';

-- Add constraint only if not exists (PostgreSQL 13+)
DO $$BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_existing_table_new_constraint'
  ) THEN
    ALTER TABLE existing_table
      ADD CONSTRAINT chk_existing_table_new_constraint CHECK (...);
  END IF;
END$$;
```

## Bootstrap functions (must exist before first table migration)

If `prevent_resurrect()` or `audit_financial_mutation()` don't exist yet, create them in a `0_bootstrap_functions.sql` migration first:

```sql
-- supabase/migrations/20240101000000_bootstrap_functions.sql
CREATE OR REPLACE FUNCTION prevent_resurrect()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'Cannot un-delete record %. Create new record instead.', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT        NOT NULL,
  record_id   UUID        NOT NULL,
  user_id     UUID,
  operation   TEXT        NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_user_time ON audit_log(user_id, changed_at DESC);

CREATE OR REPLACE FUNCTION audit_financial_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_log(table_name, record_id, user_id, operation, old_data, new_data)
  VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), auth.uid(),
          TG_OP, to_jsonb(OLD), to_jsonb(NEW));
  RETURN COALESCE(NEW, OLD);
END;
$$;
```
