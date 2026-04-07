// DELETE /api/transactions/[id] — Soft delete (set deleted_at)
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    const { error: dbError } = await supabase
      .from("transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (dbError)
      return NextResponse.json({ error: dbError.message || "Database error" }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 500 },
    );
  }
}
