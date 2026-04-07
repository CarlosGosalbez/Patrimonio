import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { optionalNullableString, safeName, safeString } from "@/lib/validation/safe-zod";

const UpdateAccountSchema = z
  .object({
    name: safeName(200).min(1).optional(),
    account_type: z.enum(["checking", "savings", "cash", "credit_card", "investment"]).optional(),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase())
      .optional(),
    bank_name: optionalNullableString(safeString(100)).optional(),
    iban: optionalNullableString(safeString(34)).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .nullable()
      .optional(),
    icon: optionalNullableString(safeString(50)).optional(),
    is_default: z.boolean().optional(),
    is_hidden: z.boolean().optional(),
  })
  .strict();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateAccountSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json({ error: firstIssue?.message ?? "Invalid input" }, { status: 400 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  if (parsed.data.is_default === true) {
    const { error: resetDefaultError } = await supabase
      .from("accounts")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .neq("id", id)
      .is("deleted_at", null);

    if (resetDefaultError) {
      return NextResponse.json({ error: resetDefaultError.message }, { status: 500 });
    }
  }

  const { data: account, error: updateError } = await supabase
    .from("accounts")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select(
      "id,user_id,name,account_type,currency,initial_balance_cents,current_balance_cents,bank_name,iban,color,icon,is_default,is_hidden,created_at,updated_at,deleted_at",
    )
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message || "Database error" }, { status: 500 });
  }

  return NextResponse.json({ account });
}
