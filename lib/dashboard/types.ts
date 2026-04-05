import type { Database } from '@/types/database'
import type { TransactionListItem } from '@/lib/transactions/types'

export interface DashboardHeroSummary {
  cash_cents: number
  currency: string
  investments_cents: number
  month_delta_cents: number
  total_cents: number
}

export interface DashboardProjectionPoint {
  horizon_days: 30 | 60 | 90
  net_cents: number
}

export interface DashboardTopCategory {
  amount_cents: number
  category_id: string | null
  color: string | null
  name: string
  transaction_count: number
}

export interface DashboardActiveAlertCounts {
  insufficient_balance: number
  over_budget: number
  subscription_unexpected_charge: number
  upcoming_custom_alerts: number
  expected_income_unpaid: number
}

export interface DashboardUpcomingAlert {
  amount_cents: number | null
  due_date: string
  id: string
  name: string
  recurrence: Database['public']['Enums']['alert_recurrence_type']
  severity: 'critical' | 'warning' | 'info'
}

export interface DashboardPortfolioSummary {
  active_positions: number
  day_pl_cents: number
  total_value_cents: number
}

export interface DashboardSummaryResponse {
  active_alert_counts: DashboardActiveAlertCounts
  monthly_balance_cents: number
  monthly_expense_cents: number
  monthly_income_cents: number
  portfolio: DashboardPortfolioSummary
  projected_flow: DashboardProjectionPoint[]
  recent_transactions: TransactionListItem[]
  top_categories: DashboardTopCategory[]
  upcoming_commitments: {
    amount_cents: number
    commitment_type: Database['public']['Enums']['commitment_type_enum']
    id: string
    is_income: boolean
    name: string
    next_due_date: string
  }[]
  upcoming_deadlines: DashboardUpcomingAlert[]
  hero: DashboardHeroSummary
}

export type DashboardWidgetId =
  | 'monthly-balance'
  | 'projected-flow'
  | 'top-categories'
  | 'upcoming-commitments'
  | 'upcoming-deadlines'
  | 'portfolio'
  | 'active-alerts'
  | 'recent-transactions'
