---
name: market-data-fetcher
description: "Fetch and normalize market price data for stocks, ETFs, and crypto in Patrimio portfolio. Use when an agent or component needs current prices, daily changes, or historical quotes with automatic fallback between Yahoo Finance, Alpha Vantage, and FMP."
argument-hint: "What ticker(s) do you need market data for? (e.g., 'AAPL', 'SAN.MC', 'BTC-EUR')"
---

# Market Data Fetcher

Provides normalized market data for investment positions in Patrimio's portfolio module.

## API Fallback Chain

**Priority:** Yahoo Finance → Alpha Vantage → Financial Modeling Prep → `null` (show stale)

This fallback is transparent to callers — they always get the same `MarketPrice` shape.

## Core Function

```typescript
// lib/market/fetcher.ts
interface MarketPrice {
  ticker: string;
  currentPriceCents: number; // Always in cents
  currency: string; // 'EUR', 'USD', etc.
  change1dPct: number; // e.g., 1.25 for +1.25%
  change1dCents: number; // Change in cents
  lastUpdated: Date;
  source: "yahoo" | "alphavantage" | "fmp" | "cache";
}

export async function getMarketPrice(ticker: string): Promise<MarketPrice | null>;
export async function getMarketPrices(tickers: string[]): Promise<Map<string, MarketPrice>>;
```

## Cache Strategy

Market data is fetched by an Edge Function cron job every 15 minutes and stored in `market_cache` table. Components read from cache, never call external APIs directly.

```typescript
// In Edge Function (supabase/functions/market-updater/index.ts):
// 1. Get all active tickers from investments table
// 2. Batch fetch prices (group by API source limits)
// 3. Upsert into market_cache

// In Next.js app:
// Read from market_cache via Supabase Realtime for live updates
```

## Stale Data Handling

```typescript
const STALE_THRESHOLD_MINUTES = 30;

export function isPriceStale(lastUpdated: Date): boolean {
  const ageMinutes = (Date.now() - lastUpdated.getTime()) / 60000;
  return ageMinutes > STALE_THRESHOLD_MINUTES;
}

// In UI: if isPriceStale, show "Datos desactualizados: HH:MM" badge
```

## Supported Asset Types

| Type        | API Source                   | Notes                       |
| ----------- | ---------------------------- | --------------------------- |
| Stocks (ES) | Yahoo Finance (`.MC` suffix) | e.g., `SAN.MC`, `ITX.MC`    |
| Stocks (US) | Yahoo Finance                | e.g., `AAPL`, `MSFT`        |
| ETFs        | Yahoo Finance                | e.g., `VWRL.L`, `CSPX.L`    |
| Crypto      | CoinGecko                    | e.g., `bitcoin`, `ethereum` |
| Funds       | FMP                          | Spanish ISIN lookup         |

## Currency Normalization

All prices returned in the position's currency. Conversion to EUR for portfolio totals uses rates from Open Exchange Rates (cached daily in Edge Function):

```typescript
export async function normalizeToCurrency(
  prices: MarketPrice[],
  targetCurrency: string,
  rates: ExchangeRates,
): Promise<MarketPrice[]>;
```
