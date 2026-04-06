// app/api/reports/comparison/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generatePeriodComparison } from "@/lib/reports/server";

const ComparisonQuerySchema = z
  .object({
    type: z.enum(["month", "year"]),
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
  const parsed = ComparisonQuerySchema.safeParse({
    type: request.nextUrl.searchParams.get("type") ?? "month",
    month: request.nextUrl.searchParams.get("month") ?? now.getMonth() + 1,
    year: request.nextUrl.searchParams.get("year") ?? now.getFullYear(),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const report = await generatePeriodComparison(
      supabase,
      user.id,
      parsed.data.type,
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
