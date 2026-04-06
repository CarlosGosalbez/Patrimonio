import { NextRequest } from "next/server";
import { z } from "zod";
import { buildAnalyticsRange } from "@/lib/analytics/calculations";
import type { AnalyticsPeriod } from "@/lib/analytics/types";
import { createClient } from "@/lib/supabase/server";

const analyticsPeriodSchema = z.enum(["week", "month", "quarter", "year"]);

const exportSelect = `
  transaction_date,
  description,
  amount_cents,
  currency,
  is_income,
  notes,
  account:accounts(name),
  category:categories(name)
`;

function escapeCsvCell(value: string | number | null) {
  const normalized = String(value ?? "");
  return `"${normalized.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsedPeriod = analyticsPeriodSchema.safeParse(
    request.nextUrl.searchParams.get("period") ?? "month",
  );

  if (!parsedPeriod.success) {
    return Response.json({ error: parsedPeriod.error.issues }, { status: 400 });
  }

  const period = parsedPeriod.data as AnalyticsPeriod;
  const range = buildAnalyticsRange(period, new Date());
  const { data, error: queryError } = await supabase
    .from("transactions")
    .select(exportSelect)
    .eq("user_id", user.id)
    .gte("transaction_date", range.start)
    .lte("transaction_date", range.end)
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false });

  if (queryError) {
    return Response.json({ error: queryError.message }, { status: 500 });
  }

  const rows = [
    ["date", "type", "description", "category", "account", "amount_cents", "currency", "notes"],
    ...(data ?? []).map((transaction) => [
      transaction.transaction_date,
      transaction.is_income ? "income" : "expense",
      transaction.description,
      (transaction.category as { name?: string } | null)?.name ?? "",
      (transaction.account as { name?: string } | null)?.name ?? "",
      transaction.is_income ? transaction.amount_cents : -transaction.amount_cents,
      transaction.currency,
      transaction.notes ?? "",
    ]),
  ];

  const csv = rows.map((row) => row.map((value) => escapeCsvCell(value)).join(",")).join("\n");
  // UTF-8 BOM ensures correct rendering of Spanish characters (accents) when opening in Excel
  const BOM = "\uFEFF";

  return new Response(BOM + csv, {
    headers: {
      "Content-Disposition": `attachment; filename="patrimio-${period}-${range.start}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
