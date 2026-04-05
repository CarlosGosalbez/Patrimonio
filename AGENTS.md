# PATRIMIO — Codex Agent Instructions

> Leer siempre `docs/patrimio-technical-spec.md` antes de cambios arquitectónicos.
> Stack no negociable: Next.js 14 + Supabase + Claude Sonnet 4.6 + Vercel.

---

## Protocolo de respuesta — obligatorio

| Prohibido                                              | Hacer en su lugar                     |
| ------------------------------------------------------ | ------------------------------------- |
| Saludos / adulación ("¡Claro!", "¡Excelente!")         | Responder directamente                |
| Narrar intención ("Voy a analizar...")                 | Hacer, no anunciar                    |
| Reescribir archivos enteros para cambios de 3-5 líneas | Edits quirúrgicos con contexto mínimo |
| Re-analizar lo ya analizado en la sesión               | Referenciar análisis previo           |
| Afirmar hechos sin verificar                           | Leer el archivo primero               |
| Alternativas cuando hay una respuesta clara            | Una respuesta, la correcta            |
| Concluir resumiendo lo que se acaba de hacer           | Terminar cuando el trabajo esté hecho |
| "¿Necesitas algo más?"                                 | Omitir                                |
| Hedging en hechos conocidos ("quizás", "creo que")     | Afirmar o verificar                   |

---

## Stack

| Capa     | Tecnología                                                                |
| -------- | ------------------------------------------------------------------------- |
| Frontend | Next.js 14 App Router · TypeScript 5 · Tailwind · shadcn/ui               |
| Estado   | Zustand (global) · TanStack Query (server) · React Hook Form + Zod        |
| Backend  | Supabase (PostgreSQL 15 · Auth JWT+TOTP · Storage · Realtime · Edge Deno) |
| Deploy   | Vercel (Edge Middleware · CDN)                                            |
| IA       | Claude Sonnet 4.6 · Vercel AI SDK (streaming)                             |
| Testing  | Vitest (unit) · Playwright (E2E + iPhone 14 + Desktop Chrome)             |

---

## Reglas críticas — NUNCA violar

1. **RLS en toda tabla Supabase** — sin excepciones. `auth.uid() = user_id`
2. **Importes monetarios en centavos INTEGER** — `850.75€ → 85075`. Nunca FLOAT/DECIMAL
3. **Zod `.strict()` en todos los inputs de API routes** — previene mass assignment
4. **`service_role` key solo en Edge Functions Deno del servidor** — nunca en cliente
5. **Soft deletes** — `deleted_at TIMESTAMPTZ`. Nunca DELETE físico
6. **UUID v4 primary keys** — `gen_random_uuid()`. Nunca SERIAL/BIGSERIAL
7. **`user_id` en agentes IA siempre del JWT** — nunca del request body
8. **`types/database.ts` no editar manualmente** — regenerar con `npx supabase gen types typescript`
9. **Signed URLs para Storage** — nunca paths directos ni URLs públicas
10. **`dangerouslySetInnerHTML` siempre con DOMPurify** — nunca sin sanitizar

---

## Modelo y especialistas de IA

**Modelo por defecto:** Claude Sonnet 4.6 — para todas las tareas habituales
**Claude Opus:** solo para errores muy complejos o decisiones de arquitectura con múltiples dependencias

### Equipo de agentes (Codex puede invocar como sub-tareas o como referencia de rol)

| Rol                      | Aplica cuándo                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------ |
| **project-orchestrator** | Cualquier feature multi-capa — analizar impacto en DB + API + UI + tests + seguridad |
| **product-strategist**   | Convertir ideas en spec técnica, planificar sprints, documentar código               |
| **db-architect**         | Cualquier cambio de schema, nueva tabla, índices, triggers                           |
| **security-reviewer**    | Toda nueva API route o migración — verificación OWASP                                |
| **feature-builder**      | Implementar feature completa desde DB hasta E2E                                      |
| **code-reviewer**        | Revisión TypeScript, accesibilidad, rendimiento                                      |

