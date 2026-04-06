import type { Database } from '@/types/database'

export type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year'

export interface AnalyticsRange {
  end: string
  label: string
  start: string
}

export interface AnalyticsSeriesPoint {
  expense_cents: number
  income_cents: number
  label: string
  net_cents: number
  period_end: string
  period_start: string
}

export interface AnalyticsTotals {
  expense_cents: number
  income_cents: number
  net_cents: number
  savings_rate_percent: number | null
  transaction_count: number
}

export interface NetWorthHistoryPoint {
  snapshot_date: string
  total_invested_cents: number
  total_value_cents: number
  unrealized_pl_cents: number
}

export interface CategoryTrendPoint {
  label: string
  month: string
  total_cents: number
}

export interface CategoryTrendRow {
  category_color: string | null
  category_id: string
  category_name: string
  current_period_cents: number
  delta_percent: number | null
  is_growing: boolean
  monthly_series: CategoryTrendPoint[]
  previous_period_cents: number
}

export interface MonthlyTrendCard {
  average_3m_cents: number
  category_color: string | null
  category_id: string
  category_name: string
  current_month_cents: number
  delta_percent: number | null
}

export interface SpendingAnomaly {
  category_color: string | null
  category_id: string
  category_name: string
  current_month_cents: number
  historical_mean_cents: number
  historical_stddev_cents: number
  percent_above_mean: number
  severity: 'warning' | 'critical'
  z_score: number
}

export interface AnalyticsNotification {
  created_at: string
  id: string
  message: string
  severity: Database['public']['Enums']['alert_severity']
  target_id: string | null
  target_type: string | null
  title: string
  type: Database['public']['Enums']['notification_type']
}

export interface AnalyticsSummaryResponse {
  anomalies: SpendingAnomaly[]
  category_trends: CategoryTrendRow[]
  monthly_trend_cards: MonthlyTrendCard[]
  net_worth_history: NetWorthHistoryPoint[]
  notifications: AnalyticsNotification[]
  period: AnalyticsPeriod
  range: AnalyticsRange
  series: AnalyticsSeriesPoint[]
  totals: AnalyticsTotals
}
