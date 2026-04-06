import type { SupabaseClient } from '@supabase/supabase-js'
import {
  calculateBudgetProgress,
  calculateChangePercent,
  getBudgetHistoryWindows,
  getBudgetStatus,
  getBudgetWindow,
  isBudgetWindowVisible,
} from '@/lib/budgets/utils'
import type {
  BudgetCategorySummary,
  BudgetHistoryPoint,
  BudgetListItem,
  BudgetsOverviewResponse,
} from '@/lib/budgets/types'
import type { Database } from '@/types/database'

type ServerClient = SupabaseClient<Database>

type BudgetSelectRow = Database['public']['Tables']['budgets']['Row'] & {
  category: BudgetCategorySummary | null
}

type BudgetTransactionRow = Pick<
  Database['public']['Tables']['transactions']['Row'],
  'amount_cents' | 'category_id' | 'transaction_date'
>

const budgetSelect = `
  id,
  user_id,
  category_id,
  period,
  limit_cents,
  currency,
  alert_threshold,
  start_date,
  end_date,
  is_active,
  created_at,
  updated_at,
  deleted_at,
  category:categories(id,name,color,icon)
`

function sumTransactionsForWindow(
  transactions: BudgetTransactionRow[],
  periodStart: string,
  periodEnd: string,
) {
  return transactions.reduce((sum, transaction) => {
    return transaction.transaction_date >= periodStart && transaction.transaction_date <= periodEnd
      ? sum + transaction.amount_cents
      : sum
  }, 0)
}

function statusOrder(status: BudgetListItem['status']) {
  switch (status) {
    case 'exceeded':
      return 0
    case 'warning':
      return 1
    case 'approaching':
      return 2
    case 'ok':
      return 3
  }
}

export async function getBudgetsOverview({
  referenceDate = new Date(),
  supabase,
  userId,
}: {
  referenceDate?: Date
  supabase: ServerClient
  userId: string
}): Promise<BudgetsOverviewResponse> {
  const { data: budgetsData, error: budgetsError } = await supabase
    .from('budgets')
    .select(budgetSelect)
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (budgetsError) {
    throw new Error(budgetsError.message)
  }

  const budgets = (budgetsData ?? []) as BudgetSelectRow[]

  if (!budgets.length) {
    return {
      budgets: [],
      summary: {
        exceeded_count: 0,
        total_available_cents: 0,
        total_limit_cents: 0,
        total_spent_cents: 0,
        warning_count: 0,
      },
    }
  }

  const historyWindows = budgets.flatMap((budget) => getBudgetHistoryWindows(budget, referenceDate))
  const earliestPeriodStart = historyWindows.reduce((minimum, window) => {
    return window.period_start < minimum ? window.period_start : minimum
  }, historyWindows[0]!.period_start)
  const latestPeriodEnd = historyWindows.reduce((maximum, window) => {
    return window.period_end > maximum ? window.period_end : maximum
  }, historyWindows[0]!.period_end)
  const categoryIds = [...new Set(budgets.map((budget) => budget.category_id))]

  const { data: spendingData, error: spendingError } = await supabase
    .from('transactions')
    .select('category_id,amount_cents,transaction_date')
    .eq('user_id', userId)
    .eq('is_income', false)
    .in('category_id', categoryIds)
    .gte('transaction_date', earliestPeriodStart)
    .lte('transaction_date', latestPeriodEnd)
    .is('deleted_at', null)

  if (spendingError) {
    throw new Error(spendingError.message)
  }

  const transactionsByCategory = new Map<string, BudgetTransactionRow[]>()

  for (const transaction of (spendingData ?? []) as BudgetTransactionRow[]) {
    if (!transactionsByCategory.has(transaction.category_id!)) {
      transactionsByCategory.set(transaction.category_id!, [])
    }

    transactionsByCategory.get(transaction.category_id!)!.push(transaction)
  }

  const items = budgets
    .map<BudgetListItem>((budget) => {
      const categoryTransactions = transactionsByCategory.get(budget.category_id) ?? []
      const currentWindow = getBudgetWindow(budget.period, referenceDate)
      const currentSpent = isBudgetWindowVisible(budget, currentWindow)
        ? sumTransactionsForWindow(
            categoryTransactions,
            currentWindow.period_start,
            currentWindow.period_end,
          )
        : 0
      const progress = calculateBudgetProgress(budget.limit_cents, currentSpent)
      const status = getBudgetStatus(progress.progress_ratio, budget.alert_threshold)
      const history = getBudgetHistoryWindows(budget, referenceDate)
        .filter((window) => isBudgetWindowVisible(budget, window))
        .map<BudgetHistoryPoint>((window) => {
          const spent = sumTransactionsForWindow(
            categoryTransactions,
            window.period_start,
            window.period_end,
          )
          const windowProgress = calculateBudgetProgress(budget.limit_cents, spent)

          return {
            available_cents: windowProgress.available_cents,
            label: window.label,
            limit_cents: budget.limit_cents,
            period_end: window.period_end,
            period_start: window.period_start,
            progress_percent: windowProgress.progress_percent,
            spent_cents: spent,
          }
        })
      const previousPoint = history.length > 1 ? history[history.length - 2] : null

      return {
        ...budget,
        available_cents: progress.available_cents,
        category: budget.category,
        comparison_delta_percent: previousPoint
          ? calculateChangePercent(currentSpent, previousPoint.spent_cents)
          : null,
        history,
        progress_percent: progress.progress_percent,
        progress_ratio: progress.progress_ratio,
        spent_cents: currentSpent,
        status,
        threshold_reached: progress.progress_ratio >= budget.alert_threshold / 100,
      }
    })
    .sort((left, right) => {
      const statusDiff = statusOrder(left.status) - statusOrder(right.status)

      if (statusDiff !== 0) {
        return statusDiff
      }

      return (left.category?.name ?? '').localeCompare(right.category?.name ?? '', 'es')
    })

  return {
    budgets: items,
    summary: {
      exceeded_count: items.filter((item) => item.status === 'exceeded').length,
      total_available_cents: items.reduce((sum, item) => sum + item.available_cents, 0),
      total_limit_cents: items.reduce((sum, item) => sum + item.limit_cents, 0),
      total_spent_cents: items.reduce((sum, item) => sum + item.spent_cents, 0),
      warning_count: items.filter((item) => item.status === 'warning').length,
    },
  }
}
