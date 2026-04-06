// ============================================================
// PHASE 7 — Reports & Export
// lib/reports/server.ts — Server-side report data aggregation
// ============================================================

import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateSavingsRate } from "@/lib/analytics/calculations";
import type { Database } from "@/types/database";
import type {
  AnnualReport,
  CategoryAmount,
  FiscalReport,
  GdprExportData,
  MonthlyComparison,
  MonthlyReport,
  MonthlySeriesPoint,
  PeriodComparisonReport,
  ReportPeriod,
  TopTransaction,
} from "@/lib/reports/types";

type ServerClient = SupabaseClient<Database>;

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function roundPct(value: number): number {
  return Math.round(value * 10) / 10;
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return roundPct(((current - previous) / previous) * 100);
}

// Fetch all transactions for a date range
async function fetchTransactionsInRange(
  supabase: ServerClient,
  userId: string,
  start: string,
  end: string,
) {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      id,
      description,
      amount_cents,
      is_income,
      transaction_date,
      category_id,
      category:categories(id,name,color)
    `,
    )
    .eq("user_id", userId)
    .gte("transaction_date", start)
    .lte("transaction_date", end)
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

type TxRow = {
  id: string;
  description: string;
  amount_cents: number;
  is_income: boolean;
  transaction_date: string;
  category_id: string | null;
  category: { id: string; name: string; color: string | null } | null;
};

function buildCategoryAmounts(
  transactions: TxRow[],
  filterIncome: boolean,
  total: number,
): CategoryAmount[] {
  const map = new Map<
    string,
    { name: string; color: string | null; cents: number; count: number }
  >();

  for (const tx of transactions) {
    if (tx.is_income !== filterIncome) continue;
    const key = tx.category_id ?? "__none__";
    const existing = map.get(key);
    if (existing) {
      existing.cents += tx.amount_cents;
      existing.count += 1;
    } else {
      map.set(key, {
        name: tx.category?.name ?? "Sin categoría",
        color: tx.category?.color ?? null,
        cents: tx.amount_cents,
        count: 1,
      });
    }
  }

  return Array.from(map.entries())
    .map(([id, v]) => ({
      category_id: id === "__none__" ? null : id,
      category_name: v.name,
      category_color: v.color,
      amount_cents: v.cents,
      percent_of_total: total > 0 ? roundPct((v.cents / total) * 100) : 0,
      transaction_count: v.count,
    }))
    .sort((a, b) => b.amount_cents - a.amount_cents);
}

// ─────────────────────────────────────────────────────────────
// Monthly Report
// ─────────────────────────────────────────────────────────────

export async function generateMonthlyReport(
  supabase: ServerClient,
  userId: string,
  month: number,
  year: number,
): Promise<MonthlyReport> {
  const currentStart = startOfMonth(new Date(year, month - 1, 1));
  const currentEnd = endOfMonth(currentStart);
  const prevStart = startOfMonth(subMonths(currentStart, 1));
  const prevEnd = endOfMonth(prevStart);

  const [current, previous] = await Promise.all([
    fetchTransactionsInRange(supabase, userId, toIsoDate(currentStart), toIsoDate(currentEnd)),
    fetchTransactionsInRange(supabase, userId, toIsoDate(prevStart), toIsoDate(prevEnd)),
  ]);

  const incomeCents = current.filter((t) => t.is_income).reduce((s, t) => s + t.amount_cents, 0);
  const expensesCents = current.filter((t) => !t.is_income).reduce((s, t) => s + t.amount_cents, 0);
  const prevIncome = previous.filter((t) => t.is_income).reduce((s, t) => s + t.amount_cents, 0);
  const prevExpenses = previous.filter((t) => !t.is_income).reduce((s, t) => s + t.amount_cents, 0);

  const topExpenses: TopTransaction[] = current
    .filter((t) => !t.is_income)
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      description: t.description,
      amount_cents: t.amount_cents,
      transaction_date: t.transaction_date,
      category_name: t.category?.name ?? null,
      category_color: t.category?.color ?? null,
    }));

  const comparison: MonthlyComparison = {
    income_prev_cents: prevIncome,
    expenses_prev_cents: prevExpenses,
    savings_rate_prev: calculateSavingsRate(prevIncome, prevExpenses),
    income_delta_pct: deltaPct(incomeCents, prevIncome),
    expenses_delta_pct: deltaPct(expensesCents, prevExpenses),
    savings_rate_delta: null,
  };

  const savingsRate = calculateSavingsRate(incomeCents, expensesCents);
  comparison.savings_rate_delta =
    savingsRate !== null && comparison.savings_rate_prev !== null
      ? roundPct(savingsRate - comparison.savings_rate_prev)
      : null;

  const period: ReportPeriod = {
    type: "month",
    month,
    year,
    label: format(currentStart, "MMMM yyyy", { locale: undefined }),
  };

  return {
    period,
    income_total_cents: incomeCents,
    expenses_total_cents: expensesCents,
    net_balance_cents: incomeCents - expensesCents,
    savings_rate_percent: savingsRate,
    income_by_category: buildCategoryAmounts(current as TxRow[], true, incomeCents),
    expenses_by_category: buildCategoryAmounts(current as TxRow[], false, expensesCents),
    top_expenses: topExpenses,
    comparison,
  };
}

// ─────────────────────────────────────────────────────────────
// Annual Report
// ─────────────────────────────────────────────────────────────

export async function generateAnnualReport(
  supabase: ServerClient,
  userId: string,
  year: number,
): Promise<AnnualReport> {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(yearStart);
  const prevYearStart = startOfYear(subYears(yearStart, 1));
  const prevYearEnd = endOfYear(prevYearStart);

  const [current, previous] = await Promise.all([
    fetchTransactionsInRange(supabase, userId, toIsoDate(yearStart), toIsoDate(yearEnd)),
    fetchTransactionsInRange(supabase, userId, toIsoDate(prevYearStart), toIsoDate(prevYearEnd)),
  ]);

  const totalIncome = current.filter((t) => t.is_income).reduce((s, t) => s + t.amount_cents, 0);
  const totalExpenses = current.filter((t) => !t.is_income).reduce((s, t) => s + t.amount_cents, 0);
  const prevIncome = previous.filter((t) => t.is_income).reduce((s, t) => s + t.amount_cents, 0);
  const prevExpenses = previous.filter((t) => !t.is_income).reduce((s, t) => s + t.amount_cents, 0);

  // Monthly series
  const monthlyMap = new Map<string, { income: number; expenses: number }>();
  for (const tx of current) {
    const key = tx.transaction_date.slice(0, 7); // "2025-01"
    const entry = monthlyMap.get(key) ?? { income: 0, expenses: 0 };
    if (tx.is_income) entry.income += tx.amount_cents;
    else entry.expenses += tx.amount_cents;
    monthlyMap.set(key, entry);
  }

  const monthlySeries: MonthlySeriesPoint[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, i, 1);
    const key = format(d, "yyyy-MM");
    const entry = monthlyMap.get(key) ?? { income: 0, expenses: 0 };
    return {
      month: key,
      label: format(d, "MMM yy"),
      income_cents: entry.income,
      expenses_cents: entry.expenses,
      net_cents: entry.income - entry.expenses,
      savings_rate_percent: calculateSavingsRate(entry.income, entry.expenses),
    };
  });

  const savingsRates = monthlySeries
    .filter((m) => m.savings_rate_percent !== null)
    .map((m) => m.savings_rate_percent as number);
  const avgSavingsRate =
    savingsRates.length > 0
      ? roundPct(savingsRates.reduce((s, v) => s + v, 0) / savingsRates.length)
      : null;

  return {
    period: { type: "year", year, label: String(year) },
    total_income_cents: totalIncome,
    total_expenses_cents: totalExpenses,
    total_net_cents: totalIncome - totalExpenses,
    avg_savings_rate_percent: avgSavingsRate,
    monthly_series: monthlySeries,
    expenses_by_category: buildCategoryAmounts(current as TxRow[], false, totalExpenses),
    income_by_category: buildCategoryAmounts(current as TxRow[], true, totalIncome),
    comparison_prev_year: {
      income_delta_pct: deltaPct(totalIncome, prevIncome),
      expenses_delta_pct: deltaPct(totalExpenses, prevExpenses),
    },
  };
}

// ─────────────────────────────────────────────────────────────
// IRPF Fiscal Report
// ─────────────────────────────────────────────────────────────

export async function generateFiscalReport(
  supabase: ServerClient,
  userId: string,
  year: number,
  disclaimer: string,
): Promise<FiscalReport> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const { data: ops, error } = await supabase
    .from("investment_operations")
    .select(
      `
      id,
      operation_type,
      operation_date,
      quantity,
      price_cents,
      total_cents,
      withholding_cents,
      investment:investments(name, ticker, avg_purchase_price_cents)
    `,
    )
    .eq("user_id", userId)
    .gte("operation_date", yearStart)
    .lte("operation_date", yearEnd)
    .is("deleted_at", null)
    .order("operation_date", { ascending: true });

  if (error) throw new Error(error.message);
  const operations = ops ?? [];

  // Capital Gains (sell operations)
  const sells = operations.filter((op) => op.operation_type === "sell");
  let totalGainsCents = 0;
  let totalLossesCents = 0;

  const saleRows = sells.map((op) => {
    const inv = op.investment as {
      name: string;
      ticker: string;
      avg_purchase_price_cents: number;
    } | null;
    const avgCost = inv?.avg_purchase_price_cents ?? 0;
    const grossGain = op.total_cents - Math.round(avgCost * op.quantity);
    if (grossGain > 0) totalGainsCents += grossGain;
    else totalLossesCents += Math.abs(grossGain);
    return {
      investment_name: inv?.name ?? "—",
      ticker: inv?.ticker ?? "—",
      operation_date: op.operation_date,
      quantity: op.quantity,
      sell_price_cents: op.price_cents,
      avg_purchase_price_cents: avgCost,
      gross_gain_cents: grossGain,
      is_gain: grossGain >= 0,
    };
  });

  // Dividends
  const dividends = operations.filter((op) => op.operation_type === "dividend");
  let grossDivTotal = 0;
  let withheldTotal = 0;

  const divRows = dividends.map((op) => {
    const inv = op.investment as {
      name: string;
      ticker: string;
      avg_purchase_price_cents: number;
    } | null;
    const withheld = op.withholding_cents ?? 0;
    grossDivTotal += op.total_cents;
    withheldTotal += withheld;
    return {
      investment_name: inv?.name ?? "—",
      ticker: inv?.ticker ?? "—",
      operation_date: op.operation_date,
      gross_amount_cents: op.total_cents,
      withheld_amount_cents: withheld,
      net_amount_cents: op.total_cents - withheld,
    };
  });

  return {
    fiscal_year: year,
    capital_gains: {
      total_gains_cents: totalGainsCents,
      total_losses_cents: totalLossesCents,
      net_cents: totalGainsCents - totalLossesCents,
      operations: saleRows,
    },
    dividends: {
      gross_total_cents: grossDivTotal,
      withheld_total_cents: withheldTotal,
      net_total_cents: grossDivTotal - withheldTotal,
      rows: divRows,
    },
    disclaimer,
  };
}

// ─────────────────────────────────────────────────────────────
// Period Comparison
// ─────────────────────────────────────────────────────────────

export async function generatePeriodComparison(
  supabase: ServerClient,
  userId: string,
  type: "month" | "year",
  month: number,
  year: number,
): Promise<PeriodComparisonReport> {
  let curStart: Date, curEnd: Date, prevStart: Date, prevEnd: Date;
  let curLabel: string, prevLabel: string;

  if (type === "month") {
    curStart = startOfMonth(new Date(year, month - 1, 1));
    curEnd = endOfMonth(curStart);
    const prev = subMonths(curStart, 1);
    prevStart = startOfMonth(prev);
    prevEnd = endOfMonth(prev);
    curLabel = format(curStart, "MMMM yyyy");
    prevLabel = format(prevStart, "MMMM yyyy");
  } else {
    curStart = startOfYear(new Date(year, 0, 1));
    curEnd = endOfYear(curStart);
    const prevYear = subYears(curStart, 1);
    prevStart = startOfYear(prevYear);
    prevEnd = endOfYear(prevYear);
    curLabel = String(year);
    prevLabel = String(year - 1);
  }

  const [current, previous] = await Promise.all([
    fetchTransactionsInRange(supabase, userId, toIsoDate(curStart), toIsoDate(curEnd)),
    fetchTransactionsInRange(supabase, userId, toIsoDate(prevStart), toIsoDate(prevEnd)),
  ]);

  const curIncome = current.filter((t) => t.is_income).reduce((s, t) => s + t.amount_cents, 0);
  const curExpenses = current.filter((t) => !t.is_income).reduce((s, t) => s + t.amount_cents, 0);
  const prevIncome = previous.filter((t) => t.is_income).reduce((s, t) => s + t.amount_cents, 0);
  const prevExpenses = previous.filter((t) => !t.is_income).reduce((s, t) => s + t.amount_cents, 0);

  const curSavings = calculateSavingsRate(curIncome, curExpenses);
  const prevSavings = calculateSavingsRate(prevIncome, prevExpenses);

  return {
    current: {
      label: curLabel,
      income_cents: curIncome,
      expenses_cents: curExpenses,
      net_cents: curIncome - curExpenses,
      savings_rate_percent: curSavings,
    },
    previous: {
      label: prevLabel,
      income_cents: prevIncome,
      expenses_cents: prevExpenses,
      net_cents: prevIncome - prevExpenses,
      savings_rate_percent: prevSavings,
    },
    income_delta_pct: deltaPct(curIncome, prevIncome),
    expenses_delta_pct: deltaPct(curExpenses, prevExpenses),
    net_delta_pct: deltaPct(curIncome - curExpenses, prevIncome - prevExpenses),
    savings_rate_delta:
      curSavings !== null && prevSavings !== null ? roundPct(curSavings - prevSavings) : null,
  };
}

// ─────────────────────────────────────────────────────────────
// GDPR Full Data Export
// ─────────────────────────────────────────────────────────────

export async function buildGdprExportData(
  supabase: ServerClient,
  userId: string,
): Promise<GdprExportData> {
  const [
    profileRes,
    accountsRes,
    categoriesRes,
    transactionsRes,
    commitmentsRes,
    investmentsRes,
    operationsRes,
    budgetsRes,
    notificationsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("accounts").select("*").eq("user_id", userId).is("deleted_at", null),
    supabase.from("categories").select("*").eq("user_id", userId).is("deleted_at", null),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false }),
    supabase.from("recurring_commitments").select("*").eq("user_id", userId).is("deleted_at", null),
    supabase.from("investments").select("*").eq("user_id", userId).is("deleted_at", null),
    supabase.from("investment_operations").select("*").eq("user_id", userId).is("deleted_at", null),
    supabase.from("budgets").select("*").eq("user_id", userId).is("deleted_at", null),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  return {
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile: (profileRes.data as Record<string, unknown>) ?? {},
    accounts: accountsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    transactions: transactionsRes.data ?? [],
    recurring_commitments: commitmentsRes.data ?? [],
    investments: investmentsRes.data ?? [],
    investment_operations: operationsRes.data ?? [],
    budgets: budgetsRes.data ?? [],
    notifications: notificationsRes.data ?? [],
  };
}
