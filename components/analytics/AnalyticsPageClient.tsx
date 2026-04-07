'use client'

import { useMemo, useState } from 'react'
import { Download, LineChart, PiggyBank, Siren, Target } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BudgetDialog } from '@/components/analytics/BudgetDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCategoriesQuery } from '@/hooks/usePhaseThree'
import {
  useAnalyticsSummaryQuery,
  useBudgetsOverviewQuery,
  useCreateBudgetMutation,
  useDeleteBudgetMutation,
  useUpdateBudgetMutation,
} from '@/hooks/usePhaseFive'
import type { AnalyticsPeriod } from '@/lib/analytics/types'
import { formatCurrency, formatCurrencyCompact, formatPercentChange } from '@/lib/financial/formatters'

function formatTooltipCurrency(value: unknown) {
  if (typeof value !== 'number') {
    return String(value ?? '')
  }

  return formatCurrency(value)
}

function getBudgetTone(status: 'approaching' | 'exceeded' | 'ok' | 'warning') {
  switch (status) {
    case 'exceeded':
      return 'bg-rose-500'
    case 'warning':
      return 'bg-amber-500'
    case 'approaching':
      return 'bg-orange-400'
    case 'ok':
      return 'bg-emerald-500'
  }
}

function getBudgetRuleTone(status: 'over' | 'under' | 'within') {
  switch (status) {
    case 'over':
      return 'bg-rose-100 text-rose-700'
    case 'under':
      return 'bg-amber-100 text-amber-700'
    case 'within':
      return 'bg-emerald-100 text-emerald-700'
  }
}

function MetricCard({
  detail,
  label,
  value,
}: {
  detail?: string
  label: string
  value: string
}) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        {detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  )
}

