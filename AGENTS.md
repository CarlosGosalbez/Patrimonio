# PATRIMIO — Codex Agent Instructions

> Config: `.codex/config.toml` — model, approval policy, shell commands, skills, rules.
> Always read `docs/patrimio-technical-spec.md` before architectural changes.
> Non-negotiable stack: Next.js 15 + Supabase + Claude Sonnet 4.6 + Vercel.

---

## Response protocol — required

| Forbidden                                       | Do instead                                  |
| ----------------------------------------------- | ------------------------------------------- |
| Greetings / praise ("¡Claro!", "¡Excelente!")   | Respond directly                            |
| Narrate intent ("I’m going to analyze...")      | Act, don’t announce                         |
| Rewrite entire files for 3-5 line changes       | Surgical edits with minimal context         |
| Re-analyze already-analyzed code in the session | Reference previous analysis                 |
| State unverified facts as true                  | Read the file first                         |
| Alternatives when there is one clear answer     | One answer, the correct one                 |
| Extensive summaries when done                   | Small table (max 5 rows) of completed steps |
| Re-list code written or files created           | Only mention blockers or pending items      |
| "Do you need anything else?"                    | Omit                                        |
| Hedging on known facts ("maybe", "I think")     | Assert or verify                            |

**Required closing format:**

```text
✅ Hecho:
1. [paso completado]
2. [paso completado]

⚠️ Pendiente: [solo si hay blockers]
```

---

## Available skills

Read the corresponding SKILL.md before executing tasks in that domain:

| Skill                         | File                                                  | When to load                            |
| ----------------------------- | ----------------------------------------------------- | --------------------------------------- |
| `supabase-migration`          | `.github/skills/supabase-migration/SKILL.md`          | Any CREATE TABLE, ALTER, RLS, migration |
| `transaction-formatter`       | `.github/skills/transaction-formatter/SKILL.md`       | Formatting amounts or dates in UI       |
| `spanish-finance-categorizer` | `.github/skills/spanish-finance-categorizer/SKILL.md` | Auto-categorization, CSV bank import    |
| `market-data-fetcher`         | `.github/skills/market-data-fetcher/SKILL.md`         | Stock, ETF, crypto prices               |
| `anomaly-detector`            | `.github/skills/anomaly-detector/SKILL.md`            | Alerts, unusual patterns, duplicates    |
| `report-generator`            | `.github/skills/report-generator/SKILL.md`            | PDF/Excel exports, module M7            |
| `context-optimizer`           | `.github/skills/context-optimizer/SKILL.md`           | Session approaching context limit       |

---

## Domain rules (path-scoped)

Auto-loaded based on the file being edited:

| Regla     | Archivo                      | Se aplica en                                     |
| --------- | ---------------------------- | ------------------------------------------------ |
| Security  | `.claude/rules/security.md`  | `app/api/**`, `lib/supabase/**`, `middleware.ts` |
| Database  | `.claude/rules/database.md`  | `supabase/**`, `types/database.ts`               |
| Financial | `.claude/rules/financial.md` | `lib/financial/**`, `types/financial.ts`         |
| Frontend  | `.claude/rules/frontend.md`  | `app/**/*.tsx`, `components/**`, `hooks/**`      |
| AI Agents | `.claude/rules/ai-agents.md` | `app/api/ai/**`, `lib/ai/**`                     |
| Testing   | `.claude/rules/testing.md`   | `tests/**`, `*.test.ts`, `*.spec.ts`             |

---

## Stack

| Layer    | Technology                                                                |
| -------- | ------------------------------------------------------------------------- |
| Frontend | Next.js 15 App Router · TypeScript 5 · Tailwind · shadcn/ui               |
| State    | Zustand (global) · TanStack Query (server) · React Hook Form + Zod        |
| Backend  | Supabase (PostgreSQL 15 · Auth JWT+TOTP · Storage · Realtime · Edge Deno) |
| Deploy   | Vercel (Edge Middleware · CDN)                                            |
| AI       | Claude Sonnet 4.6 · Vercel AI SDK (streaming)                             |
| Testing  | Vitest (unit) · Playwright (E2E + iPhone 14 + Desktop Chrome)             |

---

## Supabase CLI — Remote mode (no Docker required)

Never run `supabase start` — it requires Docker. Always connect to the remote project.

**Required env var** (set in `.env.local`):

```text
SUPABASE_ACCESS_TOKEN=<from https://supabase.com/dashboard/account/tokens>
```

**Link project once** (run from project root):

```bash
npx supabase link --project-ref <your-project-ref>
```

