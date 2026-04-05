# supabase/ — Database Rules

> These rules extend root AGENTS.md for migration, function, and schema work.

## Before any schema change

1. Read `docs/patrimio-technical-spec.md` §4 — full existing schema
2. Verify if related table already exists in `types/database.ts`
3. Never modify applied migrations — create a new migration

## Supabase CLI — remote mode (NO Docker)

```bash
npm run db:push   # Apply migrations (remote, no Docker)
npm run db:types  # Regenerate types — supabase gen types typescript --linked (no Docker)
npm run db:diff   # Preview diff before pushing
```

**Never run:** `supabase start`, `supabase stop`, `docker`, or `docker-compose`.

## Migration checklist (MANDATORY)

Every `supabase/migrations/` file MUST include:

- [ ] `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- [ ] `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- [ ] `created_at / updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- [ ] `deleted_at TIMESTAMPTZ` — soft delete
- [ ] `ALTER TABLE X ENABLE ROW LEVEL SECURITY`
- [ ] Policies: SELECT (with `deleted_at IS NULL`) + INSERT + UPDATE
- [ ] `CREATE TRIGGER trg_X_updated_at BEFORE UPDATE ...`
- [ ] `CREATE TRIGGER trg_X_no_resurrect BEFORE UPDATE ...`
- [ ] Indexes: `idx_X_user(user_id)` + `idx_X_active(user_id) WHERE deleted_at IS NULL`
- [ ] ROLLBACK documented at top as comment
- [ ] CHECK constraints for business invariants (amounts > 0, names not empty, currency length = 3)
- [ ] FTS indexes specify language explicitly: `to_tsvector('spanish', ...)` or `'simple'` for multilingual
- [ ] `COMMENT ON TABLE` describing the business purpose
- [ ] `COMMENT ON COLUMN` for monetary columns (document cents meaning)
- [ ] i18n: multilingual user-visible text uses JSONB `name_i18n` column pattern
- [ ] FTS queries with user input use `websearch_to_tsquery` / `plainto_tsquery` — never raw `to_tsquery`
- [ ] `SECURITY DEFINER` functions have `SET search_path = public, pg_catalog` + explicit `auth.uid()` check
- [ ] Role grants: `authenticated` gets `SELECT, INSERT, UPDATE` only; `anon` gets `SELECT` on public tables only; never `DELETE` or `ALL`

## Monetary columns

```sql
-- CORRECT
amount_cents INTEGER NOT NULL
CONSTRAINT chk_X_amount_positive CHECK (amount_cents > 0)

-- WRONG — never
amount DECIMAL(10,2)
amount FLOAT
price NUMERIC
```

## RLS — Complete policies

```sql
-- SELECT: filter deleted_at here so it doesn't leak to the app
CREATE POLICY "users_select_X" ON X
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- INSERT: do not include user_id in WITH CHECK — value comes from JWT in app
CREATE POLICY "users_insert_X" ON X
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: dual check USING + WITH CHECK
CREATE POLICY "users_update_X" ON X
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

## Edge Functions (supabase/functions/)

- Runtime: Deno TypeScript
- `service_role` key: SOLO aquí, nunca en Next.js
- Variables de entorno: acceder con `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`
- Cron triggers: configurar en `supabase/config.toml` (no como código)

```typescript
// Patrón base Edge Function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // Solo aquí
);

Deno.serve(async (req) => {
  // Verificar auth header si es invocada desde cliente
  const authHeader = req.headers.get("Authorization");
  // Lógica de la función...
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

## Después de cada migración

```bash
npx supabase db push                                          # Aplicar
npm run db:types   # supabase gen types typescript --linked -- no Docker needed
npm run type-check                                            # Verificar sin errores
```