function ProgressBar({
  progress,
  status,
}: {
  progress: number
  status: 'approaching' | 'exceeded' | 'ok' | 'warning'
}) {
  return (
    <div className="space-y-2">
      <div className="h-3 rounded-full bg-muted">
        <div
          className={`h-3 rounded-full transition-all ${getBudgetTone(status)}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  )
}

export function AnalyticsPageClient() {
  const t = useTranslations('analytics')
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [openBudgetDialog, setOpenBudgetDialog] = useState(false)
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const analyticsQuery = useAnalyticsSummaryQuery(period)
  const budgetsQuery = useBudgetsOverviewQuery()
  const categoriesQuery = useCategoriesQuery('expense')
  const createBudgetMutation = useCreateBudgetMutation()
  const updateBudgetMutation = useUpdateBudgetMutation()
  const deleteBudgetMutation = useDeleteBudgetMutation()

  const budgets = budgetsQuery.data?.budgets ?? []
  const selectedBudget = budgets.find((budget) => budget.id === editingBudgetId) ?? null

  const categoryComparisonData = useMemo(() => {
    return (analyticsQuery.data?.category_trends ?? []).map((category) => ({
      current: category.current_period_cents,
      name: category.category_name,
      previous: category.previous_period_cents,
    }))
  }, [analyticsQuery.data?.category_trends])

  async function handleBudgetSubmit(payload: Record<string, unknown>, id?: string) {
    try {
      if (id) {
        await updateBudgetMutation.mutateAsync({ id, payload })
        toast.success(t('budgets.toasts.updated'))
      } else {
        await createBudgetMutation.mutateAsync(payload)
        toast.success(t('budgets.toasts.created'))
      }

      setOpenBudgetDialog(false)
      setEditingBudgetId(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('budgets.toasts.error'))
    }
  }

  async function handleDeleteBudget(id: string) {
    setConfirmDeleteId(id)
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteId) return

    try {
      await deleteBudgetMutation.mutateAsync(confirmDeleteId)
      toast.success(t('budgets.toasts.deleted'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('budgets.toasts.error'))
    } finally {
      setConfirmDeleteId(null)
    }
  }

  async function handleExportCsv() {
    try {
      const response = await fetch(`/api/analytics/export?period=${period}`)

      if (!response.ok) {
        throw new Error(t('toasts.exportError'))
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `patrimio-${period}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success(t('toasts.exported'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toasts.exportError'))
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-border/70 bg-[linear-gradient(135deg,rgba(14,116,144,0.12),rgba(15,118,110,0.08),rgba(255,255,255,0.94))] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="grid grid-cols-4 gap-2 rounded-2xl bg-muted/50 p-1">
              {(['week', 'month', 'quarter', 'year'] as AnalyticsPeriod[]).map((item) => (
                <Button
                  key={item}
                  size="sm"
                  type="button"
                  variant={period === item ? 'default' : 'ghost'}
                  onClick={() => setPeriod(item)}
                >
                  {t(`periods.${item}`)}
                </Button>
              ))}
            </div>
            <Button type="button" variant="outline" className="rounded-2xl" onClick={handleExportCsv}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('actions.export')}
            </Button>
            <Button
              type="button"
              className="rounded-2xl"
              onClick={() => {
                setEditingBudgetId(null)
                setOpenBudgetDialog(true)
              }}
            >
              <Target className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('actions.newBudget')}
            </Button>
          </div>
        </div>
      </section>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="budgets">{t('tabs.budgets')}</TabsTrigger>
          <TabsTrigger value="categories">{t('tabs.categories')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={t('metrics.income')}
              value={formatCurrency(analyticsQuery.data?.totals.income_cents ?? 0)}
            />
            <MetricCard
              label={t('metrics.expenses')}
              value={formatCurrency(-(analyticsQuery.data?.totals.expense_cents ?? 0))}
            />
            <MetricCard
              detail={analyticsQuery.data?.range.label}
              label={t('metrics.net')}
              value={formatCurrency(analyticsQuery.data?.totals.net_cents ?? 0)}
            />
            <MetricCard
              detail={String(analyticsQuery.data?.totals.transaction_count ?? 0)}
              label={t('metrics.savingsRate')}
              value={
                analyticsQuery.data?.totals.savings_rate_percent == null
                  ? t('metrics.notAvailable')
                  : formatPercentChange(analyticsQuery.data?.totals.savings_rate_percent ?? 0)
              }
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.5fr,1fr]">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>{t('charts.periodSummary')}</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                  <BarChart data={analyticsQuery.data?.series ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={(value) => formatCurrencyCompact(value)} />
                    <Tooltip formatter={formatTooltipCurrency} />
                    <Bar dataKey="income_cents" fill="hsl(160 84% 39%)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="expense_cents" fill="hsl(0 84% 60%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>{t('charts.netWorth')}</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {analyticsQuery.data?.net_worth_history.length ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                    <AreaChart data={analyticsQuery.data.net_worth_history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="snapshot_date"
                        tickFormatter={(value) => value.slice(2, 7)}
                      />
                      <YAxis tickFormatter={(value) => formatCurrencyCompact(value)} />
                      <Tooltip formatter={formatTooltipCurrency} />
                      <Area
                        dataKey="total_value_cents"
                        fill="hsl(195 85% 45% / 0.2)"
                        stroke="hsl(195 85% 40%)"
                        type="monotone"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-3xl bg-muted/40 text-sm text-muted-foreground">
                    {t('states.noSnapshots')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>{t('budgetRule.title')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {(
                  [
                    ['needs', analyticsQuery.data?.budget_rule_503020.needs],
                    ['wants', analyticsQuery.data?.budget_rule_503020.wants],
                    ['savings', analyticsQuery.data?.budget_rule_503020.savings],
                  ] as const
                ).map(([key, bucket]) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{t(`budgetRule.labels.${key}`)}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('budgetRule.target', {
                            percent: bucket?.target_percent ?? 0,
                          })}
                        </p>
                      </div>
                      <Badge className={getBudgetRuleTone(bucket?.status ?? 'within')}>
                        {t(`budgetRule.status.${bucket?.status ?? 'within'}`)}
                      </Badge>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('budgetRule.actual')}</p>
                        <p className="mt-1 font-semibold">
                          {formatCurrency(bucket?.actual_cents ?? 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('budgetRule.ideal')}</p>
                        <p className="mt-1 font-semibold">
                          {formatCurrency(bucket?.ideal_cents ?? 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('budgetRule.percent')}</p>
                        <p className="mt-1 font-semibold">
                          {bucket?.percent_of_income == null
                            ? t('metrics.notAvailable')
                            : formatPercentChange(bucket.percent_of_income)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <p className="text-xs text-muted-foreground">
                  {t('budgetRule.uncategorized', {
                    amount: formatCurrency(
                      analyticsQuery.data?.budget_rule_503020.uncategorized_expense_cents ?? 0,
                    ),
                  })}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>{t('topCategoriesWidget.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(analyticsQuery.data?.top_categories_widget ?? []).map((category) => (
                  <div
                    key={category.category_id ?? category.category_name}
                    className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: category.category_color ?? '#0f766e' }}
                        />
                        <div>
                          <p className="font-medium">{category.category_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {category.transaction_count} {t('topCategoriesWidget.movements')}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">{formatCurrency(category.amount_cents)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          category.budget_status === 'exceeded'
                            ? 'destructive'
                            : category.budget_status === 'warning'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {t(`topCategoriesWidget.status.${category.budget_status}`)}
                      </Badge>
                      {category.over_budget ? (
                        <Badge variant="destructive">{t('topCategoriesWidget.overBudget')}</Badge>
                      ) : null}
                      {category.budget_limit_cents ? (
                        <p className="text-xs text-muted-foreground">
                          {t('topCategoriesWidget.limit', {
                            amount: formatCurrency(category.budget_limit_cents),
                          })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>{t('cards.monthlyTrends')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(analyticsQuery.data?.monthly_trend_cards ?? []).map((card) => (
                  <div
                    key={card.category_id}
                    className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: card.category_color ?? '#0f766e' }}
                        />
                        <div>
                          <p className="font-medium">{card.category_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('cards.avgThreeMonths', {
                              amount: formatCurrency(card.average_3m_cents),
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(card.current_month_cents)}</p>
                        <p className="text-xs text-muted-foreground">
                          {card.delta_percent === null
                            ? t('metrics.notAvailable')
                            : formatPercentChange(card.delta_percent)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>{t('cards.anomalies')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(analyticsQuery.data?.anomalies ?? []).length ? (
                  (analyticsQuery.data?.anomalies ?? []).map((anomaly) => (
                    <div
                      key={anomaly.category_id}
                      className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Siren
                            className={
                              anomaly.severity === 'critical'
                                ? 'mt-0.5 h-4 w-4 text-rose-600'
                                : 'mt-0.5 h-4 w-4 text-amber-500'
                            }
                          />
                          <div>
                            <p className="font-medium">{anomaly.category_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('anomalies.detail', {
                                mean: formatCurrency(anomaly.historical_mean_cents),
                                percent: formatPercentChange(anomaly.percent_above_mean),
                              })}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">{`z=${anomaly.z_score}`}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                    {t('states.noAnomalies')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>{t('cards.notifications')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(analyticsQuery.data?.notifications ?? []).length ? (
                (analyticsQuery.data?.notifications ?? []).map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                    </div>
                    <Badge variant="secondary">{t(`notifications.${notification.type}`)}</Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                  {t('states.noNotifications')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={t('budgets.metrics.totalLimit')}
              value={formatCurrency(budgetsQuery.data?.summary.total_limit_cents ?? 0)}
            />
            <MetricCard
              label={t('budgets.metrics.totalSpent')}
              value={formatCurrency(-(budgetsQuery.data?.summary.total_spent_cents ?? 0))}
            />
            <MetricCard
              label={t('budgets.metrics.available')}
              value={formatCurrency(budgetsQuery.data?.summary.total_available_cents ?? 0)}
            />
            <MetricCard
              label={t('budgets.metrics.exceeded')}
              value={String(budgetsQuery.data?.summary.exceeded_count ?? 0)}
            />
          </div>

          {budgets.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {budgets.map((budget) => (
                <Card key={budget.id} className="border-border/70">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{budget.category?.name}</CardTitle>
                        <Badge variant="secondary">{t(`budgets.status.${budget.status}`)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t(`budgets.periods.${budget.period}`)} · {t('budgets.thresholdLabel', { percent: budget.alert_threshold })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingBudgetId(budget.id)
                          setOpenBudgetDialog(true)
                        }}
                      >
                        {t('actions.edit')}
                      </Button>
                      {confirmDeleteId === budget.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            type="button"
                            variant="destructive"
                            disabled={deleteBudgetMutation.isPending}
                            onClick={handleConfirmDelete}
                          >
                            {t('actions.confirmDelete')}
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            variant="ghost"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            {t('actions.cancel')}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => handleDeleteBudget(budget.id)}
                        >
                          {t('actions.delete')}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-muted/40 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {t('budgets.metrics.spent')}
                        </p>
                        <p className="mt-2 text-lg font-semibold">
                          {formatCurrency(-budget.spent_cents)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/40 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {t('budgets.metrics.limit')}
                        </p>
                        <p className="mt-2 text-lg font-semibold">
                          {formatCurrency(budget.limit_cents)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/40 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {t('budgets.metrics.availableCategory')}
                        </p>
                        <p className="mt-2 text-lg font-semibold">
                          {formatCurrency(budget.available_cents)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('budgets.progress')}</span>
                        <span className="font-medium">{budget.progress_percent}%</span>
                      </div>
                      <ProgressBar progress={budget.progress_percent} status={budget.status} />
                    </div>

                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%" minHeight={160}>
                        <BarChart data={budget.history}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis hide />
                          <Tooltip formatter={formatTooltipCurrency} />
                          <Bar dataKey="spent_cents" fill="hsl(195 85% 40%)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {budget.comparison_delta_percent === null
                        ? t('metrics.notAvailable')
                        : t('budgets.comparison', {
                          change: formatPercentChange(budget.comparison_delta_percent),
                        })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border/70">
              <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                <PiggyBank className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">{t('budgets.empty.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('budgets.empty.subtitle')}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>{t('charts.categoryComparison')}</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                <BarChart data={categoryComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatCurrencyCompact(value)} />
                  <Tooltip formatter={formatTooltipCurrency} />
                  <Bar dataKey="current" fill="hsl(160 84% 39%)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="previous" fill="hsl(195 85% 40%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {(analyticsQuery.data?.category_trends ?? []).slice(0, 4).map((category) => (
              <Card key={category.category_id} className="border-border/70">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg">{category.category_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {category.delta_percent === null
                        ? t('metrics.notAvailable')
                        : formatPercentChange(category.delta_percent)}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {category.is_growing ? t('categories.growing') : t('categories.stable')}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-muted/40 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {t('categories.currentPeriod')}
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        {formatCurrency(-category.current_period_cents)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/40 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {t('categories.previousPeriod')}
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        {formatCurrency(-category.previous_period_cents)}
                      </p>
                    </div>
                  </div>

                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%" minHeight={144}>
                      <RechartsLineChart data={category.monthly_series}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" hide />
                        <YAxis hide />
                        <Tooltip formatter={formatTooltipCurrency} />
                        <Line
                          dataKey="total_cents"
                          dot={false}
                          stroke={category.category_color ?? 'hsl(195 85% 40%)'}
                          strokeWidth={2}
                          type="monotone"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <BudgetDialog
        budget={selectedBudget}
        categories={(categoriesQuery.data ?? []).map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        onOpenChange={setOpenBudgetDialog}
        onSubmit={handleBudgetSubmit}
        open={openBudgetDialog}
      />
    </div>
  )
}
