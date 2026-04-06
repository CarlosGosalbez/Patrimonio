import type { Database } from '@/types/database'
import type { NetWorthHistoryPoint } from '@/lib/analytics/types'

export type InvestmentRow = Database['public']['Tables']['investments']['Row']
export type InvestmentOperationRow = Database['public']['Tables']['investment_operations']['Row']
export type InvestmentType = Database['public']['Enums']['investment_type']
export type OperationType = Database['public']['Enums']['operation_type']
export type FrequencyType = Database['public']['Enums']['frequency_type']

export interface InvestmentSearchResult {
  currency: string
  exchange: string | null
  market_cap: number | null
  name: string
  type: string | null
  ticker: string
}

export type TickerSearchResult = InvestmentSearchResult

export interface InvestmentAccountSummary {
  color: string | null
  currency: string
  icon: string | null
  id: string
  name: string
}

export interface InvestmentDistributionItem {
  color: string | null
  label: string
  value_cents: number
}

export interface RealizedSaleItem {
  cost_basis_cents: number
  investment_id: string
  investment_name: string
  operation_date: string
  operation_id: string
  proceeds_cents: number
  quantity: number
  realized_pl_cents: number
  ticker: string
}

export interface DividendCalendarItem {
  account: InvestmentAccountSummary | null
  annual_income_cents: number
  estimated_payment_cents: number
  investment_id: string
  name: string
  next_dividend_date: string
  ticker: string
}

export interface InvestmentOperationListItem extends InvestmentOperationRow {
  investment: {
    id: string
    investment_type: InvestmentType
    name: string
    ticker: string
  }
  realized_pl_cents: number | null
}

export interface InvestmentListItem extends InvestmentRow {
  account: InvestmentAccountSummary | null
  annual_dividend_income_cents: number
  current_change_cents: number | null
  current_change_percent: number | null
  current_data_source: string | null
  current_source_updated_at: string | null
  current_value_base_cents: number
  estimated_next_dividend_cents: number
  is_price_stale: boolean
  realized_pl_cents: number
  total_invested_base_cents: number
  unrealized_pl_cents: number
  unrealized_pl_percent: number | null
}

export interface InvestmentsOverviewResponse {
  as_of: string | null
  base_currency: string
  dividend_calendar: DividendCalendarItem[]
  distribution: {
    by_currency: InvestmentDistributionItem[]
    by_sector: InvestmentDistributionItem[]
    by_type: InvestmentDistributionItem[]
  }
  evolution: NetWorthHistoryPoint[]
  irpf: {
    disclaimer: string
    dividends_received_cents: number
    net_dividends_cents: number
    rows: InvestmentOperationListItem[]
    withholding_cents: number
    year: number
  }
  operations: InvestmentOperationListItem[]
  positions: InvestmentListItem[]
  realized_sales: RealizedSaleItem[]
  summary: {
    active_positions: number
    annual_dividend_income_cents: number
    day_change_cents: number
    day_change_percent: number | null
    realized_pl_cents: number
    stale_quotes: number
    total_invested_cents: number
    total_value_cents: number
    unrealized_pl_cents: number
    unrealized_pl_percent: number | null
  }
}
