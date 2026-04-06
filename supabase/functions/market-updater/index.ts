import { createClient } from "jsr:@supabase/supabase-js@2";

interface MarketCacheUpsert {
  asset_type: string;
  change_cents?: number | null;
  change_percent?: number | null;
  currency: string;
  data_source: string;
  market?: string | null;
  name?: string;
  price_cents: number;
  ticker: string;
  updated_at: string;
  volume?: number | null;
}

interface ActiveTicker {
  currency: string;
  investment_type: string;
  market: string | null;
  name: string;
  ticker: string;
}

interface ExistingMarketRow extends MarketCacheUpsert {}

interface ExchangeRateUpsert {
  base_currency: string;
  data_source: string;
  quote_currency: string;
  rate_value: number;
  updated_at: string;
}

interface AlertTargetRow {
  daily_price_alert_threshold_percent: number | string | null;
  id: string;
  name: string;
  ticker: string;
  user_id: string;
}

async function fetchFromYahoo(ticker: string): Promise<MarketCacheUpsert | null> {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    },
  );

  if (!response.ok) return null;

  const payload = await response.json();
  const meta = payload?.chart?.result?.[0]?.meta;

  if (!meta?.regularMarketPrice) {
    return null;
  }

  const price = Number(meta.regularMarketPrice);
  const previousClose = Number(meta.previousClose ?? meta.chartPreviousClose ?? price);
  const change = price - previousClose;

  return {
    asset_type: "stock",
    change_cents: Math.round(change * 100),
    change_percent:
      previousClose !== 0 ? Number((((change / previousClose) * 100)).toFixed(4)) : 0,
    currency: String(meta.currency ?? "USD").toUpperCase(),
    data_source: "yahoo",
    price_cents: Math.round(price * 100),
    ticker,
    updated_at: new Date().toISOString(),
    volume: meta.regularMarketVolume ?? null,
  };
}

async function fetchFromAlphaVantage(
  ticker: string,
  apiKey: string,
): Promise<MarketCacheUpsert | null> {
  const response = await fetch(
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(apiKey)}`,
    {
      signal: AbortSignal.timeout(5000),
    },
  );

  if (!response.ok) return null;

  const payload = await response.json();
  const quote = payload?.["Global Quote"];

  if (!quote?.["05. price"]) {
    return null;
  }

  return {
    asset_type: "stock",
    change_cents: Math.round(Number.parseFloat(quote["09. change"] ?? "0") * 100),
    change_percent: Number.parseFloat((quote["10. change percent"] ?? "0%").replace("%", "")) || 0,
    currency: "USD",
    data_source: "alphavantage",
    price_cents: Math.round(Number.parseFloat(quote["05. price"]) * 100),
    ticker,
    updated_at: new Date().toISOString(),
    volume: Number.parseInt(quote["06. volume"] ?? "0", 10) || null,
  };
}

async function fetchFromFmp(ticker: string, apiKey: string): Promise<MarketCacheUpsert | null> {
  const response = await fetch(
    `https://financialmodelingprep.com/api/v3/quote-short/${encodeURIComponent(ticker)}?apikey=${encodeURIComponent(apiKey)}`,
    {
      signal: AbortSignal.timeout(5000),
    },
  );

  if (!response.ok) return null;

  const payload = await response.json();
  const quote = Array.isArray(payload) ? payload[0] : null;

  if (!quote?.price) {
    return null;
  }

  return {
    asset_type: "stock",
    change_cents: quote.change != null ? Math.round(Number(quote.change) * 100) : null,
    change_percent: quote.changesPercentage != null ? Number(Number(quote.changesPercentage).toFixed(4)) : null,
    currency: "USD",
    data_source: "fmp",
    price_cents: Math.round(Number(quote.price) * 100),
    ticker,
    updated_at: new Date().toISOString(),
    volume: quote.volume ?? null,
  };
}

