import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z
  .object({
    period: z.enum(["month", "quarter", "year"]).default("month"),
    month: z.coerce.number().min(1).max(12).optional(),
    year: z.coerce.number().min(2020).max(2030).optional(),
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

  const { period, month, year } = parsed.data;
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();

  // Calculate date range based on period
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
    // year
    startDate = `${targetYear}-01-01`;
    endDate = `${targetYear + 1}-01-01`;
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("category_id, categories(name, is_income), amount_cents")
    .eq("account_id", account_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .gte("transaction_date", startDate)
    .lt("transaction_date", endDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by category
  const grouped = (data || []).reduce(
    (acc, t) => {
      const catName = t.categories?.name ?? "Sin categoría";
      if (!acc[catName]) acc[catName] = 0;
      acc[catName] += t.amount_cents;
      return acc;
    },
    {} as Record<string, number>,
  );

  const result = Object.entries(grouped).map(([name, total]) => ({
    category: name,
    total_cents: total,
  }));

  return NextResponse.json(result, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
