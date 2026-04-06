import { createClient } from "jsr:@supabase/supabase-js@2";

// Types matching market_cache table
interface MarketCacheUpsert {
  ticker: string;
  name?: string;
  asset_type: string;
  price_cents: number;
  currency: string;
  change_cents?: number | null;
  change_percent?: number | null;
  volume?: number | null;
  market?: string | null;
  data_source: string;
  updated_at: string;
}

interface ActiveTicker {
  ticker: string;
  name: string;
  investment_type: string;
  currency: string;
  market: string | null;
}

interface InvestmentSnapshotSourceRow {
  currency: string;
  current_value_cents: number | null;
  total_invested_cents: number;
  user_id: string;
}

// ─── Yahoo Finance ───────────────────────────────────────────────────────────
async function fetchFromYahoo(ticker: string): Promise<MarketCacheUpsert | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;

  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) return null;

  const price = meta.regularMarketPrice as number;
  const prevClose = (meta.previousClose ?? meta.chartPreviousClose ?? price) as number;
  const change = price - prevClose;
  const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
  const currency = (meta.currency ?? "USD") as string;

  // Convert to cents (2 decimal places)
  const priceCents = Math.round(price * 100);
  const changeCents = Math.round(change * 100);

  return {
    ticker,
    price_cents: priceCents,
    currency,
    change_cents: changeCents,
    change_percent: parseFloat(changePct.toFixed(4)),
    volume: meta.regularMarketVolume ?? null,
    data_source: "yahoo",
    asset_type: "stock", // overridden by caller
    updated_at: new Date().toISOString(),
  };
}

// ─── Alpha Vantage ───────────────────────────────────────────────────────────
async function fetchFromAlphaVantage(
  ticker: string,
  apiKey: string,
): Promise<MarketCacheUpsert | null> {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;

  const json = await res.json();
  const quote = json?.["Global Quote"];
  if (!quote?.["05. price"]) return null;

  const price = parseFloat(quote["05. price"]);
  const change = parseFloat(quote["09. change"] ?? "0");
  const changePct = parseFloat((quote["10. change percent"] ?? "0%").replace("%", ""));

  return {
    ticker,
    price_cents: Math.round(price * 100),
    currency: "USD", // AV doesn't provide currency
    change_cents: Math.round(change * 100),
    change_percent: parseFloat(changePct.toFixed(4)),
    volume: parseInt(quote["06. volume"] ?? "0", 10) || null,
    data_source: "alphavantage",
    asset_type: "stock",
    updated_at: new Date().toISOString(),
  };
}

