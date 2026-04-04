# PATRIMIO — Agent Guidelines

**Proyecto:** Patrimio — Gestor de Patrimonio Personal  
**Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL + Auth + Storage + Edge Functions), Vercel, Anthropic Claude API, Vercel AI SDK  
**Especificación técnica completa:** [docs/patrimio-technical-spec.md](./docs/patrimio-technical-spec.md)

---

## Arquitectura

- **Frontend:** Next.js 14 App Router, React 18, Tailwind CSS, shadcn/ui, Zustand, TanStack Query
- **Backend:** Supabase (BaaS) + Vercel Edge Middleware
- **IA:** Claude claude-sonnet-4 vía Anthropic API + Vercel AI SDK para streaming
- **Base de datos:** PostgreSQL 15 con RLS obligatorio en todas las tablas
- **Edge Functions:** Deno/TypeScript en Supabase

## Estructura de directorios

```
patrimio/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, register, 2FA (sin layout principal)
│   ├── (app)/              # Rutas autenticadas con layout sidebar
│   └── api/ai/             # Endpoints de agentes IA (categorize, insights, import-assist, etc.)
├── components/             # React components
├── lib/
│   ├── supabase/           # client.ts, server.ts, middleware.ts
│   ├── ai/agents/          # Definición de agentes Claude
│   ├── ai/skills/          # Skills reutilizables entre agentes
│   ├── financial/          # calculations.ts, formatters.ts, projections.ts
│   └── market/             # fetcher.ts con fallback automático de APIs
├── supabase/
│   ├── migrations/         # SQL versionadas con rollback documentado
│   └── functions/          # Edge Functions (market-updater, generate-recurring, send-alerts)
├── types/                  # database.ts (generado Supabase CLI), financial.ts
└── tests/                  # unit/, integration/, e2e/ (Playwright)
```

## Convenciones de código

### TypeScript

- Tipado estricto end-to-end; `strict: true` en tsconfig
- Usar tipos generados por Supabase CLI para las tablas (`types/database.ts`)
- Zod para validación de schemas, siempre con `.strict()` en schemas de entrada
- Preferir `type` sobre `interface` para tipos de datos; `interface` para contratos de componentes

### Importes en centavos

- **TODOS los importes monetarios se almacenan en centavos (INTEGER)**
- `850.75 €` → `85075` centavos
- Nunca usar `float` o `decimal` para importes en la base de datos
- Formatter: `lib/financial/formatters.ts` para convertir a/desde centavos

### Naming conventions

- Componentes: PascalCase (`TransactionList.tsx`)
- Hooks: camelCase con prefijo `use` (`useTransactions.ts`)
- Utilities: camelCase (`formatCurrency.ts`)
- API routes: kebab-case directorios (`api/ai/import-assist/route.ts`)
- Supabase tables: snake_case plural (`transactions`, `investment_operations`)
- Edge Functions: kebab-case (`market-updater/index.ts`)

### Base de datos

- **UUID v4** como primary key (nunca integers secuenciales)
- **Soft deletes** siempre: columna `deleted_at TIMESTAMPTZ` (nunca DELETE físico)
- Auditoría: `created_at` y `updated_at` con `DEFAULT NOW()` y trigger automático
- **RLS obligatorio** en toda tabla nueva; política filtra por `auth.uid()`
- Nunca usar `service_role` key en código cliente; solo en Edge Functions del servidor

## Reglas de seguridad CRÍTICAS

1. **RLS en toda tabla** — sin excepciones. Verificar en migrations
2. **Importes siempre en centavos** — evita errores de punto flotante
3. **Zod `.strict()`** en todos los schemas de entrada de API para prevenir mass assignment
4. **`service_role` nunca en cliente** — solo en Edge Functions con acceso servidor
5. **Sin `eval()`, `dangerouslySetInnerHTML`** sin sanitización (DOMPurify)
6. **Secretos en variables de entorno** de Vercel/Supabase CLI, nunca en repo
7. **Signed URLs** para todos los archivos en Supabase Storage (nunca paths directos)
8. Los **agentes de IA** no reciben datos de otros usuarios; siempre filtrar por `user_id` antes de pasar a Claude

## Comandos

```bash
# Desarrollo
npm run dev          # Next.js dev server
npm run build        # Build producción
npm run type-check   # tsc --noEmit

# Testing
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E
npm run test:watch   # Vitest en watch mode

# Base de datos
npx supabase db diff          # Generar migración desde cambios locales
npx supabase db push          # Aplicar migraciones
npx supabase gen types typescript  # Regenerar types/database.ts

# Linting
npm run lint         # ESLint
npm run format       # Prettier
```

## Patrones de agentes de IA

Todos los agentes usan **Claude claude-sonnet-4** con Vercel AI SDK para streaming.

```typescript
// Patrón base de un agente
import { streamText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export async function POST(req: Request) {
  const { userId, ...params } = await req.json();
  // SIEMPRE validar que el userId viene del JWT, no del body
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const result = await streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: AGENT_SYSTEM_PROMPT,
    messages: params.messages,
    tools: {
      /* tool calls */
    },
  });
  return result.toDataStreamResponse();
}
```

Los tool calls de los agentes **solo acceden a datos del usuario autenticado.**
Las respuestas se entregan en **streaming** (nunca bloquear esperando respuesta completa).

## Testing

- **Unit** (Vitest): mínimo para todas las utilities financieras y schemas Zod
- **Integration**: flujos auth, importación, CRUD con RLS verificado
- **E2E** (Playwright): happy paths críticos incluyendo Safari/iPhone simulado
- Los mocks de Anthropic API deben simular el streaming (`createDataStreamResponse`)

## CI/CD

- `ci.yml`: type-check → lint → unit tests → build → security scan (npm audit)
- `preview.yml`: CI + deploy Vercel preview + E2E Playwright + Lighthouse
- `production.yml`: CI completo + supabase migrations + deploy + smoke tests + Sentry release
- **Nunca** saltar type-check o lint en CI

## Convención de migraciones SQL

```sql
-- Formato: supabase/migrations/YYYYMMDDHHMMSS_nombre_descriptivo.sql
-- Siempre incluir: tabla, RLS policies, triggers, índices
-- Documentar rollback al inicio del archivo como comentario
-- Rollback: DROP TABLE IF EXISTS ...
```
