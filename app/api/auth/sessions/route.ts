import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/auth/sessions
 * Returns a subset of user metadata useful for the settings page.
 * Full session listing is not available via Supabase JS SDK admin,
 * so we return last_sign_in_at from user metadata.
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  return NextResponse.json({
    sessions: [
      {
        id: "current",
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? user.created_at,
        ip: null,
        user_agent: null,
        current: true,
      },
    ],
  });
}

/**
 * DELETE /api/auth/sessions
 * Signs out all sessions for the current user.
 */
export async function DELETE(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const admin = createAdminClient();
  const { error: revokeErr } = await admin.auth.admin.signOut(user.id, "global");

  if (revokeErr) {
    return NextResponse.json({ error: "No se pudo cerrar las sesiones." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
