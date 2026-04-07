// POST /api/transactions — Create a new transaction (used by quick actions and forms)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseJsonBody } from "@/lib/http/server";
import { safeString } from "@/lib/validation/safe-zod";

const CreateTransactionSchema = z
  .object({
    account_id: z.string().uuid(),
    category_id: z.string().uuid().nullable().optional(),
    amount_cents: z
      .number()
      .int()
      .refine((n) => n !== 0, "amount cannot be zero"),
    description: safeString(500),
    is_income: z.boolean(),
    transaction_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    notes: z
      .string()
      .max(2000)
      .nullish()
      .transform((v) => v ?? null),
  })
  .strict();

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = CreateTransactionSchema.safeParse(body.data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json({ error: firstIssue?.message ?? "Invalid input" }, { status: 400 });
  }

  const { amount_cents, account_id, category_id, description, is_income, transaction_date, notes } =
    parsed.data;

  // Verify account belongs to this user
  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", account_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const { data: transaction, error: dbError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id,
      category_id: category_id ?? null,
      // Ensure sign matches is_income
      amount_cents: is_income ? Math.abs(amount_cents) : -Math.abs(amount_cents),
      description,
      is_income,
      transaction_date: transaction_date ?? new Date().toISOString().split("T")[0],
      notes,
      import_source: "manual",
    })
    .select("id, amount_cents, description, transaction_date, is_income")
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ transaction }, { status: 201 });
}