**Correct commands:**

| Task                  | Command                                              |
| --------------------- | ---------------------------------------------------- |
| Apply migrations      | `npm run db:push` (= `supabase db push --linked`)    |
| Generate types        | `npm run db:types` (= `supabase gen types --linked`) |
| Create migration file | `npm run db:diff -f migration_name`                  |
| Preview diff          | `npx supabase db diff --linked`                      |

**Common errors and fixes:**

| Error                | Fix                                                           |
| -------------------- | ------------------------------------------------------------- |
| `Docker not found`   | Never use `supabase start/stop/status` — already in deny list |
| `project not linked` | Run `npx supabase link --project-ref <ref>` once              |
| `types out of date`  | Run `npm run db:types` after every migration                  |
| `Invalid API key`    | Check `SUPABASE_ACCESS_TOKEN` is set in `.env.local`          |
| `permission denied`  | Verify RLS policies include `auth.uid() = user_id`            |

---

## Critical rules — NEVER break

1. **RLS on every Supabase table** — no exceptions. `auth.uid() = user_id`
2. **Monetary amounts as integer cents** — `850.75€ → 85075`. Never FLOAT/DECIMAL
3. **Zod `.strict()` on all API route inputs** — prevents mass assignment
4. **`service_role` key only in server-side Edge Functions** — never in client
5. **Soft deletes** — `deleted_at TIMESTAMPTZ`. Never physical DELETE
6. **UUID v4 primary keys** — `gen_random_uuid()`. Never SERIAL/BIGSERIAL
7. **Agent `user_id` always from JWT** — never from request body
8. **`types/database.ts` never edit manually** — regenerate with `npm run db:types` (Management API, no Docker)
9. **Signed URLs for Storage** — never direct paths or public URLs
10. **`dangerouslySetInnerHTML` always with DOMPurify** — never without sanitization
11. **Never use Docker** — all Supabase operations use remote Management API (`npm run db:push`, `npm run db:types`)
12. **i18n required everywhere** — all UI strings via `next-intl` `useTranslations()`, no hardcoded text
13. **UX/UI via shadcn/ui + Radix + Tailwind v4** — never install MUI/Chakra/AntDesign
14. **Dependencies always current** — verify non-deprecated before use; `@supabase/ssr` not `auth-helpers-nextjs`
15. **WCAG 2.2 AA accessibility required** — every input has `<label htmlFor>` via `useId()`, errors use `role="alert"` + `aria-describedby`, `focus-visible:ring-2` on all interactive elements, never convey state by color alone
16. **Hardened Zod schemas on all forms** — use `safeString()`/`safeName()` helpers with `isomorphic-dompurify`; call `hasPromptInjection()` before any user text reaches LLM

---

## AI model and specialists

**Default model:** Claude Sonnet 4.6 — for all routine tasks
**Claude Opus:** only for very complex bugs or architectural decisions with multiple dependencies

### Agent team (Codex can invoke as sub-tasks or as role reference)

| Role                     | When to invoke                                                               |
| ------------------------ | ---------------------------------------------------------------------------- |
| **project-orchestrator** | Any multi-layer feature — analyze impact on DB + API + UI + tests + security |
| **product-strategist**   | Convert ideas into technical spec, sprint planning, code documentation       |
| **db-architect**         | Any schema change, new table, indexes, triggers                              |
| **security-reviewer**    | Every new API route or migration — OWASP verification                        |
| **feature-builder**      | Implement full feature from DB to E2E                                        |
| **code-reviewer**        | TypeScript review, accessibility, performance                                |

### Task checklist (always apply)

```text
New task → Impacts: DB? API? UI? Tests? Security? i18n?
DB change → migration + RLS + trigger + indexes + regenerate types (npm run db:types)
New API route → Zod .strict() + JWT auth + invoke security-reviewer
New component → mobile-first + touch targets ≥44px + all strings via t() + shadcn/ui
New form → safeString/safeName Zod helpers + useId() labels + role="alert" errors + focus-visible rings
AI route → hasPromptInjection() check before any user text reaches LLM
i18n → extract ALL strings to messages/[locale].json before commit
Dependencies → verify non-deprecated + run npm audit after install
Tests → ≥1 unit (Vitest) + ≥1 E2E (Playwright iPhone 14)
```

---

## i18n — next-intl (required everywhere)

**Library:** `next-intl` — mandatory for all UI text. Never hardcode strings.

```typescript
// Client Component
import { useTranslations } from "next-intl";
const t = useTranslations("transactions");
return <h2>{t("title")}</h2>;  // → messages/es.json: { "transactions": { "title": "..." } }

// Server Component (RSC)
import { getTranslations } from "next-intl/server";
const t = await getTranslations("dashboard");
```

