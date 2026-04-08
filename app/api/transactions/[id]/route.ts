// PATCH+DELETE /api/transactions/[id]
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/http/server";
import { safeString } from "@/lib/validation/safe-zod";

const UpdateTransactionSchema = z
  .object({
    account_id: z.string().uuid().optional(),
    category_id: z.string().uuid().nullable().optional(),
    amount_cents: z
      .number()
      .int()
      .refine((n) => n !== 0, "amount cannot be zero")
      .optional(),
    description: safeString(500).optional(),
    is_income: z.boolean().optional(),
    transaction_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    notes: z
      .string()
      .max(2000)
      .nullish()
      .transform((v) => v ?? null)
      .optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
  })
  .strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  const body = await parseJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = UpdateTransactionSchema.safeParse(body.data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json({ error: firstIssue?.message ?? "Invalid input" }, { status: 400 });
  }

  const updates = parsed.data;
  // Ensure amount_cents sign is consistent with is_income
  if (updates.amount_cents !== undefined && updates.is_income !== undefined) {
    updates.amount_cents = updates.is_income
      ? Math.abs(updates.amount_cents)
      : -Math.abs(updates.amount_cents);
  }

  const { data: transaction, error: dbError } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("id, amount_cents, description, transaction_date, is_income")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ transaction });
}

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
