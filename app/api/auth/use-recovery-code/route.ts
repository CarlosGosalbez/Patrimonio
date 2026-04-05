import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BodySchema = z.object({ code: z.string().min(1).max(64) }).strict();

const hashCode = (raw: string) =>
  createHash("sha256").update(raw.trim().toLowerCase()).digest("hex");

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return new Response("Unauthorized", { status: 401 });

  // 2. Validate input
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const codeHash = hashCode(parsed.data.code);

  // 3. Find unused matching code using admin client (bypasses RLS for atomic update)
  const admin = createAdminClient();
  const { data: recovery, error: findError } = await admin
    .from("recovery_codes")
    .select("id")
    .eq("user_id", user.id)
    .eq("code_hash", codeHash)
    .is("used_at", null)
    .single();

  if (findError || !recovery) {
    return NextResponse.json(
      { error: "Código de recuperación inválido o ya usado." },
      { status: 400 },
    );
  }

  // 4. Mark as used
  const { error: updateError } = await admin
    .from("recovery_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", recovery.id)
    .eq("user_id", user.id); // extra safety

  if (updateError) {
    return NextResponse.json({ error: "Error al procesar el código." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
