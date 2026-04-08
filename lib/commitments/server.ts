import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildMonthSeries,
  countMonthsUntil,
  getCommitmentStatus,
  getSubscriptionStatus,
  normalizeDueDate,
  occursInMonth,
} from "@/lib/commitments/schedule";
import type {
  BudgetPressure,
  CommitmentListItem,
  CommitmentsOverviewResponse,
  SubscriptionListItem,
  SubscriptionsOverviewResponse,
  TransactionAccountSummary,
  TransactionCategorySummary,
} from "@/lib/commitments/types";
import type { Database } from "@/types/database";

type ServerClient = SupabaseClient<Database>;

type CommitmentSelectRow = Database["public"]["Tables"]["recurring_commitments"]["Row"] & {
  account: TransactionAccountSummary | null;
  category: TransactionCategorySummary | null;
};

type TransactionPreview = Pick<
  Database["public"]["Tables"]["transactions"]["Row"],
  "account_id" | "amount_cents" | "description" | "is_income" | "recurring_id" | "transaction_date"
>;

type RecurringAmountItem = Pick<
  CommitmentListItem,
  | "amount_cents"
  | "commitment_type"
  | "end_date"
  | "frequency"
  | "id"
  | "is_income"
  | "name"
  | "next_due_date"
>;

const commitmentSelect = `
  id,
  user_id,
  account_id,
  category_id,
  name,
  description,
  commitment_type,
  amount_cents,
  currency,
  is_income,
  frequency,
  start_date,
  end_date,
  next_due_date,
  service_name,
  cancelled_at,
  maturity_year,
  interest_rate,
  is_variable_rate,
  allows_early_repayment,
  advance_notice_days,
  tolerance_days,
  is_active,
  is_automated,
  created_at,
  updated_at,
  deleted_at,
  account:accounts(id,name,currency,color,icon),
  category:categories(id,name,color,icon,is_income,user_id)
`;

function getMonthlyEquivalent(
  amountCents: number,
  frequency: Database["public"]["Enums"]["frequency_type"],
) {
  switch (frequency) {
    case "daily":
      return Math.round(amountCents * 30);
    case "weekly":
      return Math.round((amountCents * 52) / 12);
    case "biweekly":
      return Math.round((amountCents * 26) / 12);
    case "monthly":
      return amountCents;
    case "bimonthly":
      return Math.round(amountCents / 2);
    case "quarterly":
      return Math.round(amountCents / 3);
    case "semiannual":
      return Math.round(amountCents / 6);
    case "annual":
      return Math.round(amountCents / 12);
  }
}

function getDaysUntil(dateValue: string, today: Date = new Date()) {
  const current = new Date(today.toISOString().slice(0, 10));
  const target = new Date(`${dateValue}T00:00:00`);
  return Math.ceil((target.getTime() - current.getTime()) / (24 * 60 * 60 * 1000));
}

function getMortgageProjection(commitment: CommitmentSelectRow) {
  if (commitment.commitment_type !== "mortgage" || !commitment.maturity_year) {
    return null;
  }

  const nextDueDate = new Date(`${commitment.next_due_date}T00:00:00`);
  const remainingMonths =
    (commitment.maturity_year - nextDueDate.getFullYear()) * 12 +
    (12 - nextDueDate.getMonth() - 1) +
    1;

  if (remainingMonths <= 0) {
    return null;
  }

  return {
    remaining_months: remainingMonths,
    remaining_years: Math.round((remainingMonths / 12) * 10) / 10,
  };
}

function toCommitmentItem(commitment: CommitmentSelectRow): CommitmentListItem {
  const normalizedDueDate = normalizeDueDate(commitment.next_due_date, commitment.frequency);

  return {
    ...commitment,
    account: commitment.account,
    category: commitment.category,
    mortgage_projection: getMortgageProjection(commitment),
    monthly_equivalent_cents: getMonthlyEquivalent(commitment.amount_cents, commitment.frequency),
    next_due_date: normalizedDueDate,
    next_due_in_days: getDaysUntil(normalizedDueDate),
    status: getCommitmentStatus(commitment),
  };
}

function buildAnnualMatrix(commitments: CommitmentListItem[]) {
  const months = buildMonthSeries(12);

  return commitments.map((commitment) => ({
    cells: months.map((month) => ({
      amount_cents: occursInMonth(commitment, month) ? commitment.amount_cents : 0,
      month,
      occurs: occursInMonth(commitment, month),
    })),
    commitment_id: commitment.id,
    name: commitment.name,
    status: commitment.status,
    total_cents: months.reduce((sum, month) => {
      return sum + (occursInMonth(commitment, month) ? commitment.amount_cents : 0);
    }, 0),
  }));
}

