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

## Forms — React Hook Form + Zod

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z
  .object({
    amount: z.number().positive(), // Display value (user types 850.75)
    description: z.string().min(1).max(500),
  })
  .strict();

type FormValues = z.infer<typeof schema>;

export function TransactionForm() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Convert to cents BEFORE sending to API
  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      amount_cents: Math.round(values.amount * 100), // ← cents conversion
    };
    // POST to API
  };
}
```

## TanStack Query Data Fetching

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Query keys are namespaced arrays
export const transactionKeys = {
  all: ["transactions"] as const,
  list: (filters: TransactionFilters) =>
    ["transactions", "list", filters] as const,
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
