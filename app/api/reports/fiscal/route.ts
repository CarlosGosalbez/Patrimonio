// app/api/reports/fiscal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { generateFiscalReport } from "@/lib/reports/server";

const FiscalQuerySchema = z
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

  const parsed = FiscalQuerySchema.safeParse({
    year: request.nextUrl.searchParams.get("year") ?? new Date().getFullYear(),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const t = await getTranslations("investments");
    const report = await generateFiscalReport(
      supabase,
      user.id,
      parsed.data.year,
      t("fiscal.disclaimer"),
    );
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