function buildTimeline(commitments: CommitmentListItem[]) {
  return buildMonthSeries(24).map((month) => {
    const entries = commitments.map((commitment) => ({
      amount_cents: commitment.amount_cents,
      commitment_id: commitment.id,
      commitment_type: commitment.commitment_type,
      is_income: commitment.is_income,
      name: commitment.name,
      occurs: occursInMonth(commitment, month),
    }));

    return {
      commitments: entries,
      label: month,
      month,
      total_cents: entries.reduce((sum, entry) => {
        return (
          sum + (entry.occurs ? (entry.is_income ? entry.amount_cents : -entry.amount_cents) : 0)
        );
      }, 0),
    };
  });
}

function buildSubscriptionSpendingSeries(commitments: RecurringAmountItem[]) {
  return buildMonthSeries(6).map((month) => ({
    label: month,
    month,
    total_cents: commitments.reduce((sum, commitment) => {
      return sum + (occursInMonth(commitment, month) ? commitment.amount_cents : 0);
    }, 0),
  }));
}

export async function getCommitmentById({
  id,
  supabase,
  userId,
}: {
  id: string;
  supabase: ServerClient;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("recurring_commitments")
    .select(commitmentSelect)
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Commitment not found");
  }

  return toCommitmentItem(data as CommitmentSelectRow);
}

export async function getCommitmentsOverview({
  supabase,
  userId,
}: {
  supabase: ServerClient;
  userId: string;
}): Promise<CommitmentsOverviewResponse> {
  const [
    { data: commitmentsData, error: commitmentsError },
    { data: projectionData, error: projectionError },
    { data: netWorthData, error: netWorthError },
  ] = await Promise.all([
    supabase
      .from("recurring_commitments")
      .select(commitmentSelect)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("next_due_date", { ascending: true }),
    supabase.rpc("project_cash_flow", { p_months: 12, p_user_id: userId }),
    supabase.rpc("get_net_worth", { p_user_id: userId }),
  ]);

  if (commitmentsError) {
    throw new Error(commitmentsError.message);
  }

  if (projectionError) {
    throw new Error(projectionError.message);
  }

  if (netWorthError) {
    throw new Error(netWorthError.message);
  }

  const commitments = ((commitmentsData ?? []) as CommitmentSelectRow[]).map(toCommitmentItem);
  const cashBase = netWorthData?.[0]?.cash_cents ?? 0;
  let runningCash = cashBase;
  const projected_flow = (projectionData ?? []).map((point) => {
    runningCash += point.net_cents;

    return {
      cumulative_cash_cents: runningCash,
      month_date: point.month_date,
      net_cents: point.net_cents,
      projected_expense_cents: point.projected_expense_cents,
      projected_income_cents: point.projected_income_cents,
    };
  });

  const deficit = projected_flow.find((point) => point.cumulative_cash_cents < 0) ?? null;

  return {
    annual_matrix: buildAnnualMatrix(commitments),
    commitments,
    deficit_alert: deficit
      ? {
          month_date: deficit.month_date,
          projected_balance_cents: deficit.cumulative_cash_cents,
        }
      : null,
    projected_flow,
    timeline: buildTimeline(commitments),
    upcoming_due: commitments
      .filter((commitment) => commitment.next_due_in_days >= 0 && commitment.next_due_in_days <= 7)
      .slice(0, 7),
  };
}

