import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z
  .object({
    months: z.coerce.number().min(1).max(24).default(12),
  })
  .strict();

export async function GET(req: Request, { params }: { params: Promise<{ account_id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { account_id } = await params;
  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { months } = parsed.data;

  // Get account initial balance
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("initial_balance_cents")
    .eq("id", account_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (accountError || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  // Get all transactions sorted by date
  const { data, error } = await supabase
    .from("transactions")
    .select("transaction_date, amount_cents, is_income")
    .eq("account_id", account_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .gte("transaction_date", cutoffDate.toISOString().split("T")[0])
    .order("transaction_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate running balance by month
  const monthlyBalances = new Map<string, number>();
  let runningBalance = account.initial_balance_cents;

  // Group transactions by month and calculate cumulative
  (data || []).forEach((t) => {
    const month = t.transaction_date.substring(0, 7); // "2026-04"
    const delta = t.is_income ? t.amount_cents : -t.amount_cents;
    runningBalance += delta;

    // Store the final balance for this month
    monthlyBalances.set(month, runningBalance);
  });

  // Generate array with all months in range
  const result: Array<{ month: string; balance_cents: number }> = [];
  const startDate = new Date(cutoffDate);
  const endDate = new Date();
  let currentBalance = account.initial_balance_cents;

  // Calculate balance at start of period
  const { data: previousTransactions } = await supabase
    .from("transactions")
    .select("amount_cents, is_income")
    .eq("account_id", account_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .lt("transaction_date", cutoffDate.toISOString().split("T")[0]);

  if (previousTransactions) {
    previousTransactions.forEach((t) => {
      const delta = t.is_income ? t.amount_cents : -t.amount_cents;
      currentBalance += delta;
    });
  }

  for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
    const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    const monthBalance = monthlyBalances.get(monthKey);

    if (monthBalance !== undefined) {
      currentBalance = monthBalance;
    }

    result.push({
      month: monthKey,
      balance_cents: currentBalance,
    });
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
