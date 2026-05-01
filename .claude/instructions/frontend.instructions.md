---
description: "Use when building React components, Next.js pages, layouts, or hooks for Patrimio. Covers component patterns, mobile-first design, iOS/Safari optimizations, PWA features, and financial UI conventions."
name: "Frontend Guidelines"
applyTo: ["app/**", "components/**", "hooks/**", "stores/**"]
---

# Frontend Guidelines — Patrimio

## Component Architecture

### File Structure

```
components/
├── ui/              # shadcn/ui base components (never edit directly)
├── forms/           # React Hook Form wrappers with Zod validation
├── charts/          # Recharts wrappers with Patrimio theme
├── dashboard/       # Dashboard-specific widgets
├── transactions/    # Transaction list, form, filters
├── investments/     # Portfolio components
├── ai/              # Streaming AI response display components
└── [module]/        # Feature-specific components
```

### Component Conventions

```tsx
// PascalCase filename matching the component name
// TransactionCard.tsx
interface TransactionCardProps {
  // interface for component contracts
  transaction: Transaction; // type from @/types/financial for domain types
  onEdit?: (id: string) => void;
}

export function TransactionCard({ transaction, onEdit }: TransactionCardProps) {
  // ...
}
```

## Financial Display

**Always use `lib/financial/formatters.ts` for monetary values:**

```tsx
import { formatCurrency, formatCents } from "@/lib/financial/formatters";

// Display amount
<span>{formatCurrency(transaction.amount_cents, transaction.currency)}</span>;
// → "850,75 €"

// NEVER do manual formatting
// ❌ `${(amount / 100).toFixed(2)} €`
// ✅ formatCurrency(amount, currency)
```

## Forms — React Hook Form + Zod (secure pattern)

**All form fields must be validated client-side AND server-side.** Client validation improves UX; server Zod is the security boundary.

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";
import { useId } from "react";
import { useTranslations } from "next-intl";

// ── Secure field validators (reuse across forms) ───────────────────────────
export const safeString = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => v === DOMPurify.sanitize(v), { message: "Input contains unsafe content" });
export const safeName = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[^<>"'`;\\]+$/);
export const uuidField = z.string().uuid();
export const dateField = z.string().date();

// ── Schema ─────────────────────────────────────────────────────────────────
const TransactionSchema = z
  .object({
    description: safeString(500),
    category_id: uuidField,
    transaction_date: dateField,
  })
  .strict(); // .strict() REQUIRED — rejects unknown fields

type FormValues = z.infer<typeof TransactionSchema>;

// ── Accessible form component ──────────────────────────────────────────────
export function TransactionForm() {
  const t = useTranslations("transactions.form");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(TransactionSchema) });

  const descId = useId();
  const errId = useId();

  const onSubmit = async (values: FormValues) => {
    // amount_cents conversion happens here — NEVER in the schema
    await fetch("/api/transactions", {
      method: "POST",
      body: JSON.stringify(values),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label={t("formLabel")}>
      {/* Every field: label → description → input → error (linked via IDs) */}
      <div className="space-y-1">
        <label htmlFor={descId} className="text-sm font-medium">
          {t("description.label")}
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </label>
        <input
          id={descId}
          type="text"
          aria-required
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? errId : undefined}
          className="focus-visible:ring-2 focus-visible:ring-primary"
          {...register("description")}
        />
        {errors.description && (
          <p id={errId} role="alert" className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {errors.description.message}
          </p>
        )}
      </div>
    </form>
  );
}
```

**Amount input — special pattern (no injection + iOS keyboard + cents):**

```tsx
// Amounts are handled separately: user types "850.75" → sent to API as 85075
const AmountSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+([.,]\d{1,2})?$/, "Invalid format")
    .transform((v) => Math.round(parseFloat(v.replace(",", ".")) * 100)), // → cents
});

<input
  type="text"
  inputMode="decimal" // numeric keyboard on iOS
  pattern="[0-9]*[.,]?[0-9]*" // HTML5 validation hint
  autoComplete="off"
  autoCorrect="off"
  spellCheck={false}
  aria-label={t("amount.label")}
  {...register("amount")}
