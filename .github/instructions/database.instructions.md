---
description: "Use when writing database migrations, SQL schema, RLS policies, Supabase queries, stored procedures, or any Supabase/PostgreSQL code. Covers security, soft deletes, naming conventions, and RLS patterns."
name: "Supabase & Database Guidelines"
applyTo: "supabase/**"
---

# Supabase & PostgreSQL Guidelines — Patrimio

## Schema Conventions

Every table MUST have:

```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- NEVER sequential integers
user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMPTZ  -- Soft delete; NEVER physical DELETE
```

## Monetary Amounts

Store ALL amounts in **integer cents**:

- `850.75 €` → `85075` (column type `INTEGER`, name suffix `_cents`)
- Always pair with a `currency VARCHAR(3)` column (ISO 4217)
- Never use `DECIMAL` or `FLOAT` for financial values in Supabase

## Row Level Security (RLS)

Every table needs RLS enabled + individual policies per operation:

```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_my_table" ON my_table
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_my_table" ON my_table
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_my_table" ON my_table
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Soft delete via UPDATE (never a DELETE policy)
-- DELETE physically is forbidden; use: UPDATE SET deleted_at = NOW()
```

For tables shared system-wide (like `categories`):

```sql
-- System categories visible to all; user categories only to owner
CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
```

## Migration File Format

```sql
-- File: supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql
-- ROLLBACK: DROP TABLE IF EXISTS table_name CASCADE;

-- 1. ENUMs (if needed)
CREATE TYPE my_enum AS ENUM ('value1', 'value2');

-- 2. Table
CREATE TABLE table_name ( ... );

-- 3. Indexes
CREATE INDEX idx_table_user_date ON table_name(user_id, created_at DESC);

-- 4. RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY ...;

-- 5. Trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

**Critical rules:**

- Never edit a migration that has already been applied — create a new one
- Always document rollback at the top of the file
- Seed system data (categories) must be idempotent (`INSERT ... ON CONFLICT DO NOTHING`)

## Supabase Clients

| Context                      | Import                      | Usage                      |
| ---------------------------- | --------------------------- | -------------------------- |
| Browser / Client Component   | `@/lib/supabase/client`     | `createBrowserClient()`    |
| Server Component / API Route | `@/lib/supabase/server`     | `createServerClient()`     |
| Edge Middleware              | `@/lib/supabase/middleware` | `createMiddlewareClient()` |

**The `service_role` key is ONLY used in Supabase Edge Functions** (Deno), never in Next.js client or server components.

## Soft Delete Pattern

```typescript
// CORRECT — soft delete
await supabase
  .from("transactions")
  .update({ deleted_at: new Date().toISOString() })
  .eq("id", transactionId)
  .eq("user_id", userId); // RLS secondary check

// WRONG — physical delete
await supabase.from("transactions").delete().eq("id", transactionId);
```

All SELECT queries filter `deleted_at IS NULL` via RLS policies.

## Materialized Views (for performance)

Heavy aggregations for the dashboard use materialized views refreshed by Edge Functions — not real-time queries:

- `monthly_account_balance` — net balance per account per month
- `monthly_category_spending` — spending per category per month

Refresh after transaction creates/updates in Edge Function or trigger.

## RPC Functions

Complex financial calculations are in stored procedures (`CREATE OR REPLACE FUNCTION`):

- `get_net_worth(p_user_id UUID)` — net worth calculation
- `project_cash_flow(p_user_id UUID, p_months INTEGER)` — cash flow projection
- `recalculate_avg_purchase_price(p_investment_id UUID)` — weighted average price

Call from app via `supabase.rpc('function_name', { params })`.
