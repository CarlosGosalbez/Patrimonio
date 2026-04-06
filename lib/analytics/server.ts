import { endOfMonth, startOfMonth, subMonths, subWeeks, subYears } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildAnalyticsRange,
  buildMonthlyTrendCards,
  buildSeriesBuckets,
  calculateSavingsRate,
  detectSpendingAnomalies,
} from "@/lib/analytics/calculations";
import type {
  AnalyticsNotification,
  AnalyticsPeriod,
  AnalyticsSummaryResponse,
  CategoryTrendPoint,
  CategoryTrendRow,
  NetWorthHistoryPoint,
} from "@/lib/analytics/types";
import { formatMonth } from "@/lib/financial/formatters";
import type { Database } from "@/types/database";

type ServerClient = SupabaseClient<Database>;

type AnalyticsTransactionRow = Pick<
  Database["public"]["Tables"]["transactions"]["Row"],
  "amount_cents" | "category_id" | "is_income" | "transaction_date"
> & {
  category: {
    color: string | null;
    id: string;
    name: string;
  } | null;
};

const transactionSelect = `
  amount_cents,
  category_id,
  is_income,
  transaction_date,
  category:categories(id,name,color)
`;

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getPreviousRange(period: AnalyticsPeriod, referenceDate: Date) {
  switch (period) {
    case "week":
      return buildAnalyticsRange("week", subWeeks(referenceDate, 1));
    case "quarter":
      return buildAnalyticsRange("quarter", subMonths(referenceDate, 3));
    case "year":
      return buildAnalyticsRange("year", subYears(referenceDate, 1));
    case "month":
    default:
      return buildAnalyticsRange("month", subMonths(referenceDate, 1));
  }
}