Rules:

- New components: all display strings in `messages/es.json` + `messages/en.json`
- Modified components: migrate hardcoded strings to `t()` as part of the change
- Currency/dates: `formatCurrency()` from `lib/financial/formatters.ts` + `useFormatter()` from next-intl
- DB FTS indexes: specify language explicitly (`to_tsvector('spanish', ...)` or `'simple'` for multilingual)

---

## UI & Design System

**Stack (community gold standard 2024-2026):**

| Library         | Role                                                        |
| --------------- | ----------------------------------------------------------- |
| shadcn/ui       | Component primitives — composable, accessible, customizable |
| Radix UI        | Headless primitives (WCAG 2.2 AA) — used under shadcn/ui    |
| Tailwind CSS v4 | Utility-first styling — zero-runtime, mobile-first          |
| Recharts        | Financial charts — `ResponsiveContainer` required           |
| Lucide React    | Icons — official shadcn/ui icon set, tree-shakeable         |

Rules:

- **Never install** MUI, Chakra UI, Ant Design, or any competitor
- Colors via CSS variables (`--color-primary`) — never hardcoded hex
- `cn()` from `lib/utils.ts` for conditional classes
- Every interactive element: `min-h-[44px]` (Apple HIG minimum)
- Layouts: mobile-first (`sm:` → `md:` → `lg:`) — never desktop-first

---

## Dependency Freshness

Before using any API, prop, or import in new or modified code:

1. Verify it is NOT deprecated in the currently installed version
2. If deprecated, replace with the current correct API — never leave deprecated code
3. After `npm install`, run `npm audit` — fix HIGH/CRITICAL before committing

**Known migration paths:**

- `@supabase/auth-helpers-nextjs` → `@supabase/ssr`
- `next/head` → `metadata` export in `layout.tsx`/`page.tsx`
- `getServerSideProps` / `getStaticProps` → RSC `async` components
- `useRouter` from `next/router` → `useRouter` from `next/navigation`
- `ai/react` useChat import path → verify against installed `ai` package version

---

## Code patterns

> Full patterns with code examples are in the path-scoped instruction files.
> DB/SQL → `.github/instructions/database.instructions.md` ·
> API routes → `.github/instructions/security.instructions.md` ·
> AI agents → `.github/instructions/ai-agents.instructions.md` ·
> Financial → `.github/instructions/financial-logic.instructions.md` ·
> React/UI → `.github/instructions/frontend.instructions.md` ·
> Tests → `.github/instructions/testing.instructions.md`

### Critical quick-reference

**DB:** UUID PK · INTEGER cents · soft delete `deleted_at` · RLS on every table · trigger `moddatetime(updated_at)`

**API:** JWT auth first (`supabase.auth.getUser()`) · Zod `.strict()` on all inputs · `user_id` always from JWT, never from body

**AI:** `model: anthropic("claude-sonnet-4-5")` · `abortSignal: req.signal` · `hasPromptInjection()` before user text reaches LLM

**Finance:** `lib/financial/formatters.ts` always · `decToCents()` / `formatCurrency()` · never `parseFloat` for amounts

**UI:** `shadcn/ui` + `cn()` · `min-h-[44px]` touch targets · `useId()` for form labels · `role="alert"` on errors

---

## Directory structure (reference)

```text
app/(auth)/          # Login, register, 2FA
app/(app)/           # Authenticated routes + sidebar layout
app/api/ai/          # 5 AI agent endpoints
lib/supabase/        # client.ts, server.ts, middleware.ts
lib/ai/agents/       # Claude agent definitions
lib/financial/       # formatters.ts, calculations.ts, projections.ts
lib/market/          # fetcher.ts (Yahoo→AlphaVantage→FMP with fallback)
supabase/migrations/ # YYYYMMDDHHMMSS_name.sql
supabase/functions/  # market-updater, generate-recurring, send-alerts
types/database.ts    # GENERATED — do not edit
types/financial.ts   # Domain types
```

---

## Development commands

```bash
npm run dev           # Dev server
npm run build         # Production build
npm run type-check    # tsc --noEmit

npm run test          # Vitest unit tests
npm run test:e2e      # Playwright E2E
npm run lint          # ESLint
npm run format        # Prettier

npx supabase db diff -f migration_name          # Generate migration from local changes
npx supabase db push --linked                   # Apply migrations (remote, no Docker)
npx supabase gen types typescript --linked > types/database.ts
```
