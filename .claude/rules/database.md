---
paths:
  - "supabase/**"
  - "types/database.ts"
---

# Database Rules — Patrimio

## 1. Schema Conventions (non-negotiable)

- **PK**: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` — never SERIAL/BIGSERIAL
- **Owner**: `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- **Audit**: `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `deleted_at TIMESTAMPTZ`
- **Soft delete**: `deleted_at IS NULL` means active — NEVER `DELETE` physically
- **Money**: `INTEGER _cents` suffix only — `850.75€ → 85075` — NEVER DECIMAL/FLOAT/NUMERIC
- **Currency**: `VARCHAR(3) NOT NULL DEFAULT 'EUR'` alongside every `_cents` column
- **Names**: snake_case plural tables, snake_case columns, SCREAMING_SNAKE enums

## 2. Column Nullability Rules

| Column type      | Nullable?        | Reason                            |
| ---------------- | ---------------- | --------------------------------- |
| `user_id`        | NOT NULL         | ownership always known            |
| `amount_cents`   | NOT NULL         | financial value required          |
| `currency`       | NOT NULL         | denomination required             |
| `status` enum    | NOT NULL DEFAULT | always has a state                |
| `description`    | NULLABLE         | optional free text                |
| `metadata` JSONB | NULLABLE         | optional extra data               |
| `deleted_at`     | NULLABLE         | null = active record              |
| `external_id`    | NULLABLE         | not all records have external ref |

## 3. RLS — Mandatory on every table

```sql
-- Enable RLS (mandatory)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- SELECT: only active records owned by user
CREATE POLICY "users_select_table_name" ON table_name
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- INSERT: user can only insert their own records
CREATE POLICY "users_insert_table_name" ON table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: user can only update their own records (soft delete via UPDATE too)
CREATE POLICY "users_update_table_name" ON table_name
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Edge Functions / service_role bypass RLS automatically — no extra policy needed
-- NEVER grant anon/authenticated broader SELECT without USING clause
```

## 4. Triggers (mandatory patterns)

```sql
-- updated_at auto-maintenance (requires moddatetime extension)
CREATE TRIGGER trg_table_name_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- Prevent resurrecting soft-deleted records (business integrity)
CREATE OR REPLACE FUNCTION prevent_resurrect()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'Cannot un-delete a soft-deleted record. Create a new record instead.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_table_name_no_resurrect
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION prevent_resurrect();

-- Audit log for sensitive financial mutations (transactions, investments)
CREATE OR REPLACE FUNCTION audit_financial_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, user_id, operation, old_data, new_data, changed_at)
  VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), auth.uid(),
          TG_OP, to_jsonb(OLD), to_jsonb(NEW), NOW());
  RETURN COALESCE(NEW, OLD);
END;
$$;
-- Apply to financial tables: transactions, investment_operations, etc.
CREATE TRIGGER trg_transactions_audit
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION audit_financial_mutation();
```

## 5. Check Constraints (business logic at DB layer)

```sql
-- Positive amounts only (financial integrity)
CONSTRAINT chk_amount_positive CHECK (amount_cents > 0)

-- Non-empty strings
CONSTRAINT chk_name_not_empty CHECK (char_length(trim(name)) > 0)

-- Valid currency code (ISO 4217 length rule)
CONSTRAINT chk_currency_format CHECK (char_length(currency) = 3)

-- Timestamps: created_at cannot be in the future
CONSTRAINT chk_created_not_future CHECK (created_at <= NOW() + INTERVAL '5 seconds')

-- deleted_at must be after created_at
CONSTRAINT chk_deleted_after_created CHECK (deleted_at IS NULL OR deleted_at >= created_at)

-- Percentage columns (0-100)
CONSTRAINT chk_percentage CHECK (percentage >= 0 AND percentage <= 100)
```

## 6. Indexes — full strategy per table type

```sql
-- ALWAYS: user ownership (most common filter)
CREATE INDEX idx_table_user ON table_name(user_id);