export async function getAnalyticsSummary({
  period,
  referenceDate = new Date(),
  supabase,
  uncategorizedLabel,
  userId,
}: {
  period: AnalyticsPeriod;
  referenceDate?: Date;
  supabase: ServerClient;
  uncategorizedLabel: string;
  userId: string;
}): Promise<AnalyticsSummaryResponse> {
  const range = buildAnalyticsRange(period, referenceDate);
  const previousRange = getPreviousRange(period, referenceDate);
  const currentMonthStart = startOfMonth(referenceDate);
  const anomalyStart = startOfMonth(subMonths(referenceDate, 6));
  const trendStart = startOfMonth(subMonths(referenceDate, 11));
  const queryStart = [
    range.start,
    previousRange.start,
    toIsoDate(anomalyStart),
    toIsoDate(trendStart),
  ].sort()[0]!;
  const queryEnd = range.end;

  const [transactionsResult, notificationsResult, snapshotsResult] = await Promise.all([
    supabase
      .from("transactions")
      .select(transactionSelect)
      .eq("user_id", userId)
      .gte("transaction_date", queryStart)
      .lte("transaction_date", queryEnd)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: true }),
    supabase
      .from("notifications")
      .select("id,title,message,type,severity,target_id,target_type,created_at")
      .eq("user_id", userId)
      .in("type", ["budget_exceeded", "anomaly_detected"])
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("investment_snapshots")
      .select("snapshot_date,total_value_cents,total_invested_cents,unrealized_pl_cents")
      .eq("user_id", userId)
      .order("snapshot_date", { ascending: false })
      .limit(24),
  ]);

  if (transactionsResult.error) {
    throw new Error(transactionsResult.error.message);
  }

  if (notificationsResult.error) {
    throw new Error(notificationsResult.error.message);
  }

  if (snapshotsResult.error) {
    throw new Error(snapshotsResult.error.message);
  }

  const transactions = (transactionsResult.data ?? []) as AnalyticsTransactionRow[];
  const series = buildSeriesBuckets(period, range);

  // Pre-build a lookup index so bucket assignment is O(1) per transaction
  // instead of O(buckets) — relevant for year period with 12 monthly buckets
  const bucketByDate = new Map<string, (typeof series)[number]>();
  for (const bucket of series) {
    let cursor = bucket.period_start;
    while (cursor <= bucket.period_end) {
      bucketByDate.set(cursor, bucket);
      const d = new Date(`${cursor}T00:00:00`);
      d.setDate(d.getDate() + 1);
      cursor = d.toISOString().slice(0, 10);
    }
  }

  const monthlyTotalsByCategory = new Map<
    string,
    {
      category_color: string | null;
      category_name: string;
      months: Map<string, number>;
      current_month_cents: number;
      current_period_cents: number;
      previous_period_cents: number;
    }
  >();

  let incomeCents = 0;
  let expenseCents = 0;
  let transactionCount = 0;

  for (const transaction of transactions) {
    const transactionDate = transaction.transaction_date;
    const bucket = bucketByDate.get(transactionDate);

    if (bucket) {
      if (transaction.is_income) {
        bucket.income_cents += transaction.amount_cents;
        incomeCents += transaction.amount_cents;
      } else {
        bucket.expense_cents += transaction.amount_cents;
        expenseCents += transaction.amount_cents;
      }

      transactionCount += 1;
      bucket.net_cents = bucket.income_cents - bucket.expense_cents;
    }

    if (transaction.is_income || !transaction.category_id) {
      continue;
    }

    const categoryName = transaction.category?.name ?? uncategorizedLabel;
    const categoryColor = transaction.category?.color ?? null;
    const monthKey = transaction.transaction_date.slice(0, 7);

    if (!monthlyTotalsByCategory.has(transaction.category_id)) {
      monthlyTotalsByCategory.set(transaction.category_id, {
        category_color: categoryColor,
        category_name: categoryName,
        current_month_cents: 0,
        current_period_cents: 0,
        months: new Map<string, number>(),
        previous_period_cents: 0,
      });
    }

    const entry = monthlyTotalsByCategory.get(transaction.category_id)!;
    entry.months.set(monthKey, (entry.months.get(monthKey) ?? 0) + transaction.amount_cents);

    if (
      transaction.transaction_date >= toIsoDate(currentMonthStart) &&
      transaction.transaction_date <= toIsoDate(endOfMonth(referenceDate))
    ) {
      entry.current_month_cents += transaction.amount_cents;
    }

    if (transaction.transaction_date >= range.start && transaction.transaction_date <= range.end) {
      entry.current_period_cents += transaction.amount_cents;
    }

    if (
      transaction.transaction_date >= previousRange.start &&
      transaction.transaction_date <= previousRange.end
    ) {
      entry.previous_period_cents += transaction.amount_cents;
    }
  }

  const monthSeriesKeys = Array.from({ length: 12 }, (_, index) =>
    toIsoDate(startOfMonth(subMonths(referenceDate, 11 - index))).slice(0, 7),
  );
  const previousThreeMonthKeys = Array.from({ length: 3 }, (_, index) =>
    toIsoDate(startOfMonth(subMonths(referenceDate, 3 - index))).slice(0, 7),
  );
  const previousSixMonthKeys = Array.from({ length: 6 }, (_, index) =>
    toIsoDate(startOfMonth(subMonths(referenceDate, 6 - index))).slice(0, 7),
  );

  const categoryTrends = Array.from(monthlyTotalsByCategory.entries())
    .map<CategoryTrendRow>(([categoryId, category]) => {
      const monthlySeries = monthSeriesKeys.map<CategoryTrendPoint>((monthKey) => ({
        label: formatMonth(`${monthKey}-01`),
        month: monthKey,
        total_cents: category.months.get(monthKey) ?? 0,
      }));

      return {
        category_color: category.category_color,
        category_id: categoryId,
        category_name: category.category_name,
        current_period_cents: category.current_period_cents,
        delta_percent:
          category.previous_period_cents > 0
            ? Math.round(
                ((category.current_period_cents - category.previous_period_cents) /
                  category.previous_period_cents) *
                  1000,
              ) / 10
            : null,
        is_growing: category.current_period_cents > category.previous_period_cents,
        monthly_series: monthlySeries,
        previous_period_cents: category.previous_period_cents,
      };
    })
    .sort((left, right) => right.current_period_cents - left.current_period_cents)
    .slice(0, 6);

  const categoryMonthlyInputs = Array.from(monthlyTotalsByCategory.entries()).map(
    ([categoryId, category]) => ({
      category_color: category.category_color,
      category_id: categoryId,
      category_name: category.category_name,
      current_month_cents: category.current_month_cents,
      monthly_totals: previousSixMonthKeys.map((key) => category.months.get(key) ?? 0),
    }),
  );

  const monthlyTrendCards = buildMonthlyTrendCards(
    categoryMonthlyInputs.map((category) => ({
      ...category,
      monthly_totals: previousThreeMonthKeys.map(
        (key) => monthlyTotalsByCategory.get(category.category_id)?.months.get(key) ?? 0,
      ),
    })),
  );

  return {
    anomalies: detectSpendingAnomalies(categoryMonthlyInputs),
    category_trends: categoryTrends,
    monthly_trend_cards: monthlyTrendCards,
    net_worth_history: ((snapshotsResult.data ?? []) as NetWorthHistoryPoint[]).reverse(),
    notifications: (notificationsResult.data ?? []) as AnalyticsNotification[],
    period,
    range,
    series,
    totals: {
      expense_cents: expenseCents,
      income_cents: incomeCents,
      net_cents: incomeCents - expenseCents,
      savings_rate_percent: calculateSavingsRate(incomeCents, expenseCents),
      transaction_count: transactionCount,
    },
  };
}
