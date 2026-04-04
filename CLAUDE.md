# PATRIMIO — Claude Code Project Instructions

## Visión del Proyecto

**Patrimio** es una aplicación web financiera personal (PWA), diseñada para gestionar patrimonio completo: gastos, ingresos, compromisos futuros, presupuestos e inversiones. Un único usuario propietario, desplegada en Vercel + Supabase, con agentes de IA integrados.

La especificación técnica completa está en **[docs/patrimio-technical-spec.md](./docs/patrimio-technical-spec.md)** — léela antes de cualquier modificación arquitectónica importante.

---

## Stack Tecnológico

| Capa     | Tecnología                                                                      |
| -------- | ------------------------------------------------------------------------------- |
| Frontend | Next.js 14 App Router, React 18, TypeScript 5, Tailwind CSS, shadcn/ui          |
| Estado   | Zustand (global), TanStack Query (server state)                                 |
| Forms    | React Hook Form + Zod                                                           |
| Backend  | Supabase (PostgreSQL 15, Auth JWT+TOTP, Storage, Realtime, Edge Functions Deno) |
| Deploy   | Vercel (Edge Middleware, CDN)                                                   |
| IA       | Anthropic Claude claude-sonnet-4 + Vercel AI SDK                                |
| Testing  | Vitest (unit), Playwright (E2E + Safari/iOS)                                    |

---

## Reglas Críticas — NUNCA Ignorar

### Seguridad (Security First)

1. **RLS en TODA tabla de Supabase** — sin excepciones. Cada tabla nueva necesita política `auth.uid() = user_id`
2. **`service_role` key NUNCA en código cliente** — solo en Edge Functions del servidor
3. **Zod `.strict()`** en todos los schemas de entrada de API routes para prevenir mass assignment
4. **Importes monetarios SIEMPRE en centavos (INTEGER)** — `850.75€ → 85075`. Nunca floats
5. **Soft deletes siempre** — columna `deleted_at TIMESTAMPTZ`, nunca `DELETE` físico
6. **UUID v4** como primary key — nunca integers secuenciales (evita enumeración)
7. **Signed URLs** para Storage — nunca exponer paths directos de archivos
8. **Anthropic API** — los agentes siempre filtran datos por `user_id` del JWT, nunca del body de request

### Typescript

- `strict: true` obligatorio en tsconfig
- Los tipos de BD se generan con `npx supabase gen types typescript` → `types/database.ts`
- Importar tipos de Supabase desde `@/types/database` nunca hardcodear tipos de BD

### Patrones de BD

- Trigger automático para `updated_at` en cada tabla
- Índices en columnas filtradas frecuentemente: `user_id`, `transaction_date`, `category_id`
- Vistas materializadas para aggregations del dashboard (no queries en tiempo real)

---

## Comandos Frecuentes

```bash
# Dev
npm run dev                              # Servidor desarrollo
npm run build && npm run start          # Simular producción en local
npm run type-check                       # tsc --noEmit

# Tests
npm run test                             # Vitest unit
npm run test:watch                       # Vitest interactivo
npm run test:e2e                         # Playwright E2E
npm run test:e2e -- --project=safari-iphone  # Solo tests Safari

# Supabase
npx supabase start                       # Supabase local
npx supabase db diff -f nombre_migración # Crear migración
npx supabase db push                     # Aplicar migraciones
npx supabase gen types typescript --local > types/database.ts  # Regenerar tipos

# Calidad
npm run lint                             # ESLint
npm run format                           # Prettier
npm run lint:fix                         # Auto-fix ESLint
```

---

## Estructura de Directorios

```
patrimio/
├── app/
│   ├── (auth)/              # Login, register, 2FA — sin layout sidebar
│   ├── (app)/               # Rutas autenticadas con layout sidebar
│   │   ├── layout.tsx       # Layout principal con sidebar + header
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── commitments/     # Compromisos recurrentes
│   │   ├── investments/     # Cartera de inversiones
│   │   ├── budgets/
│   │   ├── reports/
│   │   └── settings/
│   └── api/
│       ├── ai/              # Agentes IA (5 endpoints)
│       └── market/          # Proxy cotizaciones con caché
├── components/
│   ├── ui/                  # shadcn/ui base components
│   ├── forms/               # React Hook Form wrappers
│   ├── charts/              # Recharts wrappers temáticos
│   └── ai/                  # UI para respuestas en streaming de agentes
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # createBrowserClient()
│   │   ├── server.ts        # createServerClient()
│   │   └── middleware.ts    # Auth guard en Edge Middleware
│   ├── ai/
│   │   ├── agents/          # Un archivo por agente (5 agentes)
│   │   └── skills/          # Skills compartidas entre agentes
│   ├── financial/
│   │   ├── calculations.ts  # Precio medio, P&L, proyecciones
│   │   ├── formatters.ts    # formatCurrency, formatDate (locale es-ES)
│   │   └── projections.ts   # Flujo de caja, patrimonio neto
│   └── market/
│       └── fetcher.ts       # Yahoo→AlphaVantage→FMP fallback
├── supabase/
│   ├── migrations/          # YYYYMMDDHHMMSS_nombre.sql
│   └── functions/           # market-updater/, generate-recurring/, send-alerts/
├── stores/                  # Zustand stores
├── hooks/                   # Custom hooks React
├── types/
│   ├── database.ts          # GENERADO — no editar manualmente
│   └── financial.ts         # Tipos de dominio financiero
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/                 # playwright.config.ts con devices Safari
```

