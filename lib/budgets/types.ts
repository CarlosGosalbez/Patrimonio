import type { Database } from "@/types/database";

export type BudgetRow = Database["public"]["Tables"]["budgets"]["Row"];
export type BudgetPeriod = Database["public"]["Enums"]["budget_period"];

export type BudgetStatus = "ok" | "approaching" | "warning" | "exceeded";

export interface BudgetCategorySummary {
  color: string | null;
  icon: string | null;
  id: string;
  name: string;
}

export interface BudgetHistoryPoint {
  available_cents: number;
  label: string;
  limit_cents: number;
  period_end: string;
  period_start: string;
  progress_percent: number;
  spent_cents: number;
}

export interface BudgetListItem extends BudgetRow {
  available_cents: number;
  category: BudgetCategorySummary | null;
  comparison_delta_percent: number | null;
  history: BudgetHistoryPoint[];
  progress_percent: number;
  progress_ratio: number;
  spent_cents: number;
  status: BudgetStatus;
  threshold_reached: boolean;
}

export interface BudgetsOverviewResponse {
  budgets: BudgetListItem[];
  summary: {
    exceeded_count: number;
    total_available_cents: number;
    total_limit_cents: number;
    total_spent_cents: number;
    warning_count: number;
  };
}
