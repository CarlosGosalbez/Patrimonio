// ============================================================
// PHASE 7 — Reports & Export
// lib/reports/types.ts — Domain types for all report variants
// ============================================================

export type ReportPeriodType = "month" | "year";

export interface ReportPeriod {
  type: ReportPeriodType;
  month?: number; // 1-12, only for type='month'
  year: number;
  label: string; // "Noviembre 2025" | "2025"
}

// --------------- Monthly Report ---------------

export interface CategoryAmount {
  category_id: string | null;
  category_name: string;
  category_color: string | null;
  amount_cents: number;
  percent_of_total: number;
  transaction_count: number;
}

export interface TopTransaction {
  id: string;
  description: string;
  amount_cents: number;
  transaction_date: string;
  category_name: string | null;
  category_color: string | null;
}

export interface MonthlyComparison {
  income_delta_pct: number | null;
  expenses_delta_pct: number | null;
  savings_rate_delta: number | null;
  income_prev_cents: number;
  expenses_prev_cents: number;
  savings_rate_prev: number | null;
}

export interface MonthlyReport {
  period: ReportPeriod;
  income_total_cents: number;
  expenses_total_cents: number;
  net_balance_cents: number;
  savings_rate_percent: number | null;
  income_by_category: CategoryAmount[];
  expenses_by_category: CategoryAmount[];
  top_expenses: TopTransaction[];
  comparison: MonthlyComparison;
}

// --------------- Annual Report ---------------

export interface MonthlySeriesPoint {
  month: string; // "2025-01"
  label: string; // "Ene 25"
  income_cents: number;
  expenses_cents: number;
  net_cents: number;
  savings_rate_percent: number | null;
}

export interface AnnualReport {
  period: ReportPeriod;
  total_income_cents: number;
  total_expenses_cents: number;
  total_net_cents: number;
  avg_savings_rate_percent: number | null;
  monthly_series: MonthlySeriesPoint[];
  expenses_by_category: CategoryAmount[];
  income_by_category: CategoryAmount[];
  comparison_prev_year: {
    income_delta_pct: number | null;
    expenses_delta_pct: number | null;
  };
}

// --------------- IRPF Fiscal Report ---------------

export interface SaleOperationRow {
  investment_name: string;
  ticker: string;
  operation_date: string;
  quantity: number;
  sell_price_cents: number;
  avg_purchase_price_cents: number;
  gross_gain_cents: number;
  is_gain: boolean;
}

export interface DividendRow {
  investment_name: string;
  ticker: string;
  operation_date: string;
  gross_amount_cents: number;
  withheld_amount_cents: number;
  net_amount_cents: number;
}

export interface FiscalReport {
  fiscal_year: number;
  capital_gains: {
    total_gains_cents: number;
    total_losses_cents: number;
    net_cents: number;
    operations: SaleOperationRow[];
  };
  dividends: {
    gross_total_cents: number;
    withheld_total_cents: number;
    net_total_cents: number;
    rows: DividendRow[];
  };
  disclaimer: string;
}

// --------------- GDPR Data Export ---------------

export interface GdprExportData {
  exported_at: string;
  user_id: string;
  profile: Record<string, unknown>;
  accounts: unknown[];
  categories: unknown[];
  transactions: unknown[];
  recurring_commitments: unknown[];
  investments: unknown[];
  investment_operations: unknown[];
  budgets: unknown[];
  notifications: unknown[];
}

// --------------- Period Comparison ---------------

export interface PeriodComparisonReport {
  current: {
    label: string;
    income_cents: number;
    expenses_cents: number;
    net_cents: number;
    savings_rate_percent: number | null;
  };
  previous: {
    label: string;
    income_cents: number;
    expenses_cents: number;
    net_cents: number;
    savings_rate_percent: number | null;
  };
  income_delta_pct: number | null;
  expenses_delta_pct: number | null;
  net_delta_pct: number | null;
  savings_rate_delta: number | null;
}
