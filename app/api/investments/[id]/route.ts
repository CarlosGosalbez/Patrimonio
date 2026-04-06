import { NextRequest, NextResponse } from "next/server";
import {
  softDeleteInvestmentPosition,
  updateInvestmentPosition,
} from "@/lib/investments/mutations";
import { investmentPositionPatchSchema } from "@/lib/investments/schemas";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = investmentPositionPatchSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { id } = await params;

  try {
    await updateInvestmentPosition({
      id,
      input: parsed.data,
      supabase,
      userId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    await softDeleteInvestmentPosition({
      id,
      supabase,
      userId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 400 },
    );
  }
}
