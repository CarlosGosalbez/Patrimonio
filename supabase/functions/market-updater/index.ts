// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment#editors-and-ides

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

interface StockPrice {
  c: number; // Current price
  h: number; // High
  l: number; // Low
  o: number; // Open
  pc: number; // Previous close
  t: number; // Timestamp
}

serve(async (req) => {
  try {
    // CORS
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const finnhubApiKey = Deno.env.get("FINNHUB_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all unique tickers from stock_holdings
    const { data: holdings, error: holdingsError } = await supabase
      .from("stock_holdings")
      .select("ticker")
      .is("deleted_at", null);

    if (holdingsError) {
      throw holdingsError;
    }

    const uniqueTickers = [...new Set(holdings?.map((h) => h.ticker) || [])] as string[];

    if (uniqueTickers.length === 0) {
      return new Response(JSON.stringify({ message: "No holdings to update" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch prices from Finnhub
    const pricePromises = uniqueTickers.map(async (ticker) => {
      try {
        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubApiKey}`
        );
        const data: StockPrice = await response.json();

        // Get company profile for dividend info
        const profileResponse = await fetch(
          `https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${finnhubApiKey}`
        );
        const profile = await profileResponse.json();

        return {
          ticker,
          price: data.c,
          currency: "USD",
          market_cap: profile.metric?.marketCapitalization || null,
          pe_ratio: profile.metric?.peBasicExclExtraTTM || null,
          dividend_yield: profile.metric?.dividendYieldIndicatedAnnual
            ? profile.metric.dividendYieldIndicatedAnnual / 100
            : null,
        };
      } catch (error) {
        console.error(`Error fetching ${ticker}:`, error);
        return null;
      }
    });

    const prices = (await Promise.all(pricePromises)).filter((p) => p !== null);

    // Insert prices into stock_prices
    if (prices.length > 0) {
      const { error: insertError } = await supabase.from("stock_prices").insert(prices);

      if (insertError) {
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: prices.length,
        tickers: prices.map((p) => p?.ticker),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
