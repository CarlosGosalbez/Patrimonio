import { NextRequest, NextResponse } from "next/server";
import { createInvestmentOperation } from "@/lib/investments/mutations";
import { investmentOperationInputSchema } from "@/lib/investments/schemas";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = investmentOperationInputSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { id } = await params;

  try {
    const operation = await createInvestmentOperation({
      input: parsed.data,
      investmentId: id,
      supabase,
      userId: user.id,
    });

    return NextResponse.json({ operation }, { status: 201 });
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 400 },
    );
  }
}
