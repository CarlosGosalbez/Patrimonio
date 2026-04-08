import {
  addDays,
  addMonths,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { formatMonth } from "@/lib/financial/formatters";
import type {
  AnalyticsPeriod,
  AnalyticsRange,
  AnalyticsSeriesPoint,
  Budget503020Summary,
  MonthlyTrendCard,
  SpendingAnomaly,
} from "@/lib/analytics/types";

interface CategoryMonthlySeriesInput {
  category_color: string | null;
  category_id: string;
  category_name: string;
  current_month_cents: number;
  monthly_totals: number[];
}

interface BudgetRuleExpenseInput {
  amount_cents: number;
  category_name: string;
}

function toIsoDate(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function classify503020Category(categoryName: string) {
  const normalized = categoryName
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  if (
    /(hipoteca|alquiler|suministros|comunidad|supermercado|gasolina|transporte|seguro|sanidad|farmacia|educacion|impuestos)/.test(
      normalized,
    )
  ) {
    return "needs" as const;
  }

  if (/(restaurantes|ocio|suscripciones|viajes|ropa|tecnologia|otros gastos)/.test(normalized)) {
    return "wants" as const;
  }

  return "uncategorized" as const;
}

export function calculateSavingsRate(incomeCents: number, expenseCents: number) {
  if (incomeCents <= 0) {
    return null;
  }

  return roundOneDecimal(((incomeCents - expenseCents) / incomeCents) * 100);
}

export function calculateStdDev(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

export function buildAnalyticsRange(period: AnalyticsPeriod, referenceDate: Date): AnalyticsRange {
  switch (period) {
    case "week": {
      const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
      const end = endOfWeek(referenceDate, { weekStartsOn: 1 });

      return {
        end: toIsoDate(end),
        label: `${format(start, "dd/MM")} - ${format(end, "dd/MM")}`,
        start: toIsoDate(start),
      };
    }
    case "quarter": {
      const start = startOfQuarter(referenceDate);
      const end = endOfQuarter(referenceDate);

      return {
        end: toIsoDate(end),
        label: `Q${Math.floor(referenceDate.getMonth() / 3) + 1} ${referenceDate.getFullYear()}`,
        start: toIsoDate(start),
      };
    }
    case "year": {
      const start = startOfYear(referenceDate);
      const end = endOfYear(referenceDate);

      return {
        end: toIsoDate(end),
        label: String(referenceDate.getFullYear()),
        start: toIsoDate(start),
      };
    }
    case "month":
    default: {
      const start = startOfMonth(referenceDate);
      const end = endOfMonth(referenceDate);

      return {
        end: toIsoDate(end),
        label: formatMonth(start),
        start: toIsoDate(start),
      };
    }
  }
}

export function buildSeriesBuckets(period: AnalyticsPeriod, range: AnalyticsRange) {
  const start = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T00:00:00`);
  const buckets: AnalyticsSeriesPoint[] = [];

  if (period === "week") {
    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
      const date = toIsoDate(cursor);
      buckets.push({
        expense_cents: 0,
        income_cents: 0,
        label: format(cursor, "EEE"),
        net_cents: 0,
        period_end: date,
        period_start: date,
      });
    }

    return buckets;
  }

  if (period === "month") {
    let cursor = start;
    let index = 1;

    while (cursor <= end) {
      const bucketEnd = addDays(cursor, 6) > end ? end : addDays(cursor, 6);

      buckets.push({
        expense_cents: 0,
        income_cents: 0,
        label: `S${index}`,
        net_cents: 0,
        period_end: toIsoDate(bucketEnd),
        period_start: toIsoDate(cursor),
      });

      cursor = addDays(bucketEnd, 1);
      index += 1;
    }

    return buckets;
  }

  if (period === "quarter") {
    for (let offset = 0; offset < 3; offset += 1) {
      const monthStart = startOfMonth(addMonths(start, offset));
      const monthEnd = endOfMonth(monthStart);

      buckets.push({
        expense_cents: 0,
        income_cents: 0,
        label: formatMonth(monthStart),
        net_cents: 0,
        period_end: toIsoDate(monthEnd),
        period_start: toIsoDate(monthStart),
      });
    }

    return buckets;
  }

  for (let offset = 0; offset < 12; offset += 1) {
    const monthStart = startOfMonth(addMonths(start, offset));
    const monthEnd = endOfMonth(monthStart);

    buckets.push({
      expense_cents: 0,
      income_cents: 0,
      label: formatMonth(monthStart),
      net_cents: 0,
      period_end: toIsoDate(monthEnd),
      period_start: toIsoDate(monthStart),
    });
  }

  return buckets;
}

export function detectSpendingAnomalies(
  categories: CategoryMonthlySeriesInput[],
): SpendingAnomaly[] {
  return categories
    .map<SpendingAnomaly | null>((category) => {
      const history = category.monthly_totals.filter((value) => value > 0);

      if (history.length < 3) {
        return null;
      }

      const mean = history.reduce((sum, value) => sum + value, 0) / history.length;
      const stdDev = calculateStdDev(history);

      if (stdDev === 0 || category.current_month_cents <= mean) {
        return null;
      }

      const zScore = (category.current_month_cents - mean) / stdDev;

      if (zScore < 1.5) {
        return null;
      }

      return {
        category_color: category.category_color,
        category_id: category.category_id,
        category_name: category.category_name,
        current_month_cents: category.current_month_cents,
        historical_mean_cents: Math.round(mean),
        historical_stddev_cents: Math.round(stdDev),
        percent_above_mean: roundOneDecimal(((category.current_month_cents - mean) / mean) * 100),
        severity: zScore >= 2 ? "critical" : "warning",
        z_score: roundOneDecimal(zScore),
      };
    })
    .filter((item): item is SpendingAnomaly => item !== null)
    .sort((left, right) => right.z_score - left.z_score);
}

export function buildMonthlyTrendCards(categories: CategoryMonthlySeriesInput[]) {
  return categories
    .map<MonthlyTrendCard | null>((category) => {
      if (category.monthly_totals.length < 3) {
        return null;
      }

      const average =
        category.monthly_totals.reduce((sum, value) => sum + value, 0) /
        category.monthly_totals.length;

      return {
        average_3m_cents: Math.round(average),
        category_color: category.category_color,
        category_id: category.category_id,
        category_name: category.category_name,
        current_month_cents: category.current_month_cents,
        delta_percent:
          average > 0
            ? roundOneDecimal(((category.current_month_cents - average) / average) * 100)
            : null,
      };
    })
    .filter((item): item is MonthlyTrendCard => item !== null)
    .sort((left, right) => {
      return Math.abs(right.delta_percent ?? 0) - Math.abs(left.delta_percent ?? 0);
    })
    .slice(0, 4);
}

export function buildBudget503020Summary({
  expenses,
  incomeCents,
}: {
  expenses: BudgetRuleExpenseInput[];
  incomeCents: number;
}): Budget503020Summary {
  const needsCents = expenses.reduce((sum, expense) => {
    return classify503020Category(expense.category_name) === "needs"
      ? sum + expense.amount_cents
      : sum;
  }, 0);
  const wantsCents = expenses.reduce((sum, expense) => {
    return classify503020Category(expense.category_name) === "wants"
      ? sum + expense.amount_cents
      : sum;
  }, 0);
  const uncategorizedExpenseCents = expenses.reduce((sum, expense) => {
    return classify503020Category(expense.category_name) === "uncategorized"
      ? sum + expense.amount_cents
      : sum;
  }, 0);
  const totalExpenseCents = expenses.reduce((sum, expense) => sum + expense.amount_cents, 0);
  const savingsCents = Math.max(incomeCents - totalExpenseCents, 0);

  function percentOfIncome(amountCents: number) {
    if (incomeCents <= 0) {
      return null;
    }

    return roundOneDecimal((amountCents / incomeCents) * 100);
  }

  function buildBucket(actualCents: number, targetPercent: number, mode: "max" | "min") {
    const idealCents = Math.round(incomeCents * (targetPercent / 100));
    const varianceCents = actualCents - idealCents;
    const status =
      incomeCents <= 0
        ? ("within" as const)
        : mode === "max"
          ? actualCents > idealCents
            ? ("over" as const)
            : ("within" as const)
          : actualCents < idealCents
            ? ("under" as const)
            : ("within" as const);

    return {
      actual_cents: actualCents,
      ideal_cents: idealCents,
      percent_of_income: percentOfIncome(actualCents),
      status,
      target_percent: targetPercent,
      variance_cents: varianceCents,
    };
  }

  return {
    income_cents: incomeCents,
    needs: buildBucket(needsCents, 50, "max"),
    savings: buildBucket(savingsCents, 20, "min"),
    uncategorized_expense_cents: uncategorizedExpenseCents,
    wants: buildBucket(wantsCents, 30, "max"),
  };
}
