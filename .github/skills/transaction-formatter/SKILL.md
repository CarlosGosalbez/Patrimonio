---
name: transaction-formatter
description: "Format transactions and financial data for display in Patrimio UI or for passing as structured context to AI agents. Use for currency formatting in es-ES locale, date formatting, percent change display, and building agent-friendly transaction summaries."
---

# Transaction Formatter

Provides consistent formatting of financial data throughout Patrimio.
All formatting uses **locale `es-ES`** and amounts in **integer cents**.

## Core Formatters (lib/financial/formatters.ts)

### Currency

```typescript
// Format cents to localized currency string
formatCurrency(cents: number, currency = 'EUR', compact = false): string

// Examples:
formatCurrency(85075, 'EUR')         // → "850,75 €"
formatCurrency(85075, 'EUR', true)   // → "850 €" (compact, no decimals)
formatCurrency(0, 'EUR')             // → "0,00 €"
formatCurrency(-5000, 'EUR')         // → "-50,00 €"
formatCurrency(1000000, 'USD')       // → "10.000,00 $"

// Parse user input to cents (handles both comma and dot as decimal)
parseCurrencyInput(input: string): number
parseCurrencyInput("850,75")          // → 85075
parseCurrencyInput("850.75")          // → 85075
parseCurrencyInput("1.234,56")        // → 123456
```

### Dates

```typescript
// Standard date display
formatDate(date: Date | string): string
formatDate('2025-11-25')              // → "25/11/2025"

// Month name + year
formatMonth(date: Date | string): string
formatMonth('2025-11-01')             // → "noviembre 2025"

// Relative (for notifications/recent transactions)
formatRelativeDate(date: Date | string): string
formatRelativeDate(yesterday)         // → "ayer"
formatRelativeDate(3daysAgo)          // → "hace 3 días"
```

### Change / Variation

```typescript
// For displaying P&L, budget usage, spending changes
formatPercentChange(percent: number, decimals = 2): string
formatPercentChange(12.5)             // → "+12,50%"
formatPercentChange(-3.2)             // → "-3,20%"
formatPercentChange(0)                // → "0,00%"

// For AI agent summaries (narrative)
formatChangeNarrative(percent: number): string
formatChangeNarrative(12.5)           // → "un 12,5% más que el mes anterior"
formatChangeNarrative(-3.2)           // → "un 3,2% menos que el mes anterior"
```

## Agent Context Formatter

For building structured text passed to Claude:

```typescript
// Format a single transaction for agent context
formatTransactionForAgent(tx: Transaction): string
// Returns: "25/11/2025 | Gasto | 47,50 € | Mercadona | Alimentación"

// Format transaction list for agent context (respects token limits)
formatTransactionsForAgent(
  transactions: Transaction[],
  maxTokens = 2000
): string
// Returns CSV-like table optimized for Claude understanding

// Format monthly summary for agent context
formatMonthlySummaryForAgent(summary: MonthlySummary): string
// Returns structured summary in natural Spanish
```

## UI Color Classes

```typescript
// Consistent color coding for financial values
getAmountColorClass(amount: number, type: 'income' | 'expense' | 'pl'): string
// income (positive)  → "text-emerald-600 dark:text-emerald-400"
// expense (negative) → "text-red-600 dark:text-red-400"
// pl (profit/loss)   → positive: emerald, negative: red, zero: zinc

// Budget usage colors
getBudgetColorClass(percentUsed: number): string
// < 70%  → "text-emerald-600" (safe)
// 70-90% → "text-amber-600" (warning)
// > 90%  → "text-red-600" (alert)
```