---

## Agentes de IA

El proyecto tiene 5 agentes Claude integrados en `app/api/ai/` y 3 subagentes de desarrollo:

| Agente              | Endpoint                      | Propósito                                    |
| ------------------- | ----------------------------- | -------------------------------------------- |
| Auto-Categorizer    | `/api/ai/categorize`          | Categorizar transacciones automáticamente    |
| Financial Insights  | `/api/ai/insights`            | Análisis narrativo mensual y alertas         |
| Import Assistant    | `/api/ai/import-assist`       | Guiar importación de extractos complejos     |
| Investment Research | `/api/ai/investment-research` | Contexto y análisis de activos de la cartera |
| Budget Optimizer    | `/api/ai/budget-optimizer`    | Análisis de patrones y presupuestos 50/30/20 |

**Subagentes de desarrollo** (`.github/agents/`): DB Architect · Security Reviewer · **Product Strategist** (análisis de specs, ideas y routing de implementación)

### Patrón de implementación de agente

```typescript
// app/api/ai/[nombre]/route.ts
import { streamText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function POST(req: Request) {
  // 1. Autenticación SIEMPRE desde el JWT, nunca del body
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  // 2. Validar input con Zod strict
  const body = await req.json();
  const input = AgentInputSchema.strict().parse(body);

  // 3. Stream de respuesta con tool calls
  const result = await streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: SYSTEM_PROMPT,
    messages: input.messages,
    tools: {
      // tool calls que SOLO acceden a datos de user.id
    },
  });

  return result.toDataStreamResponse();
}
```

---

## Módulos Funcionales

| ID  | Módulo                                          | Estado Implementación |
| --- | ----------------------------------------------- | --------------------- |
| M0  | Autenticación (Login, 2FA TOTP, Recovery)       | Fase 1                |
| M1  | Dashboard (widgets, patrimonio neto)            | Fase 2                |
| M2  | Transacciones (entrada móvil, filtros, bulk)    | Fase 2                |
| M3  | Importación Extractos (Excel/CSV, bancos ES)    | Fase 4                |
| M4  | Compromisos Futuros (recurrentes, proyección)   | Fase 3                |
| M5  | Inversiones (cartera, cotizaciones, dividendos) | Fase 6                |
| M6  | Presupuestos (alertas, progreso)                | Fase 5                |
| M7  | Informes y Análisis (PDF, Excel export)         | Fase 5                |
| M8  | Configuración y Perfil                          | Fase 2                |

---

## Convenciones de Migración SQL

```sql
-- Nombre: supabase/migrations/YYYYMMDDHHMMSS_descripcion_clara.sql
-- Rollback documentado al inicio:
-- ROLLBACK: DROP TABLE IF EXISTS nueva_tabla CASCADE;

-- Estructura mínima de una tabla nueva:
CREATE TABLE nueva_tabla (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ... campos
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- RLS OBLIGATORIO
ALTER TABLE nueva_tabla ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_nueva_tabla" ON nueva_tabla
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_nueva_tabla" ON nueva_tabla
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_nueva_tabla" ON nueva_tabla
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON nueva_tabla
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

---

## PWA y Optimizaciones iOS/Safari

- `env(safe-area-inset-*)` en el layout principal para iPhone con notch
- `inputMode="decimal"` en todos los campos de importe
- Touch targets mínimo 44×44px (HIG de Apple)
- `overscroll-behavior: contain` en modales y drawers
- Service Worker con estrategia `Network-First` para datos financieros

---

## Tests E2E Safari

```typescript
// playwright.config.ts — configuración obligatoria para iOS
projects: [
  { name: "safari-iphone", use: devices["iPhone 14"] },
  { name: "safari-ipad", use: devices["iPad Pro 11"] },
  { name: "chromium", use: { channel: "chrome" } },
];
```

---

## Lo que Claude NO debe hacer en este proyecto

- ❌ Usar `parseInt` / `parseFloat` para importes monetarios (usar centavos con funciones de `lib/financial/formatters.ts`)
- ❌ Hardcodear el `user_id` o pasarlo en el body de requests de IA (siempre del JWT)
- ❌ Crear endpoints API sin validación Zod
- ❌ Crear tablas de BD sin RLS
- ❌ Usar `localStorage` para datos sensibles (solo cookies HttpOnly)
- ❌ Importar `service_role` key en código del lado cliente
- ❌ Editar `types/database.ts` manualmente (siempre regenerar)
- ❌ Crear migraciones que editen migraciones ya aplicadas (crear nueva migración)
