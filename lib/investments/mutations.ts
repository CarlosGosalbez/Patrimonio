import { parseCurrencyInput } from "@/lib/financial/formatters";
import {
  calculateOperationTotalCents,
  parseQuantityInput,
  roundQuantity,
} from "@/lib/investments/calculations";
import type { InvestmentRow } from "@/lib/investments/types";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type ServerClient = SupabaseClient<Database>;

function getOptionalThreshold(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value * 10_000) / 10_000;
}

function parseMoneyOrZero(value: unknown) {
  if (typeof value !== "string" || !value) {
    return 0;
  }

  return parseCurrencyInput(value);
}

async function getInvestmentOrThrow({
  id,
  supabase,
  userId,
}: {
  id: string;
  supabase: ServerClient;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("investments")
    .select("id,user_id,ticker,currency,quantity")
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Investment not found");
  }

  return data;
}

async function syncInvestmentFromMarketCache({
  investment,
  supabase,
}: {
  investment: Pick<InvestmentRow, "currency" | "id" | "quantity" | "ticker">;
  supabase: ServerClient;
}) {
  const { data: market, error: marketError } = await supabase
    .from("market_cache")
    .select("price_cents,updated_at")
    .eq("ticker", investment.ticker)
    .maybeSingle();

  if (marketError) {
    throw new Error(marketError.message);
  }

  if (!market) {
    await supabase
      .from("investments")
      .update({
        current_price_cents: null,
        current_value_cents: null,
        last_price_update: null,
      })
      .eq("id", investment.id);

    return;
  }

  const currentValueCents = Math.round(investment.quantity * market.price_cents);

  const { error: updateError } = await supabase
    .from("investments")
    .update({
      current_price_cents: market.price_cents,
      current_value_cents: currentValueCents,
      last_price_update: market.updated_at,
    })
    .eq("id", investment.id);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function createInvestmentPosition({
  input,
  supabase,
  userId,
}: {
  input: Record<string, unknown>;
  supabase: ServerClient;
  userId: string;
}) {
  const openingQuantity = parseQuantityInput(String(input.opening_quantity_input));
  const openingPriceCents = parseCurrencyInput(String(input.opening_price_input));
  const annualDividendPerShareCents = parseCurrencyInput(
    String(input.annual_dividend_per_share_input ?? "0"),
  );
  const openingTotalCents = calculateOperationTotalCents({
    feeCents: 0,
    operationType: "buy",
    priceCents: openingPriceCents,
    quantity: openingQuantity,
  });

  const insertPayload: Database["public"]["Tables"]["investments"]["Insert"] = {
    account_id: input.account_id ? String(input.account_id) : null,
    annual_dividend_per_share_cents: annualDividendPerShareCents,
    avg_purchase_price_cents: openingPriceCents,
    currency: "currency" in input && typeof input.currency === "string" ? input.currency : "EUR",
    daily_price_alert_threshold_percent: getOptionalThreshold(
      input.daily_price_alert_threshold_percent as number | null | undefined,
    ),
    dividend_frequency:
      typeof input.dividend_frequency === "string"
        ? (input.dividend_frequency as Database["public"]["Enums"]["frequency_type"])
        : "annual",
    investment_type: input.investment_type as Database["public"]["Enums"]["investment_type"],
    market: (input.market as string | null | undefined) ?? null,
    name: String(input.name),
    next_dividend_date: (input.next_dividend_date as string | null | undefined) ?? null,
    notes: (input.notes as string | null | undefined) ?? null,
    quantity: roundQuantity(openingQuantity),
    sector: (input.sector as string | null | undefined) ?? null,
    ticker: String(input.ticker),
    total_invested_cents: openingTotalCents,
    user_id: userId,
  };

  const { data: investment, error: investmentError } = await supabase
    .from("investments")
    .insert(insertPayload)
    .select("id,user_id,ticker,currency,quantity")
    .single();

  if (investmentError) {
    throw new Error(investmentError.message);
  }

  const { error: operationError } = await supabase.from("investment_operations").insert({
    currency: insertPayload.currency,
    fee_cents: 0,
    investment_id: investment.id,
    notes: null,
    operation_date: String(input.opening_date),
    operation_type: "buy",
    price_cents: openingPriceCents,
    quantity: openingQuantity,
    total_cents: openingTotalCents,
    user_id: userId,
  });

  if (operationError) {
    await supabase
      .from("investments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", investment.id);

    throw new Error(operationError.message);
  }

  const { error: recalcError } = await supabase.rpc("recalculate_avg_purchase_price", {
    p_investment_id: investment.id,
  });

  if (recalcError) {
    throw new Error(recalcError.message);
  }

  await syncInvestmentFromMarketCache({ investment, supabase });

  return investment;
}

export async function updateInvestmentPosition({
  id,
  input,
  supabase,
  userId,
}: {
  id: string;
  input: Record<string, unknown>;
  supabase: ServerClient;
  userId: string;
}) {
  const existing = await getInvestmentOrThrow({ id, supabase, userId });

  const updatePayload: Database["public"]["Tables"]["investments"]["Update"] = {};

  if ("account_id" in input) updatePayload.account_id = input.account_id as string;
  if ("currency" in input) updatePayload.currency = String(input.currency);
  if ("investment_type" in input) {
    updatePayload.investment_type =
      input.investment_type as Database["public"]["Enums"]["investment_type"];
  }
  if ("market" in input) updatePayload.market = (input.market as string | null | undefined) ?? null;
  if ("name" in input) updatePayload.name = String(input.name);
  if ("next_dividend_date" in input) {
    updatePayload.next_dividend_date =
      (input.next_dividend_date as string | null | undefined) ?? null;
  }
  if ("notes" in input) updatePayload.notes = (input.notes as string | null | undefined) ?? null;
  if ("sector" in input) updatePayload.sector = (input.sector as string | null | undefined) ?? null;
  if ("ticker" in input) updatePayload.ticker = String(input.ticker);
  if ("dividend_frequency" in input) {
    updatePayload.dividend_frequency =
      input.dividend_frequency as Database["public"]["Enums"]["frequency_type"];
  }
  if (
    "annual_dividend_per_share_input" in input &&
    typeof input.annual_dividend_per_share_input === "string"
  ) {
    updatePayload.annual_dividend_per_share_cents = parseCurrencyInput(
      input.annual_dividend_per_share_input,
    );
  }
  if ("daily_price_alert_threshold_percent" in input) {
    updatePayload.daily_price_alert_threshold_percent = getOptionalThreshold(
      input.daily_price_alert_threshold_percent as number | null | undefined,
    );
  }

  const { error } = await supabase
    .from("investments")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  await syncInvestmentFromMarketCache({
    investment: {
      currency:
        typeof updatePayload.currency === "string" ? updatePayload.currency : existing.currency,
      id: existing.id,
      quantity: existing.quantity,
      ticker: typeof updatePayload.ticker === "string" ? updatePayload.ticker : existing.ticker,
    },
    supabase,
  });
}

export async function softDeleteInvestmentPosition({
  id,
  supabase,
  userId,
}: {
  id: string;
  supabase: ServerClient;
  userId: string;
}) {
  const deletedAt = new Date().toISOString();

  const { error: operationsError } = await supabase
    .from("investment_operations")
    .update({ deleted_at: deletedAt })
    .eq("investment_id", id)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (operationsError) {
    throw new Error(operationsError.message);
  }

  const { error } = await supabase
    .from("investments")
    .update({ deleted_at: deletedAt, is_active: false })
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createInvestmentOperation({
  input,
  investmentId,
  supabase,
  userId,
}: {
  input: Record<string, unknown>;
  investmentId: string;
  supabase: ServerClient;
  userId: string;
}) {
  const investment = await getInvestmentOrThrow({ id: investmentId, supabase, userId });
  const operationType = input.operation_type as Database["public"]["Enums"]["operation_type"];
  const quantity = parseQuantityInput(String(input.quantity_input));
  const withholdingCents =
    operationType === "dividend" ? parseMoneyOrZero(input.withholding_input) : 0;

  if (
    (operationType === "sell" || operationType === "transfer_out") &&
    quantity > investment.quantity
  ) {
    throw new Error("Quantity exceeds current position");
  }

  const priceCents = operationType === "split" ? 0 : parseCurrencyInput(String(input.price_input));
  const feeCents = operationType === "split" ? 0 : parseMoneyOrZero(input.fee_input);
  const totalCents = calculateOperationTotalCents({
    feeCents,
    operationType,
    priceCents,
    quantity,
  });

  if (withholdingCents > totalCents) {
    throw new Error("Withholding exceeds the dividend amount");
  }

  const { data, error } = await supabase
    .from("investment_operations")
    .insert({
      currency: investment.currency,
      fee_cents: feeCents,
      investment_id: investmentId,
      notes: (input.notes as string | null | undefined) ?? null,
      operation_date: String(input.operation_date),
      operation_type: operationType,
      price_cents: priceCents,
      quantity,
      total_cents: totalCents,
      user_id: userId,
      withholding_cents: withholdingCents,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { error: recalcError } = await supabase.rpc("recalculate_avg_purchase_price", {
    p_investment_id: investmentId,
  });

  if (recalcError) {
    throw new Error(recalcError.message);
  }

  const refreshedInvestment = await getInvestmentOrThrow({ id: investmentId, supabase, userId });
  await syncInvestmentFromMarketCache({ investment: refreshedInvestment, supabase });

  return data;
}

export async function softDeleteInvestmentOperation({
  id,
  investmentId,
  supabase,
  userId,
}: {
  id: string;
  investmentId?: string;
  supabase: ServerClient;
  userId: string;
}) {
  const { data: operation, error: operationError } = await supabase
    .from("investment_operations")
    .select("id,investment_id")
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (operationError) {
    throw new Error(operationError.message);
  }

  if (!operation) {
    throw new Error("Operation not found");
  }

  if (investmentId && operation.investment_id !== investmentId) {
    throw new Error("Operation does not belong to the selected investment");
  }

  const { error } = await supabase
    .from("investment_operations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  const { error: recalcError } = await supabase.rpc("recalculate_avg_purchase_price", {
    p_investment_id: operation.investment_id,
  });

  if (recalcError) {
    throw new Error(recalcError.message);
  }

  const investment = await getInvestmentOrThrow({ id: operation.investment_id, supabase, userId });
  await syncInvestmentFromMarketCache({ investment, supabase });
}