### Checklist por tarea (aplicar siempre)

```
Tarea nueva → Impacta: ¿DB? ¿API? ¿UI? ¿Tests? ¿Seguridad?
DB change → migración + RLS + trigger + índices + regenerar types
API route nueva → Zod .strict() + JWT auth + invocar security-reviewer
Componente nuevo → mobile-first + touch targets ≥44px + inputMode en importes
Tests → ≥1 unit (Vitest) + ≥1 E2E (Playwright iPhone 14)
```

---

## Patrones de código

### DB — Template de migración

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_[tabla].sql
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_[tabla]_updated_at ON [tabla];
--   DROP TABLE IF EXISTS [tabla] CASCADE;
--   DROP TYPE IF EXISTS [enum];

CREATE TABLE [tabla] (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         VARCHAR(200) NOT NULL,
  amount_cents INTEGER      NOT NULL,          -- 850.75€ = 85075
  currency     VARCHAR(3)   NOT NULL DEFAULT 'EUR',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  CONSTRAINT chk_[tabla]_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT chk_[tabla]_name_not_empty  CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX idx_[tabla]_user   ON [tabla](user_id);
CREATE INDEX idx_[tabla]_active ON [tabla](user_id) WHERE deleted_at IS NULL;

ALTER TABLE [tabla] ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_[tabla]" ON [tabla]
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "users_insert_[tabla]" ON [tabla]
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_[tabla]" ON [tabla]
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_[tabla]_updated_at
  BEFORE UPDATE ON [tabla]
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

### FK ON DELETE — Decisión por tipo de relación

| FK target    | ON DELETE | Razón                                           |
| ------------ | --------- | ----------------------------------------------- |
| `auth.users` | CASCADE   | Usuario borrado → todo su patrimonio borrado    |
| `categories` | SET NULL  | La transacción sobrevive sin categoría          |
| `accounts`   | RESTRICT  | No se puede borrar cuenta con registros activos |
| `budgets`    | SET NULL  | Transacciones sobreviven sin presupuesto        |

### API Routes — Patrón base

```typescript
// app/api/[recurso]/route.ts
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import { NextResponse } from "next/server";

const InputSchema = z
  .object({
    // NUNCA incluir user_id aquí — siempre viene del JWT
    amount_cents: z.number().int().positive(),
    description: z.string().max(500).trim(),
  })
  .strict(); // .strict() OBLIGATORIO

export async function POST(req: Request) {
  // 1. Auth del JWT — NUNCA del body
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  // 2. Validar input
  const parsed = InputSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error }, { status: 400 });

  // 3. Query filtrando por user.id del JWT
  const { data, error: dbError } = await supabase
    .from("tabla")
    .insert({ ...parsed.data, user_id: user.id }) // user.id del JWT siempre
    .select()
    .single();

  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

### Agentes IA — Patrón de streaming

```typescript
// app/api/ai/[agente]/route.ts
import { streamText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const AgentInputSchema = z
  .object({
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    ),
  })
  .strict();

export async function POST(req: Request) {
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const input = AgentInputSchema.parse(await req.json());

  const result = await streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: SYSTEM_PROMPT,
    messages: input.messages,
    maxSteps: 8,
    abortSignal: req.signal, // Cancelar si el cliente desconecta
    tools: {
      getTransactions: tool({
        description: "Obtiene transacciones del usuario",
        parameters: z.object({ month: z.number(), year: z.number() }).strict(),
        execute: async ({ month, year }) => {
          // user.id siempre del closure JWT externo — nunca como parámetro
          const { data } = await supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user.id) // ← CRÍTICO: siempre filtrar por user autenticado
            .limit(100);
          return data;
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
```

### Datos financieros

```typescript
// SIEMPRE usar lib/financial/formatters.ts — nunca formatear inline
import {
  formatCurrency,
  centsToDec,
  decToCents,
} from "@/lib/financial/formatters";

// Display: centavos → UI
formatCurrency(85075, "EUR"); // → "850,75 €" (locale es-ES)

// Input usuario: euros → centavos para guardar
decToCents(850.75); // → 85075

// Nunca: amount * 100 (error de float)  ✗
// Nunca: parseFloat(input)              ✗
// Siempre: decToCents(parseFloat(input)) o mejor, inputMode="decimal" + decToCents
```

### UI — Next.js App Router

**RSC vs Client Component:**

| Caso de uso                 | RSC (default)             | Client (`"use client"`)   |
| --------------------------- | ------------------------- | ------------------------- |
| Fetch de datos del servidor | ✅                        | ❌ usar TanStack Query    |
| Estado interactivo / hooks  | ❌                        | ✅                        |
| Supabase con auth           | ✅ `createServerClient()` | Via hooks en `hooks/`     |
| Formularios                 | ❌                        | ✅ React Hook Form        |
| Streaming IA                | ❌                        | ✅ `useChat` de Vercel AI |

**Reglas de componentes:**

- Importes: `inputMode="decimal"`, guardar siempre en centavos
- Touch targets: `min-h-[44px]` — crítico en mobile
- Formateo: siempre `lib/financial/formatters.ts`, nunca inline
- Soft delete en UI: `onDelete` → `PATCH deleted_at`, nunca DELETE

### Tests

```typescript
// Unit (Vitest) — mock Supabase y Anthropic siempre
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "uid-test" } }, error: null }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}));

