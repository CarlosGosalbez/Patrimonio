---
paths:
  - "lib/financial/**"
  - "types/financial.ts"
  - "components/charts/**"
---

# Financial Logic Rules — Patrimio

## The single rule: INTEGER CENTS, always

```
DB storage:  850.75 €  →  85075 (INTEGER)
Display:     85075     →  formatCurrency(85075)  →  "850,75 €"
```

**Never use:** `parseFloat`, `Number()`, `Math.round(x * 100)`, `toFixed()`, `DECIMAL`, `NUMERIC`, `FLOAT`

## Formatters — always from `lib/financial/formatters.ts`

```typescript
import {
  formatCurrency,
  centsToEuros,
  eurosToCents,
  formatDate,
  formatPercentChange,
  formatTransactionForAgent,
} from "@/lib/financial/formatters";

// Display
formatCurrency(85075); // → "850,75 €"
formatCurrency(85075, "EUR", true); // → "851 €" (compact, charts)
formatCurrency(-5000); // → "-50,00 €"

// Parse user input (handles both comma and dot decimals)
eurosToCents(850.75); // → 85075
eurosToCents(parseCurrencyInput("850,75")); // safe

// Dates — es-ES locale always
formatDate("2025-11-25"); // → "25/11/2025"
formatMonth("2025-11-01"); // → "noviembre 2025"

// Percent (P&L, budget)
formatPercentChange(12.5); // → "+12,50%"
formatPercentChange(-3.2); // → "-3,20%"
```

## Calculations — safe integer arithmetic only

```typescript
// P&L
const gainLoss_cents = (currentPrice_cents - avgCost_cents) * quantity;

// Average cost (weighted average)
const totalCost_cents = positions.reduce((sum, p) => sum + p.cost_cents, 0);
const avgCost_cents = Math.round(totalCost_cents / totalQuantity); // integer division

// Budget utilization
const utilizationPct = Math.round((spent_cents / budget_cents) * 100);
// 100 = 100%, no floats

// Monthly delta
const deltaPct =
  budget_cents > 0
    ? Math.round(((current_cents - prior_cents) / prior_cents) * 1000) / 10 // 1 decimal
    : 0;
```

## Display rules (UI)

- Negative amounts: red (`text-destructive`) with minus sign — never parentheses
- Positive amounts: green (`text-emerald-600`) with `+` prefix
- `inputMode="decimal"` on ALL amount inputs (triggers numeric iOS keyboard)
- Locale `es-ES` for ALL dates and currency formatting
- Charts: compact mode (`true`) rounds to nearest euro

## Agent context — token-efficient format

```typescript
// Pass to AI agents — never raw DB rows
const summary = formatTransactionForAgent(tx);
// → "MERCADONA · Alimentación · -45,23 € · 25/11/2025"

const monthSummary = formatMonthlyTransactionsForAgent(txs, {
  year: 2025,
  month: 11,
});
// → token-efficient text block, max ~500 tokens per month
```
