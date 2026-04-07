import { NextRequest, NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createInvestmentPosition } from "@/lib/investments/mutations";
import { investmentExportSchema, investmentPositionInputSchema } from "@/lib/investments/schemas";
import { getInvestmentsOverview } from "@/lib/investments/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = investmentExportSchema.safeParse({
    year: request.nextUrl.searchParams.get("year") ?? new Date().getFullYear(),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const t = await getTranslations("investments");
    const overview = await getInvestmentsOverview({
      irpfDisclaimer: t("fiscal.disclaimer"),
      supabase,
      userId: user.id,
      year: parsed.data.year,
    });

    return NextResponse.json(overview);
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = investmentPositionInputSchema.safeParse(await request.json());

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json({ error: firstIssue?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const investment = await createInvestmentPosition({
      input: parsed.data,
      supabase,
      userId: user.id,
    });

    return NextResponse.json({ investment }, { status: 201 });
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 400 },
    );
  }
}
