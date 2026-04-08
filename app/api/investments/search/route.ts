import { NextRequest, NextResponse } from "next/server";
import { investmentSearchSchema } from "@/lib/investments/schemas";
import { searchInvestmentTickers } from "@/lib/investments/server";
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

  const parsed = investmentSearchSchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? "6",
    q: request.nextUrl.searchParams.get("q") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const results = await searchInvestmentTickers({
      limit: parsed.data.limit,
      query: parsed.data.q,
      supabase,
    });

    return NextResponse.json({ results });
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 500 },
    );
  }
}
