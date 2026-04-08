---
description: "Use when writing financial calculations, formatting money, calculating investment P&L, projecting cash flows, computing budgets, or any code that handles monetary amounts. Prevents float errors and enforces cents-based arithmetic."
name: "Financial Logic Guidelines"
applyTo: ["lib/financial/**", "lib/market/**"]
---

# Financial Logic Guidelines — Patrimio

## The Golden Rule: All Amounts in Integer Cents

**Every monetary amount in Patrimio is stored and computed in integer cents (INTEGER).**

```typescript
// CORRECT
const mortgageAmount = 85000; // 850.00 €
const groceries = 4750; // 47.50 €

// WRONG — will cause float precision errors
const mortgageAmount = 850.0;
const groceries = 47.5;
```

## Formatters — lib/financial/formatters.ts

These are the ONLY functions allowed to convert between cents and display:

```typescript
// Convert cents to display string
formatCurrency(cents: number, currency = 'EUR'): string
// → formatCurrency(85075, 'EUR')  →  "850,75 €"

// Parse user input to cents
parseCurrencyInput(input: string): number
// → parseCurrencyInput("850,75")  →  85075
// → parseCurrencyInput("850.75")  →  85075

// Format percent change
formatPercentChange(change: number): string
// → formatPercentChange(12.5)  →  "+12,50%"
// → formatPercentChange(-3.2)  →  "-3,20%"

// Format date (locale es-ES)
formatDate(date: Date | string): string
// → formatDate('2025-12-25')  →  "25/12/2025"

// Format date relative
formatRelativeDate(date: Date | string): string
// → "hace 2 días"
```

Always use `Intl.NumberFormat` with `locale: 'es-ES'` for display, never manual string building.

## Investment Calculations — lib/financial/calculations.ts

### Weighted Average Purchase Price

```typescript
// When user registers a BUY operation:
// newAvgPrice = (existingShares × existingAvgPrice + newShares × newPrice)
//               / (existingShares + newShares)
// All prices in cents, shares as DECIMAL(18,8) for crypto/fractions

function calculateWeightedAvgPrice(
  currentShares: number,
  currentAvgPriceCents: number,
  newShares: number,
  newPriceCents: number,
): number {
  const totalShares = currentShares + newShares;
  return Math.round(
    (currentShares * currentAvgPriceCents + newShares * newPriceCents) / totalShares,
  );
}
```

### Unrealized P&L

```typescript
function calculateUnrealizedPL(
  shares: number,
  currentPriceCents: number,
  avgPurchasePriceCents: number,
): { plCents: number; plPercent: number } {
  const marketValueCents = Math.round(shares * currentPriceCents);
  const costBasisCents = Math.round(shares * avgPurchasePriceCents);
  const plCents = marketValueCents - costBasisCents;
  const plPercent = costBasisCents > 0 ? (plCents / costBasisCents) * 100 : 0;
  return { plCents, plPercent };
}
```

### Expected Annual Dividends

```typescript
function calculateExpectedAnnualDividends(
  shares: number,
  annualDividendPerShareCents: number, // Editable by user
): number {
  return Math.round(shares * annualDividendPerShareCents);
}
```

## Cash Flow Projections — lib/financial/projections.ts

```typescript
// Project recurring commitments N months into the future
function projectCashFlow(
  commitments: RecurringCommitment[],
  startDate: Date,
  months: number,
): CashFlowProjection[]; // { month, incomeCents, expensesCents, balanceCents }[]

// Net worth calculation
function calculateNetWorth(
  accounts: Account[],
  investments: Investment[], // each has current market value
  recurringDebts: RecurringCommitment[], // negative = liabilities
): {
  liquidAssetsCents: number;
  investmentValueCents: number;
  totalDebtsCents: number;
  netWorthCents: number;
};
```

## Market Data — lib/market/fetcher.ts

### API Fallback Chain

```typescript
// Priority: Yahoo Finance → Alpha Vantage → FMP
// On error, fall to next source transparently
async function getMarketPrice(ticker: string): Promise<MarketPrice | null> {
  try {
    return await fetchFromYahoo(ticker);
  } catch {
    try {
      return await fetchFromAlphaVantage(ticker);
    } catch {
      try {
        return await fetchFromFMP(ticker);
      } catch {
        return null; // Return null, never throw — show stale data indicator in UI
      }
    }
  }
}
```

### Market Cache Strategy

- Edge Function `market-updater` runs every 15 minutes (cron)
- Updates `market_cache` table for all active tickers
- Client reads from `market_cache` via Supabase Realtime
- If `last_updated > 30 min`, show "datos desactualizados" indicator
- Never call external market APIs directly from client-side code

## Currency Conversion

Multi-currency positions must convert to base currency (EUR by default) for net worth:

```typescript
// Exchange rates from Open Exchange Rates API (cached in Edge Function)
async function convertToBaseCurrency(
  amountCents: number,
  fromCurrency: string,
  toCurrency: string, // user's base_currency from profiles table
  rates: ExchangeRates,
): Promise<number> {
  if (fromCurrency === toCurrency) return amountCents;
  const rate = rates[fromCurrency] / rates[toCurrency];
  return Math.round(amountCents * rate);
}
```

## Budget Calculations

```typescript
function calculateBudgetStatus(
  budgetCents: number,
  spentCents: number,
  alertThreshold: number, // percentage 0-100
): {
  percentUsed: number;
  remainingCents: number;
  isAlert: boolean;
  isExceeded: boolean;
} {
  const percentUsed = budgetCents > 0 ? (spentCents / budgetCents) * 100 : 0;
  return {
    percentUsed,
    remainingCents: budgetCents - spentCents,
    isAlert: percentUsed >= alertThreshold,
    isExceeded: spentCents > budgetCents,
  };
}
```
