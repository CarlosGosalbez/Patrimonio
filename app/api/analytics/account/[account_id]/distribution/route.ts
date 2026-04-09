import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z
  .object({
    period: z.enum(["month", "quarter", "year"]).default("month"),
    month: z.coerce.number().min(1).max(12).optional(),
    year: z.coerce.number().min(2020).max(2030).optional(),
    type: z.enum(["expenses", "income", "all"]).default("expenses"),
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

  const { period, month, year, type } = parsed.data;
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();

  // Calculate date range
  let startDate: string;
  let endDate: string;

  if (period === "month") {
    startDate = `${targetYear}-${targetMonth.toString().padStart(2, "0")}-01`;
    const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1;
    const nextYear = targetMonth === 12 ? targetYear + 1 : targetYear;
    endDate = `${nextYear}-${nextMonth.toString().padStart(2, "0")}-01`;
  } else if (period === "quarter") {
    const quarterStartMonth = Math.floor((targetMonth - 1) / 3) * 3 + 1;
    startDate = `${targetYear}-${quarterStartMonth.toString().padStart(2, "0")}-01`;
    const quarterEndMonth = quarterStartMonth + 3;
    const endYear = quarterEndMonth > 12 ? targetYear + 1 : targetYear;
    const endMonth = quarterEndMonth > 12 ? quarterEndMonth - 12 : quarterEndMonth;
    endDate = `${endYear}-${endMonth.toString().padStart(2, "0")}-01`;
  } else {
    startDate = `${targetYear}-01-01`;
    endDate = `${targetYear + 1}-01-01`;
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("category_id, categories(name, is_income), amount_cents, is_income")
    .eq("account_id", account_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .gte("transaction_date", startDate)
    .lt("transaction_date", endDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter by type
  const filtered =
    type === "all"
      ? data || []
      : (data || []).filter((t) => (type === "income" ? t.is_income : !t.is_income));

  // Group by category with percentage
  const grouped = filtered.reduce(
    (acc, t) => {
      const catName = t.categories?.name ?? "Sin categoría";
      if (!acc[catName]) acc[catName] = 0;
      acc[catName] += Math.abs(t.amount_cents); // Use absolute for pie chart
      return acc;
    },
    {} as Record<string, number>,
  );

  const total = Object.values(grouped).reduce((sum, val) => sum + val, 0);

  const result = Object.entries(grouped)
    .map(([name, amount]) => ({
      category: name,
      amount_cents: amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount_cents - a.amount_cents); // Sort by amount descending

  return NextResponse.json(
    { total_cents: total, categories: result },
    {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    },
  );
}
