# supabase/ — Reglas de Base de Datos

> Estas reglas amplían el root AGENTS.md para trabajo en migraciones, funciones y schema.

## Antes de cualquier cambio de schema

1. Leer `docs/patrimio-technical-spec.md` §4 — schema existente completo
2. Verificar si ya existe tabla relacionada en `types/database.ts`
3. No modificar migraciones ya aplicadas — crear nueva migración

## Checklist de migración (OBLIGATORIO)

Todo archivo `supabase/migrations/` DEBE incluir:

- [ ] `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- [ ] `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- [ ] `created_at / updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- [ ] `deleted_at TIMESTAMPTZ` — soft delete
- [ ] `ALTER TABLE X ENABLE ROW LEVEL SECURITY`
- [ ] Políticas: SELECT (con `deleted_at IS NULL`) + INSERT + UPDATE
- [ ] `CREATE TRIGGER trg_X_updated_at BEFORE UPDATE ...`
- [ ] Índices: `idx_X_user(user_id)` + `idx_X_active(user_id) WHERE deleted_at IS NULL`
- [ ] ROLLBACK documentado al inicio como comentario
- [ ] CHECK constraints para invariantes de negocio (amounts > 0, names not empty)

## Columnas monetarias

```sql
-- CORRECTO
amount_cents INTEGER NOT NULL
CONSTRAINT chk_X_amount_positive CHECK (amount_cents > 0)

-- INCORRECTO — nunca
amount DECIMAL(10,2)
amount FLOAT
price NUMERIC
```

## RLS — Políticas completas

```sql
-- SELECT: filtrar deleted_at aquí para que no escale a la app
CREATE POLICY "users_select_X" ON X
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- INSERT: no incluir user_id en WITH CHECK — el valor viene del JWT en la app
CREATE POLICY "users_insert_X" ON X
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: doble verificación USING + WITH CHECK
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
npx supabase gen types typescript --local > types/database.ts # Regenerar tipos
npm run type-check                                            # Verificar sin errores
```
