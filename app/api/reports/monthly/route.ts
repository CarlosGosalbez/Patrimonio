// app/api/reports/monthly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateMonthlyReport } from "@/lib/reports/server";

const MonthlyQuerySchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2000).max(2100),
  })
  .strict();

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const parsed = MonthlyQuerySchema.safeParse({
    month: request.nextUrl.searchParams.get("month") ?? now.getMonth() + 1,
    year: request.nextUrl.searchParams.get("year") ?? now.getFullYear(),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const report = await generateMonthlyReport(
      supabase,
      user.id,
      parsed.data.month,
      parsed.data.year,
    );
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