export async function getSubscriptionsOverview({
  supabase,
  userId,
}: {
  supabase: ServerClient;
  userId: string;
}): Promise<SubscriptionsOverviewResponse> {
  const [
    { data: commitmentsData, error: commitmentsError },
    { data: transactionsData, error: transactionsError },
  ] = await Promise.all([
    supabase
      .from("recurring_commitments")
      .select(commitmentSelect)
      .eq("user_id", userId)
      .eq("commitment_type", "subscription")
      .is("deleted_at", null)
      .order("next_due_date", { ascending: true }),
    supabase
      .from("transactions")
      .select("account_id,amount_cents,description,is_income,recurring_id,transaction_date")
      .eq("user_id", userId)
      .eq("is_income", false)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false })
      .limit(250),
  ]);

  if (commitmentsError) {
    throw new Error(commitmentsError.message);
  }

  if (transactionsError) {
    throw new Error(transactionsError.message);
  }

  const subscriptions = ((commitmentsData ?? []) as CommitmentSelectRow[]).map(toCommitmentItem);
  const transactions = (transactionsData ?? []) as TransactionPreview[];

  const mappedSubscriptions: SubscriptionListItem[] = subscriptions.map((subscription) => {
    const latestCharge = transactions.find((transaction) => {
      if (transaction.recurring_id === subscription.id) {
        return true;
      }

      const serviceName = subscription.service_name?.toLowerCase();

      return Boolean(serviceName) && transaction.description.toLowerCase().includes(serviceName!);
    });

    const unexpectedCharge =
      Boolean(subscription.cancelled_at) &&
      Boolean(latestCharge?.transaction_date) &&
      latestCharge!.transaction_date >= subscription.cancelled_at!.slice(0, 10);

    return {
      ...subscription,
      has_unexpected_charge: unexpectedCharge,
      latest_matching_charge_cents: latestCharge?.amount_cents ?? null,
      latest_matching_charge_date: latestCharge?.transaction_date ?? null,
      latest_matching_charge_description: latestCharge?.description ?? null,
      next_renewal_date: subscription.next_due_date,
      status: getSubscriptionStatus(subscription, unexpectedCharge),
    };
  });

  return {
    spending_by_month: buildSubscriptionSpendingSeries(mappedSubscriptions),
    subscriptions: mappedSubscriptions,
    total_monthly_cost_cents: mappedSubscriptions
      .filter((subscription) => subscription.status === "active")
      .reduce((sum, subscription) => sum + subscription.monthly_equivalent_cents, 0),
    unexpected_charge_count: mappedSubscriptions.filter(
      (subscription) => subscription.status === "unexpected_charge",
    ).length,
  };
}

export async function getBudgetPressure({
  supabase,
  userId,
}: {
  supabase: ServerClient;
  userId: string;
}): Promise<BudgetPressure[]> {
  const currentMonth = buildMonthSeries(1)[0]!;
  const [{ data: budgetsData, error: budgetsError }, { data: spendingData, error: spendingError }] =
    await Promise.all([
      supabase
        .from("budgets")
        .select("id,category_id,limit_cents,alert_threshold,category:categories(name)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .is("deleted_at", null),
      supabase.rpc("get_category_spending", { p_month: currentMonth }),
    ]);

  if (budgetsError) {
    throw new Error(budgetsError.message);
  }

  if (spendingError) {
    throw new Error(spendingError.message);
  }

  const spendingByCategory = new Map(
    (spendingData ?? []).map((row) => [row.category_id, row.total_cents ?? 0]),
  );

  return (budgetsData ?? [])
    .map((budget) => {
      const spent_cents = spendingByCategory.get(budget.category_id) ?? 0;
      const progress_ratio = budget.limit_cents > 0 ? spent_cents / budget.limit_cents : 0;

      return {
        budget_id: budget.id,
        category_name: (budget.category as { name?: string } | null)?.name ?? "",
        progress_ratio,
        spent_cents,
        threshold_percent: budget.alert_threshold,
      };
    })
    .filter((budget) => budget.progress_ratio >= budget.threshold_percent / 100);
}

export async function getExpectedIncomeGaps({
  commitments,
  supabase,
  userId,
}: {
  commitments: CommitmentListItem[];
  supabase: ServerClient;
  userId: string;
}) {
  const overdueIncome = commitments.filter(
    (commitment) =>
      commitment.is_income &&
      commitment.status === "active" &&
      commitment.next_due_in_days < -(commitment.tolerance_days ?? 0),
  );

  if (!overdueIncome.length) {
    return [];
  }

  const earliestMonth = overdueIncome.reduce((minimum, commitment) => {
    return commitment.next_due_date < minimum ? commitment.next_due_date : minimum;
  }, overdueIncome[0]!.next_due_date);

  const { data, error } = await supabase
    .from("transactions")
    .select("account_id,amount_cents,description,is_income,recurring_id,transaction_date")
    .eq("user_id", userId)
    .eq("is_income", true)
    .is("deleted_at", null)
    .gte("transaction_date", earliestMonth);

  if (error) {
    throw new Error(error.message);
  }

  const transactions = (data ?? []) as TransactionPreview[];

  return overdueIncome.filter((commitment) => {
    return !transactions.some((transaction) => {
      const transactionMatchesCommitment =
        transaction.recurring_id === commitment.id ||
        (transaction.account_id === commitment.account_id &&
          Math.abs(transaction.amount_cents - commitment.amount_cents) <= 100);

      return (
        transactionMatchesCommitment &&
        countMonthsUntil(transaction.transaction_date, commitment.next_due_date) === 0
      );
    });
  });
}
