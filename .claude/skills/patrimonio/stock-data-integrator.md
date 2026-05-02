# 📈 Skill: Stock Data Integrator

Integración de APIs de mercado de valores con Edge Functions y estrategias de caché.

## Especialización

Integración robusta de market data:

- **APIs bolsa** (Finnhub, Alpha Vantage, IEX Cloud)
- **Edge Functions** (Deno runtime)
- **Caché inteligente** (5min precios, 1day histórico)
- **Rate limiting** (respeto a límites de API)
- **Error handling** (fallbacks entre APIs)

## Tecnologías

- Deno 1.40+ (Edge Functions runtime)
- Finnhub API v1 (primary)
- Alpha Vantage API (fallback)
- Upstash Redis (caché)
- Supabase Edge Functions

## APIs Recomendadas

### Finnhub (Primary)

- **Free Tier:** 60 calls/min
- **Cobertura:** US stocks, crypto, forex
- **Latency:** <100ms
- **Features:** Real-time quotes, company info, news

### Alpha Vantage (Fallback)

- **Free Tier:** 25 calls/day
- **Cobertura:** Global stocks
- **Features:** Historical data, indicators, fundamentals

### IEX Cloud (Opcional)

- **Free Tier:** 50k messages/month
- **Cobertura:** US stocks
- **Features:** Real-time quotes, historical data

## Output Generado

```
supabase/functions/
├── stock-quote/
│   ├── index.ts              # Quote en tiempo real
│   ├── _shared/
│   │   ├── finnhub.ts        # Finnhub client
│   │   ├── cache.ts          # Redis cache layer
│   │   └── types.ts          # TypeScript types
│   └── deno.json
├── stock-historical/
│   └── index.ts              # Datos históricos
└── stock-search/
    └── index.ts              # Buscar símbolos
```

## 1. Edge Function: Stock Quote

```typescript
// supabase/functions/stock-quote/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { FinnhubClient } from "./_shared/finnhub.ts";
import { CacheManager } from "./_shared/cache.ts";
import type { StockQuote } from "./_shared/types.ts";

const CACHE_TTL_SECONDS = 300; // 5 minutos

serve(async (req: Request) => {
  try {
    // CORS headers
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    // Validar autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401 },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    // Verificar usuario autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Parse request
    const { symbol } = await req.json();
    if (!symbol || typeof symbol !== "string") {
      return new Response(JSON.stringify({ error: "Invalid symbol" }), {
        status: 400,
      });
    }

    const symbolUpper = symbol.toUpperCase();

    // Check cache
    const cache = new CacheManager();
    const cachedQuote = await cache.get<StockQuote>(`quote:${symbolUpper}`);
    if (cachedQuote) {
      console.log(`Cache hit for ${symbolUpper}`);
      return new Response(JSON.stringify({ ...cachedQuote, cached: true }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
        },
      });
    }

    // Fetch from Finnhub
    const finnhub = new FinnhubClient(Deno.env.get("FINNHUB_API_KEY") ?? "");
    const quote = await finnhub.getQuote(symbolUpper);

    if (!quote) {
      return new Response(JSON.stringify({ error: "Symbol not found" }), {
        status: 404,
      });
    }

    // Save to cache
    await cache.set(`quote:${symbolUpper}`, quote, CACHE_TTL_SECONDS);

    // Log to Supabase for analytics
    await supabase.from("stock_queries").insert({
      user_id: user.id,
      symbol: symbolUpper,
      query_type: "quote",
      response_time_ms: quote.responseTime,
    });

    return new Response(JSON.stringify({ ...quote, cached: false }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
      },
    });
  } catch (error) {
    console.error("Error in stock-quote function:", error);

    return new Response(
      JSON.stringify({
        error: error.message ?? "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
```

## 2. Finnhub Client