-- ALWAYS: active records (partial index = smaller + faster)
CREATE INDEX idx_table_active ON table_name(user_id) WHERE deleted_at IS NULL;

-- Time-series tables (transactions, operations): composite with date DESC
CREATE INDEX idx_table_user_date ON table_name(user_id, transaction_date DESC)
  WHERE deleted_at IS NULL;

-- FK columns used in JOINs
CREATE INDEX idx_table_category ON table_name(category_id) WHERE deleted_at IS NULL;

-- Full-text search on description (Spanish)
CREATE INDEX idx_table_description_fts ON table_name
  USING gin(to_tsvector('spanish', description));

-- JSONB metadata queries
CREATE INDEX idx_table_metadata ON table_name USING gin(metadata jsonb_path_ops);

-- Large time-series (millions of rows): BRIN is 100x smaller than B-tree
CREATE INDEX idx_table_created_brin ON table_name USING brin(created_at);
```

## 7. Foreign Keys — correct ON DELETE behavior

| Relationship               | ON DELETE behaviour | Example                                 |
| -------------------------- | ------------------- | --------------------------------------- |
| `user_id → auth.users`     | CASCADE             | row belongs to user                     |
| `category_id → categories` | SET NULL            | transaction survives category delete    |
| `account_id → accounts`    | RESTRICT            | cannot delete account with transactions |
| `budget_id → budgets`      | SET NULL            | transaction survives budget delete      |
| `parent_id → same table`   | SET NULL            | tree hierarchy (categories)             |

## 8. Materialized Views (dashboard aggregations)

```sql
-- Refresh strategy: after each transaction INSERT/UPDATE via trigger
CREATE MATERIALIZED VIEW mv_monthly_summary AS
SELECT
  user_id,
  DATE_TRUNC('month', transaction_date) AS month,
  category_id,
  SUM(amount_cents) FILTER (WHERE type = 'expense') AS expenses_cents,
  SUM(amount_cents) FILTER (WHERE type = 'income') AS income_cents,
  COUNT(*) AS transaction_count
FROM transactions
WHERE deleted_at IS NULL
GROUP BY user_id, DATE_TRUNC('month', transaction_date), category_id;

CREATE UNIQUE INDEX idx_mv_monthly_summary ON mv_monthly_summary(user_id, month, category_id);

-- Refresh trigger (fire after bulk mutations)
CREATE OR REPLACE FUNCTION refresh_monthly_summary()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_summary;
  RETURN NULL;
END;
$$;
```

## 9. Edge Functions integration patterns

```typescript
// supabase/functions/[name]/index.ts — always use service_role client
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // bypasses RLS — use for scheduled jobs only
  { auth: { persistSession: false } },
);

// Scheduled: always check idempotency keys to prevent duplicate processing
// Pattern: use INSERT ... ON CONFLICT DO NOTHING with idempotency_key column
```

## 10. Performance rules

- `EXPLAIN (ANALYZE, BUFFERS)` before shipping any complex query
- Max 3 JOINs per query — use materialized views for more
- No `SELECT *` in application code — always enumerate columns
- Connection pooling: Supabase uses PgBouncer in **transaction mode** — NEVER use advisory locks or `SET LOCAL`
- `LIMIT` on every paginated query — default page size: 50 rows
- Use `.rpc()` for complex aggregations (single round-trip vs multiple .select())

## 11. DO NOT

- Edit `types/database.ts` manually → `npx supabase gen types typescript --local > types/database.ts`
- Use `SERIAL` / `BIGSERIAL` primary keys
- Store monetary amounts as DECIMAL, FLOAT, or NUMERIC
- Use physical DELETE (use soft delete via `deleted_at`)
- Add RLS to system tables or `auth.*` tables
- Use `NOW()` inside CHECK constraints (not immutable)