/>;
```

## TanStack Query Data Fetching

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Query keys are namespaced arrays
export const transactionKeys = {
  all: ["transactions"] as const,
  list: (filters: TransactionFilters) => ["transactions", "list", filters] as const,
  detail: (id: string) => ["transactions", "detail", id] as const,
};

// Optimistic updates for instant UI response
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: createTransaction,
  onMutate: async (newTransaction) => {
    await queryClient.cancelQueries({ queryKey: transactionKeys.all });
    // Optimistically update cache
  },
  onError: (err, newTransaction, context) => {
    // Rollback on error
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: transactionKeys.all });
  },
});
```

## Mobile-First / iOS Safari Optimization

### Safe Area for iPhone notch/island

```tsx
// Root layout must include viewport-fit=cover
// Individual components:
<div className="pb-safe pt-safe px-safe">  {/* Tailwind safe-area utilities */}

// Or in CSS:
paddingBottom: 'env(safe-area-inset-bottom)',
paddingTop: 'env(safe-area-inset-top)',
```

### Touch Targets (minimum 44×44px per Apple HIG)

```tsx
// Buttons must have minimum 44px height
<Button className="min-h-[44px] min-w-[44px]" />

// In Tailwind: use h-11 (44px) as minimum for interactive elements
```

### Numeric keyboard on iOS

```tsx
// Amount inputs must use decimal keyboard on iOS
<Input
  type="text"
  inputMode="decimal" // ← Shows numeric keyboard with decimal on iOS
  pattern="[0-9]*[.,]?[0-9]*"
/>
```

### Scroll and gesture behavior

```tsx
// Modals/drawers: prevent rubber band scroll leak
<div className="overscroll-contain overflow-y-auto">

// Lists with momentum scrolling
<div style={{ WebkitOverflowScrolling: 'touch' }}>

// Remove tap highlight
<button className="[-webkit-tap-highlight-color:transparent]">
```

## Zustand State Management

```tsx
// stores/useFinancialStore.ts
import { create } from "zustand";

interface FinancialState {
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
}

export const useFinancialStore = create<FinancialState>((set) => ({
  selectedMonth: new Date(),
  setSelectedMonth: (date) => set({ selectedMonth: date }),
}));
```

Zustand is for **client UI state** (selected month, sidebar open, etc.) — NOT for financial data (use TanStack Query for server state).

## AI Streaming Responses

```tsx
// Use Vercel AI SDK useChat hook for streaming agent responses
import { useChat } from "ai/react";

export function InsightsPanel() {
  const { messages, isLoading } = useChat({
    api: "/api/ai/insights",
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id} className="prose prose-sm">
          {m.content} {/* Render markdown from Claude */}
        </div>
      ))}
      {isLoading && <TypingIndicator />}
    </div>
  );
}
```

## Recharts — Financial Charts

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/financial/formatters";

// All charts are wrapped in ResponsiveContainer for responsive behavior
// Monetary values in tooltips use formatCurrency
// Colors from Tailwind theme (not hardcoded)
// Dark mode support via CSS variables
```

## Dark Mode

Dark mode is system-driven (`prefers-color-scheme`) plus a manual toggle:

```tsx
// Use Tailwind dark: modifier
<div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">

// Color scheme meta tag in root layout
<meta name="color-scheme" content="dark light" />
```

## RSC vs Client Components

| Caso de uso                             | RSC (default)             | Client (`"use client"`)   |
| --------------------------------------- | ------------------------- | ------------------------- |
| Fetch datos del servidor                | ✅                        | ❌ usar TanStack Query    |
| Estado interactivo (useState/useEffect) | ❌                        | ✅                        |
| Acceso a Supabase con auth              | ✅ `createServerClient()` | Via hooks en `hooks/`     |
| Formularios                             | ❌                        | ✅ React Hook Form        |
| Streaming de IA                         | ❌                        | ✅ `useChat` de Vercel AI |
| Zustand store                           | ❌                        | ✅                        |

**Regla:** empezar con RSC, añadir `"use client"` solo cuando sea necesario.

## Server Actions

Para mutaciones simples (sin streaming), Server Actions sobre API routes:

```typescript
// app/(app)/transactions/actions.ts
"use server";
import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteTransaction(id: string) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/app/transactions");
}
```

---

## Internationalisation (i18n) — next-intl

All UI text MUST go through `next-intl`. Never hardcode strings in components.

### Setup pattern

```typescript
// messages/es.json  — Spanish (default locale for es-ES users)
// messages/en.json  — English fallback
// Locale files live in messages/ at project root

