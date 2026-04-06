# Patrimio

> Gestiona tu patrimonio, gastos e inversiones en un solo lugar — en 3 segundos ves tu situación financiera completa.

[![Security](https://img.shields.io/badge/security-0%20vulnerabilities-brightgreen)](docs/SECURITY.md)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)

---

## Stack

| Capa       | Tecnología                                                                |
| ---------- | ------------------------------------------------------------------------- |
| Frontend   | Next.js 15.5.14 · React 18 · TypeScript 5 · Tailwind CSS v3 · shadcn/ui   |
| Estado     | Zustand (global) · TanStack Query (server) · React Hook Form + Zod        |
| Backend    | Supabase (PostgreSQL 15 · Auth JWT+TOTP · Storage · Realtime · Edge Deno) |
| Deploy     | Vercel (Edge Middleware · CDN · Analytics · Speed Insights)               |
| IA         | Claude Sonnet 4.6 · Vercel AI SDK (streaming)                             |
| Testing    | Vitest (unit) · Playwright (E2E · iPhone 14 · Desktop Chrome)             |
| Monitoring | Sentry                                                                    |

---

## Módulos

| ID  | Módulo                                          | Fase |
| --- | ----------------------------------------------- | ---- |
| M0  | Auth (Login, 2FA TOTP, Recovery)                | 1    |
| M1  | Dashboard (widgets patrimonio neto)             | 2    |
| M2  | Transacciones (entrada móvil, filtros)          | 2    |
| M3  | Importación (CSV/Excel, bancos españoles)       | 4    |
| M4  | Compromisos (recurrentes, proyección)           | 3    |
| M5  | Inversiones (cartera, cotizaciones, dividendos) | 6    |
| M6  | Presupuestos (alertas, progreso)                | 5    |
| M7  | Informes (exportación PDF/Excel)                | 5    |
| M8  | Ajustes y perfil                                | 2    |

---

## Comandos de desarrollo

```bash
# Desarrollo
npm run dev

# Builds y calidad de código
npm run build
npm run type-check   # tsc --noEmit
npm run lint         # ESLint sin warnings
npm run format       # Prettier

# Tests
npm run test         # Vitest (unit)
npm run test:e2e     # Playwright (E2E)

# Base de datos (Supabase remoto — sin Docker)
npm run db:push      # Aplicar migraciones
npm run db:types     # Regenerar types/database.ts
npm run db:diff      # Ver diff pendiente
```

---

## Variables de entorno

Copiar `.env.local.example` a `.env.local` y rellenar:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...         # Solo servidor — nunca en cliente
SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=sntryu_...
SENTRY_ORG=tu-org
SENTRY_PROJECT=patrimio
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...         # Push notifications (PWA)
VAPID_PRIVATE_KEY=...                    # Solo Edge Functions — nunca en cliente
```

---

## Estructura de directorios

```text
app/(auth)/          # Login, registro, 2FA, recuperación
app/(app)/           # Rutas autenticadas + layout con sidebar
app/api/ai/          # 5 agentes IA (streaming)
lib/supabase/        # client.ts, server.ts, middleware.ts
lib/actions/         # Server Actions (auth.ts, locale.ts)
lib/financial/       # formatters.ts, calculations.ts, projections.ts
lib/market/          # fetcher.ts (Yahoo → AlphaVantage → FMP fallback)
lib/validation/      # safe-zod.ts (safeString, safeName, hasPromptInjection)
supabase/migrations/ # YYYYMMDDHHMMSS_nombre.sql
supabase/functions/  # market-updater, generate-recurring, send-alerts
types/database.ts    # GENERADO — no editar manualmente
types/financial.ts   # Tipos de dominio financiero
messages/            # i18n (es.json, en.json)
docs/                # Documentación técnica y seguridad
```

---

## Seguridad

Estado actual: **0 vulnerabilidades** — ver [docs/SECURITY.md](docs/SECURITY.md) para el historial completo y la política de mantenimiento.

Reglas críticas resumidas:

- RLS activado en **todas** las tablas Supabase
- Importes monetarios como **INTEGER centavos** (850.75€ → 85075)
- Zod `.strict()` en **todos** los API routes
- Login via **Server Action** — elimina race condition cookies/middleware
- Soft deletes (`deleted_at`) — nunca DELETE físico
- `user_id` siempre del JWT, nunca del body

---

## Documentación

- [Spec técnica completa](docs/patrimio-technical-spec.md)
- [Fases de desarrollo](docs/PHASES.md)
- [Diagnóstico técnico](docs/DIAGNOSTICO-TECNICO-2026-04-06.md)
- [Política de seguridad](docs/SECURITY.md)
