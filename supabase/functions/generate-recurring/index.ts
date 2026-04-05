import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  addFrequency,
  getDueDatesUntil,
  type CommitmentFrequency,
} from "../_shared/date-utils.ts";

interface RecurringCommitmentRow {
  account_id: string;
  amount_cents: number;
  category_id: string | null;
  currency: string;
  deleted_at: string | null;
  description: string | null;
  frequency: CommitmentFrequency;
  id: string;
  is_active: boolean;
  is_automated: boolean;
  is_income: boolean;
  name: string;
  next_due_date: string;
  service_name: string | null;
  user_id: string;
}

function getRunDate(request: Request) {
  const url = new URL(request.url);
  const queryDate = url.searchParams.get("date");

  if (queryDate) {
    return queryDate;
  }

  return new Date().toISOString().slice(0, 10);
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

Deno.serve(async (request) => {
  if (!["GET", "POST"].includes(request.method)) {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const runDate = getRunDate(request);

  const { data: commitments, error: commitmentsError } = await supabase
    .from("recurring_commitments")
    .select(
      "id,user_id,account_id,category_id,name,description,amount_cents,currency,is_income,frequency,next_due_date,is_active,is_automated,service_name,deleted_at",
    )
    .eq("is_active", true)
    .eq("is_automated", true)
    .lte("next_due_date", runDate)
    .is("deleted_at", null)
    .order("next_due_date", { ascending: true });

  if (commitmentsError) {
    return Response.json({ error: commitmentsError.message }, { status: 500 });
  }

  const rows = (commitments ?? []) as RecurringCommitmentRow[];
  let createdTransactions = 0;
  let processedCommitments = 0;

  for (const commitment of rows) {
    const dueDates = getDueDatesUntil(
      commitment.next_due_date,
      commitment.frequency,
      runDate,
    );

    if (!dueDates.length) {
      continue;
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("transactions")
      .select("id,transaction_date")
      .eq("user_id", commitment.user_id)
      .eq("recurring_id", commitment.id)
      .in("transaction_date", dueDates)
      .is("deleted_at", null);

    if (existingError) {
      return Response.json({ error: existingError.message }, { status: 500 });
    }

    const existingDates = new Set(
      (existingRows ?? []).map((row) => row.transaction_date),
    );

    const inserts = dueDates
      .filter((dueDate) => !existingDates.has(dueDate))
      .map((dueDate) => ({
        account_id: commitment.account_id,
        amount_cents: commitment.amount_cents,
        category_id: commitment.category_id,
        currency: commitment.currency,
        description: commitment.service_name ?? commitment.name,
        import_source: "scheduled",
        is_income: commitment.is_income,
        is_recurring_instance: true,
        notes: commitment.description,
        recurring_id: commitment.id,
        transaction_date: dueDate,
        user_id: commitment.user_id,
        value_date: dueDate,
      }));

    if (inserts.length) {
      const { error: insertError } = await supabase.from("transactions").insert(inserts);

      if (insertError) {
        return Response.json({ error: insertError.message }, { status: 500 });
      }

      createdTransactions += inserts.length;
    }

    const lastDueDate = dueDates[dueDates.length - 1]!;
    const nextDueDate = addFrequency(lastDueDate, commitment.frequency);

    const { error: updateError } = await supabase
      .from("recurring_commitments")
      .update({ next_due_date: nextDueDate })
      .eq("id", commitment.id)
      .eq("user_id", commitment.user_id);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    processedCommitments += 1;
  }

  return Response.json({
    createdTransactions,
    processedCommitments,
    runDate,
  });
});
