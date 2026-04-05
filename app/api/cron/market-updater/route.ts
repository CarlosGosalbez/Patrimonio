import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron Job — every 15 minutes
 * Triggers the Supabase Edge Function `market-updater` which fetches current
 * market prices for all active tickers and updates the market_cache table.
 * After updating, it also calls sync_investment_prices() to propagate prices
 * to investment positions.
 *
 * Authorization: Vercel sends `Authorization: Bearer ${CRON_SECRET}` on every cron call.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Missing SUPABASE env vars" }, { status: 500 });
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/market-updater`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const body = await response.text();
    return NextResponse.json(
      { error: "Edge function error", status: response.status, body },
      { status: 500 },
    );
  }

  const data: unknown = await response.json().catch(() => ({}));
  return NextResponse.json({ ok: true, data });
}
