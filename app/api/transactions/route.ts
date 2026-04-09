// GET+POST /api/transactions
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseJsonBody } from "@/lib/http/server";
import { safeString } from "@/lib/validation/safe-zod";
import { listTransactions } from "@/lib/transactions/server";

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

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const search = searchParams.get("search") ?? undefined;
  const category_id = searchParams.get("category_id") ?? undefined;
  const account_id = searchParams.get("account_id") ?? undefined;
  const is_income_param = searchParams.get("is_income");
  const is_income =
    is_income_param === "true" ? true : is_income_param === "false" ? false : undefined;
  const date_from = searchParams.get("date_from") ?? undefined;
  const date_to = searchParams.get("date_to") ?? undefined;
  const amount_min_param = searchParams.get("amount_min_cents");
  const amount_max_param = searchParams.get("amount_max_cents");
  const amount_min_cents = amount_min_param ? parseInt(amount_min_param, 10) : undefined;
  const amount_max_cents = amount_max_param ? parseInt(amount_max_param, 10) : undefined;

  try {
    const result = await listTransactions({
      supabase,
      userId: user.id,
      filters: {
        page,
        limit,
        search,
        category_id,
        account_id,
        is_income,
        date_from,
        date_to,
        amount_min_cents,
        amount_max_cents,
      },
    });
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