async function fetchOpenExchangeRates(appId: string): Promise<ExchangeRateUpsert[]> {
  const response = await fetch(
    `https://openexchangerates.org/api/latest.json?app_id=${encodeURIComponent(appId)}&symbols=EUR`,
    {
      signal: AbortSignal.timeout(5000),
    },
  );

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  const eurRate = Number(payload?.rates?.EUR ?? 0);

  if (!eurRate || eurRate <= 0) {
    return [];
  }

  const updatedAt = new Date().toISOString();

  return [
    {
      base_currency: "USD",
      data_source: "open_exchange_rates",
      quote_currency: "EUR",
      rate_value: eurRate,
      updated_at: updatedAt,
    },
    {
      base_currency: "EUR",
      data_source: "open_exchange_rates",
      quote_currency: "USD",
      rate_value: Number((1 / eurRate).toFixed(8)),
      updated_at: updatedAt,
    },
  ];
}

function normalizeAlertThreshold(value: number | string | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

async function fetchPriceWithFallback({
  alphaVantageKey,
  cached,
  fmpKey,
  ticker,
}: {
  alphaVantageKey?: string;
  cached?: ExistingMarketRow;
  fmpKey?: string;
  ticker: ActiveTicker;
}) {
  const sources = [
    async () => fetchFromYahoo(ticker.ticker),
    async () => (alphaVantageKey ? fetchFromAlphaVantage(ticker.ticker, alphaVantageKey) : null),
    async () => (fmpKey ? fetchFromFmp(ticker.ticker, fmpKey) : null),
  ];

  for (const source of sources) {
    try {
      const result = await source();

      if (result) {
        return {
          data: {
            ...result,
            asset_type: ticker.investment_type,
            currency: ticker.currency,
            market: ticker.market,
            name: ticker.name,
          },
          usedCache: false,
        };
      }
    } catch {
      // Try the next provider.
    }
  }

  if (cached) {
    return {
      data: {
        ...cached,
        data_source: "cache",
      },
      usedCache: true,
    };
  }

  return { data: null, usedCache: false };
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

Deno.serve(async (request) => {
  if (!["GET", "POST"].includes(request.method)) {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const alphaVantageKey = Deno.env.get("ALPHA_VANTAGE_API_KEY") ?? undefined;
  const fmpKey = Deno.env.get("FMP_API_KEY") ?? undefined;
  const openExchangeRatesAppId = Deno.env.get("OPEN_EXCHANGE_RATES_APP_ID") ?? undefined;

  const { data: positions, error: positionsError } = await supabase
    .from("investments")
    .select("ticker,name,investment_type,currency,market")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("ticker", { ascending: true });

  if (positionsError) {
    return Response.json({ error: positionsError.message }, { status: 500 });
  }

  const tickerMap = new Map<string, ActiveTicker>();
  for (const row of (positions ?? []) as ActiveTicker[]) {
    if (!tickerMap.has(row.ticker)) {
      tickerMap.set(row.ticker, row);
    }
  }

  const tickers = Array.from(tickerMap.values());
  if (!tickers.length) {
    return Response.json({ updated: 0, errors: 0, message: "No active tickers" });
  }

  const { data: cachedRows, error: cachedRowsError } = await supabase
    .from("market_cache")
    .select("ticker,name,asset_type,price_cents,currency,change_cents,change_percent,volume,market,data_source,updated_at")
    .in("ticker", tickers.map((ticker) => ticker.ticker));

  if (cachedRowsError) {
    return Response.json({ error: cachedRowsError.message }, { status: 500 });
  }

  const cachedMap = new Map<string, ExistingMarketRow>(
    ((cachedRows ?? []) as ExistingMarketRow[]).map((row) => [row.ticker, row]),
  );

  if (openExchangeRatesAppId) {
    const exchangeRates = await fetchOpenExchangeRates(openExchangeRatesAppId);
    if (exchangeRates.length) {
      const { error: exchangeRateError } = await supabase.from("exchange_rates_cache").upsert(
        exchangeRates,
        {
          ignoreDuplicates: false,
          onConflict: "base_currency,quote_currency",
        },
      );

      if (exchangeRateError) {
        return Response.json({ error: exchangeRateError.message }, { status: 500 });
      }
    }
  }

  const BATCH_SIZE = 10;
  const BATCH_DELAY_MS = 1200;
  let updated = 0;
  let errors = 0;
  let cacheFallbacks = 0;
  let triggeredAlerts = 0;
  const errorList: string[] = [];
  const resolvedMarketMap = new Map<string, MarketCacheUpsert>();

  for (let index = 0; index < tickers.length; index += BATCH_SIZE) {
    const batch = tickers.slice(index, index + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((ticker) =>
        fetchPriceWithFallback({
          alphaVantageKey,
          cached: cachedMap.get(ticker.ticker),
          fmpKey,
          ticker,
        }),
      ),
    );

    const upserts: MarketCacheUpsert[] = [];

    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value.data) {
        errors += 1;
        continue;
      }

      if (result.value.usedCache) {
        cacheFallbacks += 1;
      }

      upserts.push(result.value.data);
      resolvedMarketMap.set(result.value.data.ticker, result.value.data);
    }

    if (upserts.length) {
      const { error: upsertError } = await supabase.from("market_cache").upsert(upserts, {
        ignoreDuplicates: false,
        onConflict: "ticker",
      });

      if (upsertError) {
        errorList.push(upsertError.message);
      } else {
        updated += upserts.length;
      }
    }

    if (index + BATCH_SIZE < tickers.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  const { error: syncError } = await supabase.rpc("sync_investment_prices");
  if (syncError) {
    errorList.push(`sync_investment_prices: ${syncError.message}`);
  }

  const { error: snapshotError } = await supabase.rpc("refresh_investment_snapshots", {
    p_snapshot_date: new Date().toISOString().slice(0, 10),
  });
  if (snapshotError) {
    errorList.push(`refresh_investment_snapshots: ${snapshotError.message}`);
  }

  const { data: alertTargets, error: alertTargetsError } = await supabase
    .from("investments")
    .select("id,user_id,name,ticker,daily_price_alert_threshold_percent")
    .eq("is_active", true)
    .is("deleted_at", null);

  if (alertTargetsError) {
    errorList.push(`price_alerts: ${alertTargetsError.message}`);
  } else {
    const todayKey = new Date().toISOString().slice(0, 10);
    const notifications = ((alertTargets ?? []) as AlertTargetRow[])
      .map((position) => {
        const threshold = normalizeAlertThreshold(
          position.daily_price_alert_threshold_percent,
        );
        const market = resolvedMarketMap.get(position.ticker) ?? cachedMap.get(position.ticker);

        if (!market || market.change_percent == null || !threshold) {
          return null;
        }

        if (Math.abs(market.change_percent) < threshold) {
          return null;
        }

        return {
          event_key: `price-alert:${position.user_id}:${position.ticker}:${todayKey}`,
          message: `${position.ticker} se mueve ${market.change_percent.toFixed(2)}% en la sesión.`,
          severity: Math.abs(market.change_percent) >= threshold * 2 ? "critical" : "warning",
          target_id: position.id,
          target_type: "investment",
          title: `Alerta de precio · ${position.name}`,
          type: "investment_alert",
          user_id: position.user_id,
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value));

    if (notifications.length) {
      const { error: notificationsError } = await supabase.from("notifications").upsert(
        notifications,
        {
          ignoreDuplicates: true,
          onConflict: "user_id,event_key",
        },
      );

      if (notificationsError) {
        errorList.push(`notifications: ${notificationsError.message}`);
      } else {
        triggeredAlerts = notifications.length;
      }
    }
  }

  return Response.json({
    cacheFallbacks,
    error_detail: errorList,
    errors: errors + errorList.length,
    snapshots_refreshed: snapshotError ? 0 : 1,
    total: tickers.length,
    triggeredAlerts,
    updated,
  });
});
