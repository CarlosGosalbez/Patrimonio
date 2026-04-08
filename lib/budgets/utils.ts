import {
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  isAfter,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { formatMonth } from "@/lib/financial/formatters";
import type { BudgetPeriod, BudgetRow, BudgetStatus } from "@/lib/budgets/types";

export interface BudgetWindow {
  label: string;
  period_end: string;
  period_start: string;
}

function toDateOnly(value: string | Date) {
  return value instanceof Date
    ? new Date(`${value.toISOString().slice(0, 10)}T00:00:00`)
    : new Date(`${value}T00:00:00`);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function calculateBudgetProgress(limitCents: number, spentCents: number) {
  const progressRatio = limitCents > 0 ? spentCents / limitCents : 0;

  return {
    available_cents: limitCents - spentCents,
    progress_percent: Math.round(progressRatio * 100),
    progress_ratio: progressRatio,
  };
}

export function getBudgetStatus(progressRatio: number, thresholdPercent: number): BudgetStatus {
  const thresholdRatio = thresholdPercent / 100;
  const approachRatio = Math.max(0.7, thresholdRatio - 0.15);

  if (progressRatio >= 1) {
    return "exceeded";
  }

  if (progressRatio >= thresholdRatio) {
    return "warning";
  }

  if (progressRatio >= approachRatio) {
    return "approaching";
  }

  return "ok";
}

export function calculateChangePercent(currentCents: number, previousCents: number) {
  if (previousCents <= 0) {
    return null;
  }

  return Math.round(((currentCents - previousCents) / previousCents) * 1000) / 10;
}

export function getBudgetWindow(
  period: BudgetPeriod,
  referenceDate: Date,
  offset: number = 0,
): BudgetWindow {
  if (period === "annual") {
    const anchor =
      offset === 0
        ? referenceDate
        : offset > 0
          ? addYears(referenceDate, offset)
          : subYears(referenceDate, Math.abs(offset));
    const periodStart = startOfYear(anchor);
    const periodEnd = endOfYear(anchor);

    return {
      label: String(periodStart.getFullYear()),
      period_end: toIsoDate(periodEnd),
      period_start: toIsoDate(periodStart),
    };
  }

  const anchor =
    offset === 0
      ? referenceDate
      : offset > 0
        ? addMonths(referenceDate, offset)
        : subMonths(referenceDate, Math.abs(offset));
  const periodStart = startOfMonth(anchor);
  const periodEnd = endOfMonth(anchor);

  return {
    label: formatMonth(periodStart),
    period_end: toIsoDate(periodEnd),
    period_start: toIsoDate(periodStart),
  };
}

export function getBudgetHistoryWindows(budget: BudgetRow, referenceDate: Date) {
  const historyLength = budget.period === "annual" ? 4 : 6;
  const windows: BudgetWindow[] = [];

  for (let offset = historyLength - 1; offset >= 0; offset -= 1) {
    windows.push(getBudgetWindow(budget.period, referenceDate, -offset));
  }

  return windows;
}

export function isBudgetWindowVisible(
  budget: Pick<BudgetRow, "end_date" | "start_date">,
  window: Pick<BudgetWindow, "period_end" | "period_start">,
) {
  const budgetStart = toDateOnly(budget.start_date);
  const budgetEnd = budget.end_date ? toDateOnly(budget.end_date) : null;
  const windowStart = toDateOnly(window.period_start);
  const windowEnd = toDateOnly(window.period_end);

  if (windowEnd < budgetStart) {
    return false;
  }

  if (budgetEnd && isAfter(windowStart, budgetEnd)) {
    return false;
  }

  return true;
}
