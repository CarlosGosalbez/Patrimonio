# Patrimio — GitHub Copilot Workspace Instructions

## Proyecto

**Patrimio** es una PWA de gestión de patrimonio personal. Stack: Next.js 14 + TypeScript + Supabase + Vercel + Claude API.
Ver especificación completa en [docs/patrimio-technical-spec.md](../docs/patrimio-technical-spec.md).

## Reglas de seguridad NO negociables

- RLS activado en TODA tabla Supabase. Política mínima: `auth.uid() = user_id`
- Importes monetarios en centavos INTEGER siempre (`850.75€ → 85075`)
- Zod `.strict()` en schemas de entrada de API routes
- `service_role` key solo en Edge Functions del servidor, nunca en cliente
- Soft deletes: `deleted_at TIMESTAMPTZ` en lugar de DELETE físico
- UUID v4 como primary key en todas las tablas
- Signed URLs para Storage, nunca paths directos

## Convenciones de código

### TypeScript

- `strict: true` en tsconfig, sin excepciones
- Tipos de BD desde `types/database.ts` (generado por Supabase CLI, no editar)
- Preferir `type` para datos, `interface` para contratos de componentes
- Importar con alias `@/` siempre (ej: `@/lib/supabase/client`)

### Naming

- Componentes React: `PascalCase.tsx`
- Hooks: `use` prefix, camelCase (`useTransactions.ts`)
- API routes: kebab-case directorios (`api/ai/import-assist/route.ts`)
- Tablas BD: snake_case plural (`transactions`, `investment_operations`)
- Edge Functions: kebab-case (`market-updater/index.ts`)

### Formateo de datos financieros

- Siempre usar `lib/financial/formatters.ts` para convertir centavos a display
- Locale `es-ES` para fechas y moneda
- Nunca calcular importes con floats, solo con INTEGER centavos

## Patrones de API Routes (agentes IA)

```typescript
// Siempre autenticar desde JWT, nunca del body
const supabase = createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return new Response('Unauthorized', { status: 401 });

// Validar input con Zod strict
const input = InputSchema.strict().parse(await req.json());

// Usar streamText de Vercel AI SDK para agentes
const result = await streamText({ model: anthropic('claude-sonnet-4-5'), ... });
return result.toDataStreamResponse();
```

## Patrones de migraciones SQL

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_nombre.sql
-- ROLLBACK: DROP TABLE IF EXISTS nombre CASCADE;
CREATE TABLE nombre (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE nombre ENABLE ROW LEVEL SECURITY;
-- Políticas RLS por operación (SELECT, INSERT, UPDATE)
```

## Testing

- Vitest para unit tests; siempre mockear Anthropic API en tests de agentes
- Playwright para E2E; configurar proyectos para `iPhone 14` y `iPad Pro 11`
- Mínimo tests para: utilities financieras, schemas Zod, flujos auth, CRUD con RLS

## Anti-patterns a evitar

- ❌ `localStorage` para tokens o datos sensibles (solo cookies HttpOnly)
- ❌ Floats para importes monetarios
- ❌ DELETE físico de registros (usar soft delete)
- ❌ Editar `types/database.ts` manualmente
- ❌ API routes sin validación Zod
- ❌ `dangerouslySetInnerHTML` sin DOMPurify
- ❌ Pasar `user_id` en el body de requests a agentes IA
- ❌ Migraciones que modifiquen migraciones ya aplicadas
