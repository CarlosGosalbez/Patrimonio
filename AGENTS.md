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
| `supabase-migration`          | `.claude/skills/supabase-migration/SKILL.md`          | Any CREATE TABLE, ALTER, RLS, migration |
| `transaction-formatter`       | `.claude/skills/transaction-formatter/SKILL.md`       | Formatting amounts or dates in UI       |
| `spanish-finance-categorizer` | `.claude/skills/spanish-finance-categorizer/SKILL.md` | Auto-categorization, CSV bank import    |
| `market-data-fetcher`         | `.claude/skills/market-data-fetcher/SKILL.md`         | Stock, ETF, crypto prices               |
| `anomaly-detector`            | `.claude/skills/anomaly-detector/SKILL.md`            | Alerts, unusual patterns, duplicates    |
| `report-generator`            | `.claude/skills/report-generator/SKILL.md`            | PDF/Excel exports, module M7            |
| `context-optimizer`           | `.claude/skills/context-optimizer/SKILL.md`           | Session approaching context limit       |

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

### DB — Migration template

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

| FK target    | ON DELETE | Reason                                    |
| ------------ | --------- | ----------------------------------------- |
| `auth.users` | CASCADE   | User deleted → all their data deleted     |
| `categories` | SET NULL  | Transaction survives without category     |
| `accounts`   | RESTRICT  | Cannot delete account with active records |
| `budgets`    | SET NULL  | Transactions survive without budget       |

### API Routes — Base pattern

```typescript
// app/api/[resource]/route.ts
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import { NextResponse } from "next/server";

const InputSchema = z
  .object({
    // NEVER include user_id here — always comes from JWT
    amount_cents: z.number().int().positive(),
    description: z.string().max(500).trim(),
  })
  .strict(); // .strict() REQUIRED

export async function POST(req: Request) {
  // 1. Auth from JWT — NEVER from body
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  // 2. Validate input
  const parsed = InputSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // 3. Query filtered by user.id from JWT
  const { data, error: dbError } = await supabase
    .from("tabla")
    .insert({ ...parsed.data, user_id: user.id }) // user.id always from JWT
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

### AI agents — Streaming pattern

```typescript
// app/api/ai/[agent]/route.ts
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
    abortSignal: req.signal, // Cancel if client disconnects
    tools: {
      getTransactions: tool({
        description: "Fetches user transactions",
        parameters: z.object({ month: z.number(), year: z.number() }).strict(),
        execute: async ({ month, year }) => {
          // user.id always from external JWT closure — never as parameter
          const { data } = await supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user.id) // ← CRITICAL: always filter by authenticated user
            .limit(100);
          return data;
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
```

### Financial data

```typescript
// ALWAYS use lib/financial/formatters.ts — never format inline
import { formatCurrency, centsToDec, decToCents } from "@/lib/financial/formatters";

// Display: cents → UI
formatCurrency(85075, "EUR"); // → "850,75 €" (locale es-ES)

// User input: euros → cents to save
decToCents(850.75); // → 85075

// Never: amount * 100 (float error)  ✗
// Never: parseFloat(input)           ✗
// Always: decToCents(parseFloat(input)) or better, inputMode="decimal" + decToCents
```

### UI — Next.js App Router

**RSC vs Client Component:**

| Use case                  | RSC (default)             | Client (`"use client"`)     |
| ------------------------- | ------------------------- | --------------------------- |
| Server data fetch         | ✅                        | ❌ use TanStack Query       |
| Interactive state / hooks | ❌                        | ✅                          |
| Supabase with auth        | ✅ `createServerClient()` | Via hooks in `hooks/`       |
| Forms                     | ❌                        | ✅ React Hook Form          |
| AI streaming              | ❌                        | ✅ `useChat` from Vercel AI |

**Component rules:**

- Amounts: `inputMode="decimal"`, always save as cents
- Touch targets: `min-h-[44px]` — critical on mobile
- Formatting: always `lib/financial/formatters.ts`, never inline
- Soft delete in UI: `onDelete` → `PATCH deleted_at`, never DELETE

### Tests

```typescript
// Unit (Vitest) — always mock Supabase and Anthropic
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "uid-test" } }, error: null }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}));

vi.mock("ai", () => ({
  streamText: vi.fn().mockResolvedValue({ toDataStreamResponse: () => new Response("ok") }),
}));
```

```typescript
// E2E (Playwright) — always include iPhone 14
// playwright.config.ts
projects: [
  { name: "mobile", use: { ...devices["iPhone 14"] } },
  { name: "desktop", use: { ...devices["Desktop Chrome"] } },
],
```

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

---

## Post-change verification

Run in order after any implementation:

```bash
npm run type-check   # No type errors
npm run lint         # No ESLint warnings
npm run test         # Unit tests pass
```

Additional checklist:

- [ ] Every new table has `ALTER TABLE X ENABLE ROW LEVEL SECURITY`
- [ ] Every new API route validates with `supabase.auth.getUser()` before any logic
- [ ] No monetary amount uses `float` or `.toFixed()` in calculations
- [ ] After migration: `npx supabase gen types typescript --linked > types/database.ts`
- [ ] Sensitive data (tokens, keys) only in environment variables — never in code
