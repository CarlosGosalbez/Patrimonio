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
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  const { data, error } = await supabase
    .from("transactions")
    .select("transaction_date, is_income, amount_cents")
    .eq("account_id", account_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .gte("transaction_date", cutoffDate.toISOString().split("T")[0]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by month + is_income
  const grouped = (data || []).reduce(
    (acc, t) => {
      const month = t.transaction_date.substring(0, 7); // "2026-04"
      if (!acc[month]) acc[month] = { income: 0, expenses: 0 };
      if (t.is_income) {
        acc[month].income += t.amount_cents;
      } else {
        acc[month].expenses += t.amount_cents;
      }
      return acc;
    },
    {} as Record<string, { income: number; expenses: number }>,
  );

  const result = Object.entries(grouped)
    .map(([month, totals]) => ({
      month,
      income_cents: totals.income,
      expenses_cents: totals.expenses,
      net_cents: totals.income - totals.expenses,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return NextResponse.json(result, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