```typescript
// supabase/functions/stock-quote/_shared/finnhub.ts

import type { StockQuote, StockProfile, StockNews } from "./types.ts";

export class FinnhubClient {
  private apiKey: string;
  private baseURL = "https://finnhub.io/api/v1";

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Finnhub API key is required");
    }
    this.apiKey = apiKey;
  }

  /**
   * Get real-time quote for a symbol
   */
  async getQuote(symbol: string): Promise<StockQuote | null> {
    const startTime = Date.now();

    try {
      const response = await fetch(
        `${this.baseURL}/quote?symbol=${symbol}&token=${this.apiKey}`,
        {
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(5000), // 5s timeout
        },
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded");
        }
        throw new Error(`Finnhub API error: ${response.status}`);
      }

      const data = await response.json();

      // Check if valid response
      if (data.c === 0 && data.h === 0 && data.l === 0) {
        return null; // Symbol not found
      }

      const responseTime = Date.now() - startTime;

      return {
        symbol,
        price: data.c, // current price
        change: data.d, // change
        changePercent: data.dp, // change percent
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
        timestamp: data.t * 1000, // Unix timestamp to ms
        responseTime,
        source: "finnhub",
      };
    } catch (error) {
      console.error(`Finnhub getQuote error for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get company profile
   */
  async getProfile(symbol: string): Promise<StockProfile | null> {
    try {
      const response = await fetch(
        `${this.baseURL}/stock/profile2?symbol=${symbol}&token=${this.apiKey}`,
      );

      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.name) {
        return null;
      }

      return {
        symbol: data.ticker,
        name: data.name,
        exchange: data.exchange,
        industry: data.finnhubIndustry,
        logo: data.logo,
        weburl: data.weburl,
        marketCap: data.marketCapitalization,
        shareOutstanding: data.shareOutstanding,
      };
    } catch (error) {
      console.error(`Finnhub getProfile error for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get company news
   */
  async getNews(
    symbol: string,
    from: string,
    to: string,
  ): Promise<StockNews[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${this.apiKey}`,
      );

      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status}`);
      }

      const data = await response.json();

      return data.map((item: any) => ({
        headline: item.headline,
        summary: item.summary,
        source: item.source,
        url: item.url,
        datetime: item.datetime * 1000,
        image: item.image,
      }));
    } catch (error) {
      console.error(`Finnhub getNews error for ${symbol}:`, error);
      throw error;
    }
  }
}
```

## 3. Cache Manager (Redis)

```typescript
// supabase/functions/stock-quote/_shared/cache.ts

import { Redis } from "https://esm.sh/@upstash/redis@1.20.0";

export class CacheManager {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL") ?? "",
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN") ?? "",
    });
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get<T>(key);
      return value;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error("Cache set error:", error);
      // Don't throw - cache failures shouldn't break app
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  }
}
```

## 4. TypeScript Types

```typescript
// supabase/functions/stock-quote/_shared/types.ts

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
  responseTime?: number;
  source: "finnhub" | "alphavantage" | "iex";
}

export interface StockProfile {
  symbol: string;
  name: string;
  exchange: string;
  industry?: string;
  logo?: string;
  weburl?: string;
  marketCap?: number;
  shareOutstanding?: number;
}

export interface StockNews {
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  image?: string;
}

export interface StockHistorical {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

## Client-Side Hook

```typescript
// src/features/portfolio/hooks/useStockQuote.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export const useStockQuote = (symbol: string) => {
  return useQuery({
    queryKey: ["stock-quote", symbol],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("stock-quote", {
        body: { symbol },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!symbol,
    staleTime: 300000, // 5 minutos
    cacheTime: 600000, // 10 minutos
    retry: 2,
  });
};
```

## Cache Strategy

- **Real-time quotes:** 5 minutos TTL
- **Historical data:** 1 día TTL
- **Company profiles:** 1 semana TTL
- **News:** 1 hora TTL

## Rate Limiting

```typescript
// Implementar rate limiting por usuario
const rateLimiter = await supabase
  .from("rate_limits")
  .select("count")
  .eq("user_id", user.id)
  .gte("window_start", new Date(Date.now() - 60000)); // 1 min window

if (rateLimiter.data && rateLimiter.data[0]?.count > 60) {
  return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
    status: 429,
  });
}
```

---

**Versión:** 1.0  
**Actualizado:** 2026-05-02  
**Maintainer:** @patrimonio-orchestrator
