import { NextRequest, NextResponse } from "next/server";
import {
  softDeleteInvestmentPosition,
  updateInvestmentPosition,
} from "@/lib/investments/mutations";
import { investmentPositionPatchSchema } from "@/lib/investments/schemas";
import { createClient } from "@/lib/supabase/server";
import { parseJsonBody } from "@/lib/http/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = investmentPositionPatchSchema.safeParse(body.data);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json({ error: firstIssue?.message ?? "Invalid input" }, { status: 400 });
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
