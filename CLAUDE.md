# PATRIMIO — Claude Code Project Instructions

<!-- ╔══════════════════════════════════════════════════════╗
     ║  CÓMO USAR (para el propietario del proyecto)       ║
     ║  El sistema ya está configurado para trabajar solo.  ║
     ║  Solo describe lo que quieres hacer en español.     ║
     ║                                                      ║
     ║  Ejemplos:                                           ║
     ║  "Quiero añadir el módulo de presupuestos"           ║
     ║  "Hay un error en el login, ayúdame"                 ║
     ║  "Implementa la pantalla de transacciones M2"        ║
     ║  "Estoy en la Phase 1, qué sigue?"                   ║
     ║                                                      ║
     ║  El orquestador planifica, delega a especialistas    ║
     ║  y reporta. No necesitas saber nada técnico.         ║
     ╚══════════════════════════════════════════════════════╝ -->

> Full spec: **docs/patrimio-technical-spec.md** — read before architectural changes.
> Domain rules auto-load via `.claude/rules/` when you touch matching files.
> Available skills: `supabase-migration`, `transaction-formatter`, `spanish-finance-categorizer`, `market-data-fetcher`, `anomaly-detector`, `report-generator`, `context-optimizer`
> **Orchestrators (start here):** `project-orchestrator` (any multi-layer task) · `feature-builder` (full-stack feature end-to-end)
> Available subagents: `db-architect`, `security-reviewer`, `financial-insights`, `auto-categorizer`, `import-assistant`, `investment-research`, `budget-optimizer`, `code-reviewer`

## Stack

| Capa     | Tecnología                                                                |
| -------- | ------------------------------------------------------------------------- |
| Frontend | Next.js 15 App Router · TypeScript 5 · Tailwind · shadcn/ui               |
| Estado   | Zustand (global) · TanStack Query (server) · React Hook Form + Zod        |
| Backend  | Supabase (PostgreSQL 15 · Auth JWT+TOTP · Storage · Realtime · Edge Deno) |
| Deploy   | Vercel (Edge Middleware · CDN)                                            |
| IA       | Claude Sonnet 4.6 · Vercel AI SDK (streaming)                             |
| Testing  | Vitest (unit) · Playwright (E2E + Safari/iOS)                             |

---

## Reglas Críticas (resumen)

Security rules load automatically from `.claude/rules/security.md` when editing `app/api/**` or `lib/supabase/**`.
DB rules load from `.claude/rules/database.md` when editing `supabase/**`.

**Never-break rules:**

1. RLS on every Supabase table — `auth.uid() = user_id`
2. Monetary amounts as integer cents — `850.75€ → 85075`
3. Zod `.strict()` on all API route inputs
4. `service_role` key only in server Edge Functions
5. Soft deletes via `deleted_at TIMESTAMPTZ` — no physical DELETE
6. UUID v4 primary keys
7. Agent `user_id` always from JWT, never from request body
8. `types/database.ts` — never edit manually, regenerate with `npm run db:types` (no Docker)
9. **Never Docker** — all Supabase ops use remote Management API
10. **i18n required** — all UI strings via `next-intl` `useTranslations()`, no hardcoded text
11. **shadcn/ui + Radix + Tailwind v4** — never install MUI/Chakra/AntDesign
12. **Dependencies current** — verify non-deprecated; `@supabase/ssr` not `auth-helpers-nextjs`
13. **WCAG 2.2 AA everywhere** — `useId()` for form IDs, `role="alert"` on errors, `aria-live` for async, `focus-visible:ring-2` on all interactive elements
14. **Hardened Zod on all forms** — `safeString()`/`safeName()` helpers with `isomorphic-dompurify`; `.strict()` on every schema; `hasPromptInjection()` before any user text reaches LLM

---

## Comandos

```bash
npm run dev           # Dev server
npm run type-check    # tsc --noEmit
npm run test          # Vitest unit
npm run test:e2e      # Playwright E2E
npm run lint          # ESLint
npx supabase db diff -f migration_name   # Create migration
npx supabase db push                     # Apply migrations
npm run db:types   # supabase gen types typescript --linked (remote, no Docker)
```

---

## App Modules

| ID  | Module                                     | Phase |
| --- | ------------------------------------------ | ----- |
| M0  | Auth (Login, 2FA TOTP, Recovery)           | 1     |
| M1  | Dashboard (net worth widgets)              | 2     |
| M2  | Transactions (mobile entry, filters)       | 2     |
| M3  | Import (CSV/Excel, Spanish banks)          | 4     |
| M4  | Commitments (recurring, projection)        | 3     |
| M5  | Investments (portfolio, quotes, dividends) | 6     |
| M6  | Budgets (alerts, progress)                 | 5     |
| M7  | Reports (PDF, Excel export)                | 5     |
| M8  | Settings & Profile                         | 2     |

---

## Directory Overview

```text
app/(auth)/          # Login, register, 2FA
app/(app)/           # Authenticated routes + sidebar layout
app/api/ai/          # 5 AI agent endpoints
lib/supabase/        # client.ts, server.ts, middleware.ts
lib/ai/agents/       # Agent definitions
lib/financial/       # formatters.ts, calculations.ts, projections.ts
lib/market/          # fetcher.ts (Yahoo→AlphaVantage→FMP)
supabase/migrations/ # YYYYMMDDHHMMSS_name.sql
supabase/functions/  # market-updater, generate-recurring, send-alerts
types/database.ts    # GENERATED — do not edit
types/financial.ts   # Domain types
.claude/rules/       # Path-scoped rules (auto-load)
.claude/agents/      # Subagent definitions
.claude/skills/      # On-demand skills
```

---

## Context Compaction Note

When compacting, preserve:

- List of modified files not yet committed
- Any pending migration filenames in-progress
- Active subagent delegation state

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
