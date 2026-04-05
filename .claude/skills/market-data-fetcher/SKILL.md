---
name: market-data-fetcher
description: "Fetch and normalize market price data for stocks, ETFs, and crypto in Patrimio portfolio. Implements the Yahoo Finance → Alpha Vantage → FMP fallback chain with Redis/Supabase cache. Use when building investment components or the market-updater Edge Function."
paths:
  - "lib/market/**"
  - "supabase/functions/market-updater/**"
  - "app/(app)/inversiones/**"
---

# Market Data Fetcher

Normalized market pricing for Patrimio's investment module.

## Architecture

```
Components / Agents
       ↓  (read from cache, subscribe via Realtime)
  market_cache (Supabase table)
       ↑  (write every 15 min)
  market-updater (Edge Function cron)
       ↓  (fallback chain)
  Yahoo Finance → Alpha Vantage → FMP → stale
```

**Components never call external APIs directly.** All price data flows through the cache.

## Core Type

```typescript
// types/financial.ts
interface MarketPrice {
  ticker: string;
  currentPriceCents: number; // Always integer cents
  currency: string; // 'EUR', 'USD'
  change1dPct: number; // e.g., 1.25 = +1.25%
  change1dCents: number;
  lastUpdated: Date;
  source: "yahoo" | "alphavantage" | "fmp" | "cache";
}
```

## Fallback Chain Implementation

```typescript
// lib/market/fetcher.ts
export async function getMarketPrice(
  ticker: string,
): Promise<MarketPrice | null> {
  // 1. Try Yahoo Finance (no API key, rate limit: ~100/min)
  try {
    const price = await fetchFromYahoo(ticker);
    if (price) return normalizeYahoo(price);
  } catch {
    /* continue */
  }

  // 2. Try Alpha Vantage (API key: ALPHA_VANTAGE_KEY, rate limit: 5/min free)
  try {
    const price = await fetchFromAlphaVantage(ticker);
    if (price) return normalizeAlphaVantage(price);
  } catch {
    /* continue */
  }

  // 3. Try Financial Modeling Prep (API key: FMP_API_KEY, rate limit: 250/day free)
  try {
    const price = await fetchFromFMP(ticker);
    if (price) return normalizeFMP(price);
  } catch {
    /* continue */
  }

  return null; // Show stale data in UI
}
```

## Ticker Conventions

| Asset Type           | Format       | Example              |
| -------------------- | ------------ | -------------------- |
| Spanish stocks (BME) | `TICKER.MC`  | `SAN.MC`, `TEF.MC`   |
| US stocks            | `TICKER`     | `AAPL`, `MSFT`       |
| ETFs                 | Standard     | `IWDA.AS`, `SPY`     |
| Crypto (EUR)         | `SYMBOL-EUR` | `BTC-EUR`, `ETH-EUR` |

## Stale Data Display

```typescript
const STALE_THRESHOLD_MIN = 30;

export function isPriceStale(lastUpdated: Date): boolean {
  return (Date.now() - lastUpdated.getTime()) / 60000 > STALE_THRESHOLD_MIN;
}

// In UI: show ⚠️ badge + "Actualizado hace Xh" when stale
```

## Edge Function Pattern

```typescript
// supabase/functions/market-updater/index.ts
// Scheduled: every 15 min (cron: "*/15 * * * *")
// 1. SELECT DISTINCT ticker FROM investment_positions WHERE deleted_at IS NULL
// 2. Batch tickers by API (avoid hitting rate limits)
// 3. UPSERT market_cache ON CONFLICT(ticker) DO UPDATE SET ...
// 4. Never throw on single ticker failure — log and continue
```
