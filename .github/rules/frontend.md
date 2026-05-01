---
paths:
  - "app/**/*.tsx"
  - "components/**"
  - "hooks/**"
  - "stores/**"
---

# Frontend Rules — Patrimio

## Server vs Client components (Next.js 15 App Router)

| Pattern                         | Use                                          |
| ------------------------------- | -------------------------------------------- |
| `async function Page()`         | Data fetching, auth checks (RSC default)     |
| `'use client'` at top           | Interactivity, hooks, browser APIs           |
| `Suspense` + `loading.tsx`      | Wrap async RSC with skeleton UI              |
| Server Actions (`'use server'`) | Form mutations; NO separate API route needed |

```typescript
// RSC: fetch data server-side, pass to client components
async function TransactionsPage() {
  const supabase = createServerClient();
  const { data } = await supabase.from('transactions').select('*').is('deleted_at', null);
  return <TransactionList initialData={data} />; // client component hydrates
}
```

## Naming & imports

- Components: `PascalCase.tsx` — Hooks: `useXxx.ts` — Utilities: `camelCase.ts`
- Import alias: **`@/` always** (never `../../` relative from root)
- `interface` for component props, `type` for data shapes

## iOS / Safari (PWA constraints)

- Touch targets: minimum **44×44px** (WCAG 2.5.5)
- `inputMode="decimal"` on ALL amount/number inputs (shows numeric iOS keyboard)
- `env(safe-area-inset-*)` in layout CSS for notch/home indicator
- `overscroll-behavior: contain` on modals and drawers
- No `:hover` styles without `@media (hover: hover)` guard
- Test with Playwright `devices['iPhone 14']` and `devices['iPad Pro 11']`

## Forms — React Hook Form + Zod

```typescript
const schema = z.object({
  amount_cents: z.coerce.number().int().positive(), // parse comma-decimal from input
  description: z.string().min(1).max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });
// Display: formatCurrency(amount_cents) — never raw integer
// inputMode="decimal" on the amount field
```

## State management

- **Zustand**: global UI state (sidebar open, active modal, theme)
- **TanStack Query**: ALL server data — never `useState` for remote data
- Optimistic updates: `useMutation` + `onMutate` + `onError` rollback
- Invalidate on success: `queryClient.invalidateQueries({ queryKey: ['transactions'] })`

## Anti-patterns (❌ never do)

- `dangerouslySetInnerHTML` without `DOMPurify.sanitize()`
- `localStorage`/`sessionStorage` for tokens or user data
- Float amounts — always use INTEGER cents
- Direct Supabase calls in components — use custom hooks in `hooks/`
- `useEffect` for data fetching — use TanStack Query
- Missing `key` prop in `.map()` renders
- Inline styles for financial data — use `cn()` with Tailwind variants
