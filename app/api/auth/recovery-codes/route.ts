import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CODES_COUNT = 10;
const CODE_BYTES = 8; // 16-char hex string

const generateCode = (): string => randomBytes(CODE_BYTES).toString("hex");
const hashCode = (raw: string) =>
  createHash("sha256").update(raw.trim().toLowerCase()).digest("hex");

/**
 * POST /api/auth/recovery-codes
 * Generates 10 new recovery codes, invalidates all previous ones,
 * stores hashed versions in DB, returns plaintext once.
 */
export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return new Response("Unauthorized", { status: 401 });

  const admin = createAdminClient();

  // Soft-delete all existing unused codes for this user
  await admin
    .from("recovery_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("used_at", null);

  // Generate 10 unique codes
  const plaintextCodes: string[] = [];
  const rows = [];

  for (let i = 0; i < CODES_COUNT; i++) {
    const code = generateCode();
    plaintextCodes.push(code);
    rows.push({
      user_id: user.id,
      code_hash: hashCode(code),
    });
  }

  const { error: insertError } = await admin.from("recovery_codes").insert(rows);

  if (insertError) {
    return NextResponse.json({ error: "No se pudieron guardar los códigos." }, { status: 500 });
  }

  return NextResponse.json({ codes: plaintextCodes });
}
