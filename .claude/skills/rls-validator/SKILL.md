# RLS Validator Skill

## Metadata

- **name**: rls-validator
- **description**: Audita RLS policies en todas las tablas Supabase. Verifica que cada tabla tenga SELECT/INSERT/UPDATE correctos.
- **when-to-use**: Nueva migración, post-schema-change, security review, pre-release
- **model**: sonnet

## What this skill does

Conecta a Supabase (via MCP o SQL directo) y audita:

1. Todas las tablas tienen RLS habilitado
2. Policies SELECT con `auth.uid() = user_id AND deleted_at IS NULL`
3. Policies INSERT con `WITH CHECK (auth.uid() = user_id)`
4. Policies UPDATE con USING + WITH CHECK
5. NO hay policies DELETE (solo soft delete)

## Actions

```sql
-- Query 1: Verificar RLS habilitado
SELECT
  schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN ('schema_migrations')
ORDER BY tablename;

-- Query 2: Listar todas las policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,  -- SELECT, INSERT, UPDATE, DELETE
  qual,  -- USING clause
  with_check  -- WITH CHECK clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Query 3: Detectar tablas sin RLS
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN ('schema_migrations')
  AND rowsecurity = false;
```

## Output format

```
🔒 RLS AUDIT REPORT
═══════════════════════════════════════════════

📊 SUMMARY
Total tables: 20
RLS enabled: 20 ✅
Missing policies: 2 ⚠️

📋 POLICY MATRIX (S=SELECT, I=INSERT, U=UPDATE, D=DELETE)

Table                      S    I    U    D   Status
accounts                  ✅   ✅   ✅   ❌   ✅ OK
categories                ✅   ✅   ✅   ❌   ✅ OK
transactions              ✅   ✅   ✅   ❌   ✅ OK
investment_positions      ✅   ❌   ✅   ❌   ⚠️  MISSING INSERT
import_batches            ✅   ✅   ❌   ❌   ⚠️  MISSING UPDATE
...

⚠️  ISSUES FOUND (2)

1. investment_positions: NO INSERT policy
   FIX:
   CREATE POLICY "users_insert_investment_positions"
   ON investment_positions FOR INSERT
   WITH CHECK (auth.uid() = user_id);

2. import_batches: NO UPDATE policy
   FIX:
   CREATE POLICY "users_update_import_batches"
   ON import_batches FOR UPDATE
   USING (auth.uid() = user_id)
   WITH CHECK (auth.uid() = user_id);

🎯 VERDICT: NEEDS FIXES ⚠️
Apply fixes, then run: npm run db:push
```

## Prerequisites

- Supabase MCP configurado O acceso a psql
- Variable SUPABASE_ACCESS_TOKEN en .env.local

## Example invocation

"@rls-validator audita todas las tablas y genera el informe"