// ─── Financial Modeling Prep ─────────────────────────────────────────────────
async function fetchFromFMP(ticker: string, apiKey: string): Promise<MarketCacheUpsert | null> {
  const url = `https://financialmodelingprep.com/api/v3/quote-short/${encodeURIComponent(ticker)}?apikey=${apiKey}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;

  const json = await res.json();
  const quote = Array.isArray(json) ? json[0] : null;
  if (!quote?.price) return null;

  return {
    ticker,
    price_cents: Math.round(quote.price * 100),
    currency: "USD",
    change_cents: quote.change != null ? Math.round(quote.change * 100) : null,
    change_percent:
      quote.changesPercentage != null
        ? parseFloat(parseFloat(quote.changesPercentage).toFixed(4))
        : null,
    volume: quote.volume ?? null,
    data_source: "fmp",
    asset_type: "stock",
    updated_at: new Date().toISOString(),
  };
}

// ─── Fetch with fallback chain ───────────────────────────────────────────────
async function fetchPrice(
  ticker: ActiveTicker,
  alphaVantageKey: string | undefined,
  fmpKey: string | undefined,
): Promise<{ data: MarketCacheUpsert | null; error: string | null }> {
  // 1. Yahoo Finance (no key needed)
  try {
    const result = await fetchFromYahoo(ticker.ticker);
    if (result) {
      return {
        data: {
          ...result,
          name: ticker.name,
          asset_type: ticker.investment_type,
          currency: ticker.currency,
          market: ticker.market,
        },
        error: null,
      };
    }
  } catch (_e) {
    // continue to next
  }

  // 2. Alpha Vantage
  if (alphaVantageKey) {
    try {
      const result = await fetchFromAlphaVantage(ticker.ticker, alphaVantageKey);
      if (result) {
        return {
          data: {
            ...result,
            name: ticker.name,
            asset_type: ticker.investment_type,
            currency: ticker.currency,
            market: ticker.market,
          },
          error: null,
        };
      }
    } catch (_e) {
      // continue to next
    }
  }

  // 3. Financial Modeling Prep
  if (fmpKey) {
    try {
      const result = await fetchFromFMP(ticker.ticker, fmpKey);
      if (result) {
        return {
          data: {
            ...result,
            name: ticker.name,
            asset_type: ticker.investment_type,
            currency: ticker.currency,
            market: ticker.market,
          },
          error: null,
        };
      }
    } catch (_e) {
      // continue
    }
  }

  return {
    data: null,
    error: `All sources failed for ${ticker.ticker}`,
  };
}

// ─── Main handler ────────────────────────────────────────────────────────────
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

Deno.serve(async (request) => {
  if (!["GET", "POST"].includes(request.method)) {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const alphaVantageKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
  const fmpKey = Deno.env.get("FMP_API_KEY");

  // 1. Get all distinct active tickers
  const { data: positions, error: posError } = await supabase
    .from("investments")
    .select("ticker,name,investment_type,currency,market")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("ticker", { ascending: true });

  if (posError) {
    return Response.json({ error: posError.message }, { status: 500 });
  }

  const rows = (positions ?? []) as ActiveTicker[];

  // Deduplicate tickers (same ticker can appear in multiple user portfolios)
  const tickerMap = new Map<string, ActiveTicker>();
  for (const row of rows) {
    if (!tickerMap.has(row.ticker)) {
      tickerMap.set(row.ticker, row);
    }
  }

  const tickers = Array.from(tickerMap.values());

  if (tickers.length === 0) {
    return Response.json({ updated: 0, errors: 0, message: "No active tickers" });
  }

  // 2. Fetch prices with rate limit awareness
  // Yahoo: ~100/min → batch of 20 with small delay
  // Process in batches of 10 to stay within limits
  const BATCH_SIZE = 10;
  const BATCH_DELAY_MS = 1200; // Stay under Yahoo rate limits

  let updated = 0;
  let errors = 0;
  const errorList: string[] = [];

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((t) => fetchPrice(t, alphaVantageKey, fmpKey)),
    );

    const upserts: MarketCacheUpsert[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.data) {
          upserts.push(result.value.data);
        } else {
          errors++;
          if (result.value.error) errorList.push(result.value.error);
        }
      } else {
        errors++;
        errorList.push(String(result.reason));
      }
    }

    // 3. Upsert batch into market_cache
    if (upserts.length > 0) {
      const { error: upsertError } = await supabase.from("market_cache").upsert(upserts, {
        onConflict: "ticker",
        ignoreDuplicates: false,
      });

      if (upsertError) {
        return Response.json({ error: upsertError.message }, { status: 500 });
      }
      updated += upserts.length;
    }

    // Delay between batches (not after last batch)
    if (i + BATCH_SIZE < tickers.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // 4. Update current_price_cents on investments table from cache
  const { error: syncError } = await supabase.rpc("sync_investment_prices");
  if (syncError) {
    // Non-fatal: log but don't fail the whole function
    errorList.push(`sync_investment_prices: ${syncError.message}`);
  }

  const { data: snapshotSource, error: snapshotSourceError } = await supabase
    .from("investments")
    .select("user_id,total_invested_cents,current_value_cents,currency")
    .eq("is_active", true)
    .is("deleted_at", null);

  if (snapshotSourceError) {
    errorList.push(`investment_snapshots source: ${snapshotSourceError.message}`);
  } else {
    const snapshotDate = new Date().toISOString().slice(0, 10);
    const snapshotByUser = new Map<
      string,
      {
        currency: string;
        total_invested_cents: number;
        total_value_cents: number;
      }
    >();

    for (const row of (snapshotSource ?? []) as InvestmentSnapshotSourceRow[]) {
      if (!snapshotByUser.has(row.user_id)) {
        snapshotByUser.set(row.user_id, {
          currency: row.currency,
          total_invested_cents: 0,
          total_value_cents: 0,
        });
      }

      const entry = snapshotByUser.get(row.user_id)!;
      entry.total_invested_cents += row.total_invested_cents;
      entry.total_value_cents += row.current_value_cents ?? 0;
    }

    if (snapshotByUser.size > 0) {
      const snapshots = Array.from(snapshotByUser.entries()).map(([userId, entry]) => ({
        currency: entry.currency,
        snapshot_date: snapshotDate,
        total_invested_cents: entry.total_invested_cents,
        total_value_cents: entry.total_value_cents,
        unrealized_pl_cents: entry.total_value_cents - entry.total_invested_cents,
        user_id: userId,
      }));

      const { error: snapshotUpsertError } = await supabase
        .from("investment_snapshots")
        .upsert(snapshots, {
          ignoreDuplicates: false,
          onConflict: "user_id,snapshot_date",
        });

      if (snapshotUpsertError) {
        errorList.push(`investment_snapshots upsert: ${snapshotUpsertError.message}`);
      }
    }
  }

  return Response.json({
    updated,
    errors,
    total: tickers.length,
    ...(errorList.length > 0 ? { error_detail: errorList } : {}),
  });
});
