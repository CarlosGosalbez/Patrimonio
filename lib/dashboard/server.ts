import { endOfMonth, startOfMonth } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCustomAlertsPageData } from "@/lib/alerts/server";
import { buildProjectedBuckets, toIsoDate } from "@/lib/commitments/recurrence";
import {
  getBudgetPressure,
  getCommitmentsOverview,
  getExpectedIncomeGaps,
  getSubscriptionsOverview,
} from "@/lib/commitments/server";
import type { ActiveAlertItem, DashboardSummaryResponse } from "@/lib/commitments/types";
import type { Database } from "@/types/database";

type ServerClient = SupabaseClient<Database>;
type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

const recentTransactionsSelect = `
  id,
  user_id,
  account_id,
  category_id,
  commitment_id,
  amount_cents,
  currency,
  description,
  notes,
  is_income,
  transaction_date,
  value_date,
  tags,
  receipt_url,
  import_source,
  import_batch_id,
  import_dedupe_key,
  transfer_id,
  recurring_id,
  is_recurring_instance,
  search_vector,
  created_at,
  updated_at,
  deleted_at,
  account:accounts(id,name,currency,color,icon),
  category:categories(id,name,color,icon,is_income,user_id)
`;

export async function getDashboardSummary({
  supabase,
  t,
  userId,
}: {
  supabase: ServerClient;
  t: TranslateFn;
  userId: string;
}): Promise<DashboardSummaryResponse> {
  const currentMonth = toIsoDate(startOfMonth(new Date()));
  const previousMonth = toIsoDate(
    startOfMonth(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)),
  );
  const monthStart = toIsoDate(startOfMonth(new Date()));
  const monthEnd = toIsoDate(endOfMonth(new Date()));

  try {
    await supabase.rpc("refresh_dashboard_views");
  } catch {
    // Fallback to the latest materialized snapshot if the refresh helper is not available.
  }

  const [
    netWorthResult,
    currentMonthRows,
    previousMonthRows,
    monthTransactions,
    topCategoriesResult,
    recentTransactionsResult,
    commitmentsOverview,
    subscriptionsOverview,
    customAlertsOverview,
    budgetPressure,
  ] = await Promise.all([
    supabase.rpc("get_net_worth", { p_user_id: userId }),
    supabase.rpc("get_monthly_balance", { p_month: currentMonth }),
    supabase.rpc("get_monthly_balance", { p_month: previousMonth }),
    supabase
      .from("transactions")
      .select("amount_cents,is_income")
      .eq("user_id", userId)
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd)
      .is("deleted_at", null),
    supabase.rpc("get_top_category_spending", { p_month: currentMonth, p_limit: 5 }),
    supabase
      .from("transactions")
      .select(recentTransactionsSelect)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    getCommitmentsOverview({ supabase, userId }),
    getSubscriptionsOverview({ supabase, userId }),
    getCustomAlertsPageData({ supabase, userId }),
    getBudgetPressure({ supabase, userId }),
  ]);

  if (netWorthResult.error) {
    throw new Error(netWorthResult.error.message);
  }

  if (currentMonthRows.error) {
    throw new Error(currentMonthRows.error.message);
  }

  if (previousMonthRows.error) {
    throw new Error(previousMonthRows.error.message);
  }

  if (monthTransactions.error) {
    throw new Error(monthTransactions.error.message);
  }

  if (topCategoriesResult.error) {
    throw new Error(topCategoriesResult.error.message);
  }

  if (recentTransactionsResult.error) {
    throw new Error(recentTransactionsResult.error.message);
  }

  const monthIncome = (monthTransactions.data ?? []).reduce((sum, row) => {
    return row.is_income ? sum + row.amount_cents : sum;
  }, 0);

  const monthExpense = (monthTransactions.data ?? []).reduce((sum, row) => {
    return row.is_income ? sum : sum + row.amount_cents;
  }, 0);

  const currentMonthBalance = (currentMonthRows.data ?? []).reduce(
    (sum, row) => sum + (row.net_amount_cents ?? 0),
    0,
  );
  const previousMonthBalance = (previousMonthRows.data ?? []).reduce(
    (sum, row) => sum + (row.net_amount_cents ?? 0),
    0,
  );
  const expectedIncomeGaps = await getExpectedIncomeGaps({
    commitments: commitmentsOverview.commitments,
    supabase,
    userId,
  });

  const alertItems: ActiveAlertItem[] = [];

  for (const budget of budgetPressure.slice(0, 3)) {
    alertItems.push({
      amount_cents: budget.spent_cents,
      detail: t("activeAlertDetails.overBudget", {
        percent: Math.round(budget.progress_ratio * 100),
      }),
      due_date: null,
      href: "/dashboard",
      id: `budget:${budget.budget_id}`,
      severity: budget.progress_ratio >= 1 ? "critical" : "warning",
      title: budget.category_name || t("uncategorized"),
      type: "over_budget",
    });
  }

  for (const subscription of subscriptionsOverview.subscriptions
    .filter((item) => item.status === "unexpected_charge")
    .slice(0, 3)) {
    alertItems.push({
      amount_cents: subscription.latest_matching_charge_cents,
      detail: subscription.latest_matching_charge_description ?? subscription.name,
      due_date: subscription.latest_matching_charge_date,
      href: "/commitments?tab=subscriptions",
      id: `subscription:${subscription.id}`,
      severity: "critical",
      title: subscription.name,
      type: "subscription_unexpected_charge",
    });
  }

  for (const commitment of expectedIncomeGaps.slice(0, 3)) {
    alertItems.push({
      amount_cents: commitment.amount_cents,
      detail: t("activeAlertDetails.expectedIncome", { date: commitment.next_due_date }),
      due_date: commitment.next_due_date,
      href: "/commitments",
      id: `income-gap:${commitment.id}`,
      severity: "warning",
      title: commitment.name,
      type: "expected_income_unpaid",
    });
  }

  for (const alert of customAlertsOverview.upcoming_deadlines.slice(0, 4)) {
    alertItems.push({
      amount_cents: alert.expected_amount_cents,
      detail: t("activeAlertDetails.customAlertDue", { date: alert.next_due_date }),
      due_date: alert.next_due_date,
      href: "/alerts",
      id: `custom-alert:${alert.id}`,
      severity: alert.severity,
      title: alert.name,
      type: "custom_alert_due",
    });
  }

  if (commitmentsOverview.deficit_alert) {
    alertItems.push({
      amount_cents: commitmentsOverview.deficit_alert.projected_balance_cents,
      detail: t("activeAlertDetails.insufficientBalance", {
        date: commitmentsOverview.deficit_alert.month_date,
      }),
      due_date: commitmentsOverview.deficit_alert.month_date,
      href: "/commitments",
      id: "cashflow:deficit",
      severity: "critical",
      title: t("activeAlertTitles.insufficientBalance"),
      type: "insufficient_balance",
    });
  }

  return {
    active_alerts: {
      custom_alert_due: customAlertsOverview.upcoming_deadlines.length,
      expected_income_unpaid: expectedIncomeGaps.length,
      insufficient_balance: commitmentsOverview.deficit_alert ? 1 : 0,
      items: alertItems.slice(0, 8),
      over_budget: budgetPressure.length,
      subscription_unexpected_charge: subscriptionsOverview.unexpected_charge_count,
      total:
        budgetPressure.length +
        subscriptionsOverview.unexpected_charge_count +
        expectedIncomeGaps.length +
        customAlertsOverview.upcoming_deadlines.length +
        (commitmentsOverview.deficit_alert ? 1 : 0),
    },
    hero: {
      cash_cents: netWorthResult.data?.[0]?.cash_cents ?? 0,
      currency: netWorthResult.data?.[0]?.currency ?? "EUR",
      investments_cents: netWorthResult.data?.[0]?.investments_cents ?? 0,
      monthly_delta_cents: currentMonthBalance - previousMonthBalance,
      total_cents: netWorthResult.data?.[0]?.total_cents ?? 0,
    },
    monthly_balance: {
      balance_cents: monthIncome - monthExpense,
      expense_cents: monthExpense,
      income_cents: monthIncome,
    },
    portfolio_summary: {
      day_pnl_cents: 0,
      total_value_cents: netWorthResult.data?.[0]?.investments_cents ?? 0,
    },
    projected_flow: {
      buckets: buildProjectedBuckets(commitmentsOverview.projected_flow),
      points: commitmentsOverview.projected_flow,
    },
    recent_transactions: (recentTransactionsResult.data ?? []).map((transaction) => ({
      ...transaction,
      account: transaction.account,
      category: transaction.category,
      commitment_id: transaction.commitment_id,
      receipt: transaction.receipt_url
        ? {
            path: transaction.receipt_url,
            signed_url: null,
            thumbnail_url: null,
          }
        : null,
      transaction_kind: transaction.transfer_id
        ? "transfer"
        : transaction.is_income
          ? "income"
          : "expense",
    })),
    top_categories: (topCategoriesResult.data ?? []).map((row) => ({
      category_id: row.category_id,
      color: row.category_color ?? null,
      name: row.category_name ?? t("uncategorized"),
      total_cents: row.total_cents ?? 0,
      transaction_count: row.transaction_count ?? 0,
    })),
    upcoming_commitments: commitmentsOverview.upcoming_due,
    upcoming_deadlines: customAlertsOverview.upcoming_deadlines,
  };
}
