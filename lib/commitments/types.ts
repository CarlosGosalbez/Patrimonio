import type { Database } from '@/types/database'
import type { CustomAlertListItem as AlertDeadlineListItem } from '@/lib/alerts/types'
import type { TransactionListItem } from '@/lib/transactions/types'

export type CommitmentRow = Database['public']['Tables']['recurring_commitments']['Row']
export type CustomAlertRow = Database['public']['Tables']['custom_alerts']['Row']
export type AlertRecurrence = Database['public']['Enums']['alert_recurrence_type']
export type CommitmentFrequency = Database['public']['Enums']['frequency_type']
export type CommitmentStatus = 'active' | 'paused' | 'expired'

export interface TransactionAccountSummary {
  color: string | null
  currency: string
  icon: string | null
  id: string
  name: string
}

export interface TransactionCategorySummary {
  color: string | null
  icon: string | null
  id: string
  is_income: boolean
  name: string
  user_id: string | null
}

export interface CommitmentListItem extends CommitmentRow {
  account: TransactionAccountSummary | null
  category: TransactionCategorySummary | null
  monthly_equivalent_cents: number
  next_due_in_days: number
  status: CommitmentStatus
}

export interface TimelineCommitmentCell {
  amount_cents: number
  commitment_id: string
  commitment_type: Database['public']['Enums']['commitment_type_enum']
  is_income: boolean
  name: string
  occurs: boolean
}

export interface TimelineMonth {
  commitments: TimelineCommitmentCell[]
  label: string
  month: string
  total_cents: number
}

export interface AnnualMatrixCell {
  amount_cents: number
  month: string
  occurs: boolean
}

export interface AnnualMatrixRow {
  cells: AnnualMatrixCell[]
  commitment_id: string
  name: string
  status: 'active' | 'paused' | 'expired'
  total_cents: number
}

export interface ProjectedFlowPoint {
  cumulative_cash_cents: number
  month_date: string
  net_cents: number
  projected_expense_cents: number
  projected_income_cents: number
}

export interface ProjectedBucket {
  label: string
  net_cents: number
}

export interface CommitmentsOverviewResponse {
  annual_matrix: AnnualMatrixRow[]
  commitments: CommitmentListItem[]
  deficit_alert: {
    month_date: string
    projected_balance_cents: number
  } | null
  projected_flow: ProjectedFlowPoint[]
  timeline: TimelineMonth[]
  upcoming_due: CommitmentListItem[]
}

export interface SubscriptionListItem extends Omit<CommitmentListItem, 'status'> {
  latest_matching_charge_cents: number | null
  latest_matching_charge_date: string | null
  latest_matching_charge_description: string | null
  next_renewal_date: string | null
  status: 'active' | 'paused' | 'cancelled' | 'unexpected_charge'
}

export interface SubscriptionsOverviewResponse {
  spending_by_month: Array<{
    label: string
    month: string
    total_cents: number
  }>
  subscriptions: SubscriptionListItem[]
  total_monthly_cost_cents: number
  unexpected_charge_count: number
}

export interface BudgetPressure {
  budget_id: string
  category_name: string
  progress_ratio: number
  spent_cents: number
  threshold_percent: number
}

export interface ActiveAlertItem {
  amount_cents: number | null
  detail: string
  due_date: string | null
  href: string
  id: string
  severity: Database['public']['Enums']['alert_severity']
  title: string
  type:
    | 'over_budget'
    | 'subscription_unexpected_charge'
    | 'expected_income_unpaid'
    | 'custom_alert_due'
    | 'insufficient_balance'
}

export interface DashboardSummaryResponse {
  active_alerts: {
    custom_alert_due: number
    expected_income_unpaid: number
    insufficient_balance: number
    items: ActiveAlertItem[]
    over_budget: number
    subscription_unexpected_charge: number
    total: number
  }
  hero: {
    cash_cents: number
    currency: string
    investments_cents: number
    monthly_delta_cents: number
    total_cents: number
  }
  monthly_balance: {
    balance_cents: number
    expense_cents: number
    income_cents: number
  }
  portfolio_summary: {
    day_pnl_cents: number
    total_value_cents: number
  }
  projected_flow: {
    buckets: ProjectedBucket[]
    points: ProjectedFlowPoint[]
  }
  recent_transactions: TransactionListItem[]
  top_categories: Array<{
    category_id: string | null
    color: string | null
    name: string
    total_cents: number
    transaction_count: number
  }>
  upcoming_commitments: CommitmentListItem[]
  upcoming_deadlines: AlertDeadlineListItem[]
}
