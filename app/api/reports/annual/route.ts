// app/api/reports/annual/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateAnnualReport } from "@/lib/reports/server";

const AnnualQuerySchema = z
  .object({
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

  const parsed = AnnualQuerySchema.safeParse({
    year: request.nextUrl.searchParams.get("year") ?? new Date().getFullYear(),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const report = await generateAnnualReport(supabase, user.id, parsed.data.year);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
