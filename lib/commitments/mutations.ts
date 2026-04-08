import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCurrencyInput } from "@/lib/financial/formatters";
import type { Database } from "@/types/database";
import type { commitmentInputSchema, commitmentPatchSchema } from "@/lib/commitments/schemas";
import type { z } from "zod";

type ServerClient = SupabaseClient<Database>;
type CommitmentInput = z.infer<typeof commitmentInputSchema>;
type CommitmentPatch = z.infer<typeof commitmentPatchSchema>;

export async function createCommitment({
  input,
  supabase,
  userId,
}: {
  input: CommitmentInput;
  supabase: ServerClient;
  userId: string;
}) {
  const amount_cents = parseCurrencyInput(input.amount_input);

  const { data, error } = await supabase
    .from("recurring_commitments")
    .insert({
      account_id: input.account_id,
      advance_notice_days: input.advance_notice_days,
      allows_early_repayment: input.allows_early_repayment,
      amount_cents,
      cancelled_at: input.cancelled_at,
      category_id: input.category_id,
      commitment_type: input.commitment_type,
      currency: input.currency,
      description: input.description,
      end_date: input.end_date,
      frequency: input.frequency,
      interest_rate: input.interest_rate_input,
      is_active: input.is_active,
      is_automated: input.is_automated,
      is_income: input.is_income,
      is_variable_rate: input.is_variable_rate,
      maturity_year: input.maturity_year,
      name: input.name,
      next_due_date: input.next_due_date,
      service_name: input.service_name,
      start_date: input.start_date,
      tolerance_days: input.tolerance_days,
      user_id: userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create commitment");
  }

  return data;
}

export async function updateCommitment({
  id,
  input,
  supabase,
  userId,
}: {
  id: string;
  input: CommitmentPatch;
  supabase: ServerClient;
  userId: string;
}) {
  const payload: Database["public"]["Tables"]["recurring_commitments"]["Update"] = {
    account_id: input.account_id,
    advance_notice_days: input.advance_notice_days,
    allows_early_repayment: input.allows_early_repayment,
    cancelled_at: input.cancelled_at,
    category_id: input.category_id,
    commitment_type: input.commitment_type,
    currency: input.currency,
    description: input.description,
    end_date: input.end_date,
    frequency: input.frequency,
    interest_rate: input.interest_rate_input,
    is_active: input.is_active,
    is_automated: input.is_automated,
    is_income: input.is_income,
    is_variable_rate: input.is_variable_rate,
    maturity_year: input.maturity_year,
    name: input.name,
    next_due_date: input.next_due_date,
    service_name: input.service_name,
    start_date: input.start_date,
    tolerance_days: input.tolerance_days,
  };

  if (input.amount_input) {
    payload.amount_cents = parseCurrencyInput(input.amount_input);
  }

  const { data, error } = await supabase
    .from("recurring_commitments")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update commitment");
  }

  return data;
}

export async function softDeleteCommitment({
  id,
  supabase,
  userId,
}: {
  id: string;
  supabase: ServerClient;
  userId: string;
}) {
  const { error } = await supabase
    .from("recurring_commitments")
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
