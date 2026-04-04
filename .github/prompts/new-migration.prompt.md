---
description: "Create a new Supabase SQL migration for Patrimio with all required conventions: UUID PK, user_id FK, soft delete, RLS policies, updated_at trigger, and rollback documentation."
name: "New Supabase Migration"
agent: agent
tools: [read, edit, search]
argument-hint: "Describe the table or schema change (e.g., 'price_alerts table for investment notifications with ticker, threshold, direction')"
---

Create a Supabase migration file for Patrimio following all project conventions.

## What to build

$input

## Requirements

1. Read the existing schema in [docs/patrimio-technical-spec.md](../../docs/patrimio-technical-spec.md) section 4 to understand related tables and ENUMs
2. Load the [supabase-migration skill](../.github/skills/supabase-migration/SKILL.md) for the migration template
3. Generate the migration file at: `supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql`
   - Use the current timestamp for the filename prefix
   - Choose a clear, descriptive name in snake_case

## Must include

- [ ] UUID PK with `gen_random_uuid()`
- [ ] `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- [ ] `created_at`, `updated_at`, `deleted_at TIMESTAMPTZ`
- [ ] Relevant indexes for query patterns
- [ ] RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- [ ] SELECT, INSERT, UPDATE policies (no DELETE policy — use soft delete)
- [ ] `updated_at` trigger using `moddatetime`
- [ ] Rollback documented at top of file
- [ ] Monetary columns as `INTEGER` with `_cents` suffix

## Output

The migration file ready to apply with `npx supabase db push`.
Also show what TypeScript types should be added to `types/financial.ts` for the new table.