// app/[locale]/layout.tsx (route group wraps all app pages)
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function LocaleLayout({ children, params: { locale } }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

### Usage in components

```tsx
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server"; // RSC

// Client Component
export function TransactionCard() {
  const t = useTranslations("transactions");
  return <h2>{t("title")}</h2>; // messages/es.json → transactions.title
}

// Server Component
export async function Page() {
  const t = await getTranslations("dashboard");
  return <title>{t("meta.title")}</title>;
}
```

### Rules for i18n

- Every new component: extract ALL display strings to message files **before** committing
- Every updated component: migrate existing hardcoded strings to `t()` calls
- Locale files path: `messages/[locale].json` — namespace matches component folder (e.g., `transactions`, `dashboard`)
- Financial values: always format via `formatCurrency(amount, currency)` from `lib/financial/formatters.ts` — NOT via `t()` (currency formatting is handled by the formatter)
- Dates: use `useFormatter()` from `next-intl` with locale `es-ES` by default
- Never use `new Intl.NumberFormat()` or `new Intl.DateTimeFormat()` directly — use `next-intl` formatter hooks

### next-intl middleware

```typescript
// middleware.ts — locale detection
import createMiddleware from "next-intl/middleware";
export default createMiddleware({
  locales: ["es", "en"],
  defaultLocale: "es",
});
export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
```

---

## UI & Design System — shadcn/ui + Radix UI + Tailwind CSS v4

**Primary stack (community-validated 2024-2026):**

| Library         | Purpose                          | Why                                                                       |
| --------------- | -------------------------------- | ------------------------------------------------------------------------- |
| shadcn/ui       | Component primitives             | Composable, accessible, fully customizable — top Next.js ecosystem choice |
| Radix UI        | Headless primitives under shadcn | WCAG 2.2 AA accessible, keyboard navigable, community gold standard       |
| Tailwind CSS v4 | Utility-first styling            | Zero-runtime, mobile-first, co-located styles                             |
| Recharts        | Financial charts                 | React-native, responsive, `ResponsiveContainer` built-in                  |
| Lucide React    | Icons                            | Consistent, tree-shakeable, official shadcn/ui icon set                   |

**Rules:**

- Never install alternative UI libraries (MUI, Ant Design, Chakra) — shadcn/ui replaces them
- Never use inline `style` for layout — use Tailwind classes
- Every chart component wraps in `<ResponsiveContainer width="100%" height={300}>`
- Colors via Tailwind CSS variables (`--color-primary`, `--color-destructive`) — never hardcoded hex
- Dark mode: `dark:` Tailwind variants — never conditional JS class injection
- `cn()` helper from `lib/utils.ts` for conditional class merging (shadcn/ui pattern)

---

## Dependency Freshness Rules

When adding or updating dependencies:

1. **Check for deprecation**: before using any API, prop, or import, verify it's not deprecated in the current version. Check official docs or changelog.
2. **Latest stable versions**: use `npm install [pkg]@latest` for new packages — never pin old versions unless there is a documented incompatibility.
3. **Breaking changes**: when upgrading a major version, scan the changelog for deprecated APIs and update call sites. Never leave deprecated usage after an upgrade.
4. **Peer dependencies**: resolve peer dep warnings immediately — never ignore them.
5. **Security**: run `npm audit` after installing packages. Fix HIGH/CRITICAL advisories before committing.
6. **Known deprecated patterns**:
   - `next/head` → use `metadata` export in `layout.tsx` / `page.tsx` (Next.js 14+)
   - `getServerSideProps` / `getStaticProps` → use RSC with `async` components (App Router)
   - `withRouter` / `useRouter` for navigation in forms → use `useRouter` from `next/navigation` not `next/router`
   - `@supabase/auth-helpers-nextjs` → use `@supabase/ssr` (new package)
   - `useChat` from `ai/react` → verify current import path in installed `ai` version
   - Recharts `<CartesianGrid strokeDasharray>` → still valid; `<Tooltip content>` `renderProps` pattern preferred over deprecated `formatter` prop
