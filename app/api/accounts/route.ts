import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeName, safeString, optionalNullableString } from "@/lib/validation/safe-zod";

const CreateAccountSchema = z
  .object({
    name: safeName(200).min(1),
    account_type: z.enum(["checking", "savings", "cash", "credit_card", "investment"]),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((v) => v.toUpperCase()),
    initial_balance_cents: z.number().int().default(0),
    bank_name: optionalNullableString(safeString(100)),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional()
      .nullable()
      .default(null),
    icon: optionalNullableString(safeString(50)),
    is_default: z.boolean().optional().default(false),
  })
  .strict();

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { data, error: dbError } = await supabase
      .from("accounts")
      .select(
        "id,user_id,name,account_type,currency,initial_balance_cents,current_balance_cents,bank_name,iban,color,icon,is_default,is_hidden,created_at,updated_at,deleted_at",
      )
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (dbError) {
      return NextResponse.json({ error: dbError.message || "Database error" }, { status: 500 });
    }

    return NextResponse.json({ accounts: data ?? [] });
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

  const parsed = CreateAccountSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json({ error: firstIssue?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const { data: account, error: dbError } = await supabase
      .from("accounts")
      .insert({
        ...parsed.data,
        current_balance_cents: parsed.data.initial_balance_cents,
        user_id: user.id,
      })
      .select(
        "id,user_id,name,account_type,currency,initial_balance_cents,current_balance_cents,bank_name,iban,color,icon,is_default,is_hidden,created_at,updated_at,deleted_at",
      )
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message || "Database error" }, { status: 500 });
    }

    return NextResponse.json({ account }, { status: 201 });
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 500 },
    );
  }
}
