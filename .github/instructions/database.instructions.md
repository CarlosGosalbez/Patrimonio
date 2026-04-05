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

## FK ON DELETE — Decision matrix

| FK target    | ON DELETE | Reason                                    |
| ------------ | --------- | ----------------------------------------- |
| `auth.users` | CASCADE   | User deleted → all their data deleted     |
| `categories` | SET NULL  | Transaction survives without category     |
| `accounts`   | RESTRICT  | Cannot delete account with active records |
| `budgets`    | SET NULL  | Transactions survive without budget       |

## CHECK Constraints — Required on financial tables

```sql
CONSTRAINT chk_table_amount_positive CHECK (amount_cents > 0),
CONSTRAINT chk_table_name_not_empty  CHECK (char_length(trim(name)) > 0),
CONSTRAINT chk_table_currency        CHECK (char_length(currency) = 3),
CONSTRAINT chk_table_deleted_order   CHECK (deleted_at IS NULL OR deleted_at >= created_at)
```

## i18n — Multilingual support in DB

When a table stores user-visible text that must support multiple languages:

```sql
-- Pattern 1: locale column (single-language content per row)
CREATE TABLE categories (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale  VARCHAR(5) NOT NULL DEFAULT 'es',   -- BCP-47: 'es', 'en', 'fr'
  name    VARCHAR(200) NOT NULL,
  ...
  CONSTRAINT chk_categories_locale CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$')
);

-- Pattern 2: JSONB translations (multi-language in one row)
CREATE TABLE categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_i18n    JSONB NOT NULL DEFAULT '{"es": "", "en": ""}',
  -- Access: name_i18n->>'es', name_i18n->>'en'
);
CREATE INDEX idx_categories_name_es ON categories
  USING gin(to_tsvector('spanish', name_i18n->>'es'));
CREATE INDEX idx_categories_name_en ON categories
  USING gin(to_tsvector('english', name_i18n->>'en'));
```

**Full-text search — always specify language in `to_tsvector`:**

```sql
-- Spanish content (default for es-ES users)
CREATE INDEX idx_transactions_fts ON transactions
  USING gin(to_tsvector('spanish', coalesce(description, '')));

-- When multilingual, use 'simple' config to handle any language without stemming
CREATE INDEX idx_transactions_fts_simple ON transactions
  USING gin(to_tsvector('simple', coalesce(description, '') || ' ' || coalesce(notes, '')));
```

**FTS queries with user input — NEVER `to_tsquery` with raw user input:**

```sql
-- WRONG — to_tsquery accepts operators (&, |, !, :*) → user can craft injection
WHERE fts_column @@ to_tsquery('spanish', user_input)

-- CORRECT — websearch_to_tsquery treats input as literal words
WHERE fts_column @@ websearch_to_tsquery('spanish', user_input)

-- Also correct for simple phrase matching
WHERE fts_column @@ plainto_tsquery('spanish', user_input)
```

In TypeScript (Supabase JS):

```typescript
// CORRECT — textSearch uses websearch_to_tsquery internally
const { data } = await supabase
  .from("transactions")
  .select("*")
  .textSearch("description", userInput, { type: "websearch", config: "spanish" });
// type: "websearch" → websearch_to_tsquery (safe)
// type: "plain"     → plainto_tsquery (safe)
// type: "phrase"    → phraseto_tsquery (safe)
// NEVER omit type: (defaults to to_tsquery — unsafe with user input)
```

---

## Database Security

### SECURITY DEFINER functions — require `search_path` lock

```sql
-- WRONG — no search_path: attacker can create schema with same function name
CREATE FUNCTION get_net_worth(p_user_id UUID) RETURNS INTEGER
  LANGUAGE plpgsql SECURITY DEFINER AS $$ ... $$;

-- CORRECT — always lock search_path
CREATE FUNCTION get_net_worth(p_user_id UUID) RETURNS INTEGER
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public, pg_catalog          -- prevents schema injection
  AS $$
BEGIN
  -- ALSO verify caller owns the data — DEFINER bypasses RLS
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  ...
END;
$$;
```

**Rule:** Every `SECURITY DEFINER` function MUST:

1. Have `SET search_path = public, pg_catalog`
2. Explicitly verify `auth.uid() = p_user_id` — DEFINER bypasses RLS

### Role grants — minimum privilege

```sql
-- NEVER grant write permissions to 'anon' role
-- WRONG:
GRANT INSERT, UPDATE ON transactions TO anon;

-- CORRECT: only authenticated users can mutate data (RLS further restricts to owner)
GRANT SELECT, INSERT, UPDATE ON transactions TO authenticated;
-- anon gets SELECT only on public tables (e.g. system categories)
GRANT SELECT ON categories TO anon;
```

**Never grant:**

- `DELETE` to any role — soft deletes via `UPDATE` only
- `TRUNCATE` to any role
- `ALL PRIVILEGES` to `authenticated` or `anon` — enumerate explicitly

### Edge Function JWT verification

Every Edge Function invoked from the client (not cron) must verify the JWT:

```typescript
// supabase/functions/[name]/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // 1. Verify JWT from Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  // 2. Create client scoped to the user (respects RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }, // user-scoped client
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  // 3. Use supabaseAdmin (service_role) ONLY for operations that need to bypass RLS
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  // All admin queries MUST manually filter by user.id — RLS is bypassed
  const { data } = await supabaseAdmin.from("transactions").select("*").eq("user_id", user.id); // MANDATORY filter when using service_role
});
```

### Supabase Storage security

```typescript
// WRONG — public URL leaks file path structure
const { data } = supabase.storage.from("reports").getPublicUrl(path);

// CORRECT — signed URL with expiry
const { data, error } = await supabase.storage.from("reports").createSignedUrl(path, 3600); // 1 hour expiry

// Storage bucket policy: set to PRIVATE in Supabase dashboard
// Access to own files only via RLS-equivalent storage policies:
// (storage.objects table has its own RLS in Supabase Dashboard)
```
