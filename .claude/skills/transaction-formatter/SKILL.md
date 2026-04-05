---
name: transaction-formatter
description: "Format monetary amounts, dates, and financial KPIs for Patrimio UI and AI agents. Covers cents-to-display conversion, es-ES locale, percent change, and agent-friendly text summaries. Use whenever displaying or passing financial data."
user-invocable: false
paths:
  - "lib/financial/**"
  - "components/charts/**"
---

# Transaction Formatter

All formatting goes through `lib/financial/formatters.ts`. **Never format inline.**

## Currency (cents ↔ display)

```typescript
// int cents → localized string
formatCurrency(85075, 'EUR')         // → "850,75 €"
formatCurrency(85075, 'EUR', true)   // → "851 €"  (compact)
formatCurrency(-5000, 'EUR')         // → "-50,00 €"

// Parse user input → cents (handles comma/dot decimals)
parseCurrencyInput("850,75")         // → 85075
parseCurrencyInput("850.75")         // → 85075
parseCurrencyInput("1.234,56")       // → 123456

// NEVER do this:
❌ (amount / 100).toFixed(2)
❌ parseFloat(amount) * 100
```

## Dates (locale es-ES)

```typescript
formatDate('2025-11-25')             // → "25/11/2025"
formatMonth('2025-11-01')            // → "noviembre 2025"
formatRelativeDate(yesterday)        // → "ayer"
formatRelativeDate(3daysAgo)         // → "hace 3 días"
```

## Percent changes (P&L, budget)

```typescript
formatPercentChange(12.5); // → "+12,50%"
formatPercentChange(-3.2); // → "-3,20%"
formatChangeNarrative(12.5); // → "ha aumentado un 12,5%"
formatChangeNarrative(-3.2); // → "ha disminuido un 3,2%"
```

## Agent-friendly summaries

```typescript
// Single transaction for AI context
formatTransactionForAgent(tx); // →
// "MERCADONA · Alimentación · -45,23 € · 25/11/2025"

// Monthly batch summary for Financial Insights agent
formatMonthlyTransactionsForAgent(txs, { year: 2025, month: 11 }); // →
// Returns token-efficient text block, max ~500 tokens per month
// Format: "## noviembre 2025\n- Alimentación: -523,45 € (12 txns)\n..."
```

## Rules

- Always `es-ES` locale for all formatting
- Negative amounts show minus sign (not parentheses)
- Compact mode (`true`) rounds to nearest euro (for charts/tooltips)
- `inputMode="decimal"` on all amount inputs (iOS numeric keyboard)