vi.mock("ai", () => ({
  streamText: vi
    .fn()
    .mockResolvedValue({ toDataStreamResponse: () => new Response("ok") }),
}));
```

```typescript
// E2E (Playwright) — siempre incluir iPhone 14
// playwright.config.ts
projects: [
  { name: "mobile", use: { ...devices["iPhone 14"] } },
  { name: "desktop", use: { ...devices["Desktop Chrome"] } },
],
```

---

## Estructura de directorios (referencia)

```
app/(auth)/          # Login, register, 2FA
app/(app)/           # Rutas autenticadas + sidebar layout
app/api/ai/          # 5 endpoints de agentes IA
lib/supabase/        # client.ts, server.ts, middleware.ts
lib/ai/agents/       # Definición de agentes Claude
lib/financial/       # formatters.ts, calculations.ts, projections.ts
lib/market/          # fetcher.ts (Yahoo→AlphaVantage→FMP con fallback)
supabase/migrations/ # YYYYMMDDHHMMSS_name.sql
supabase/functions/  # market-updater, generate-recurring, send-alerts
types/database.ts    # GENERADO — no editar
types/financial.ts   # Tipos de dominio
```

---

## Comandos de desarrollo

```bash
npm run dev           # Dev server
npm run build         # Build producción
npm run type-check    # tsc --noEmit

npm run test          # Vitest unit tests
npm run test:e2e      # Playwright E2E
npm run lint          # ESLint
npm run format        # Prettier

npx supabase db diff -f migration_name   # Crear migración desde cambios locales
npx supabase db push                     # Aplicar migraciones
npx supabase gen types typescript --local > types/database.ts
```

---

## Auto-verificación tras cambios

Ejecutar en orden después de cualquier implementación:

```bash
npm run type-check   # Sin errores de tipos
npm run lint         # Sin warnings ESLint
npm run test         # Tests unitarios pasan
```

Checklist adicional:

- [ ] Toda tabla nueva tiene `ALTER TABLE X ENABLE ROW LEVEL SECURITY`
- [ ] Toda API route nueva valida con `supabase.auth.getUser()` antes de cualquier lógica
- [ ] Ningún importe monetario usa `float` o `.toFixed()` en cálculos
- [ ] Después de migración: `npx supabase gen types typescript --local > types/database.ts`
- [ ] Datos sensibles (tokens, keys) solo en variables de entorno — nunca en código
