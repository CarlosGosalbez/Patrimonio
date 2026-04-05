'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useAccountsQuery,
  useCategoriesQuery,
  useCommitmentQuery,
  useCommitmentsOverviewQuery,
  useCreateCommitmentMutation,
  useDeleteCommitmentMutation,
  useSubscriptionsOverviewQuery,
  useUpdateCommitmentMutation,
} from '@/hooks/usePhaseThree'
import { formatCurrency } from '@/lib/financial/formatters'
import { CommitmentDialog } from '@/components/commitments/CommitmentDialog'

function formatTooltipValue(value: unknown) {
  if (typeof value === 'number') {
    return formatCurrency(value)
  }

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  return String(value ?? '')
}

export function CommitmentsPageClient() {
  const t = useTranslations('commitments')
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const commitmentsQuery = useCommitmentsOverviewQuery()
  const subscriptionsQuery = useSubscriptionsOverviewQuery()
  const accountsQuery = useAccountsQuery()
  const categoriesQuery = useCategoriesQuery()
  const createMutation = useCreateCommitmentMutation()
  const updateMutation = useUpdateCommitmentMutation()
  const deleteMutation = useDeleteCommitmentMutation()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const commitmentDetailQuery = useCommitmentQuery(editingId)
  const activeTab = searchParams.get('tab') === 'subscriptions' ? 'subscriptions' : 'commitments'

  const projectionChart = useMemo(
    () => commitmentsQuery.data?.projected_flow.map((point) => ({
      expense: point.projected_expense_cents,
      income: point.projected_income_cents,
      month: point.month_date,
      net: point.net_cents,
    })) ?? [],
    [commitmentsQuery.data],
  )

  async function handleSubmit(payload: Record<string, unknown>, id?: string) {
    try {
      if (id) {
        await updateMutation.mutateAsync({ id, payload })
        toast.success(t('toasts.updated'))
      } else {
        await createMutation.mutateAsync(payload)
        toast.success(t('toasts.created'))
      }

      setOpen(false)
      setEditingId(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toasts.error'))
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('confirmDelete'))) {
      return
    }

    try {
      await deleteMutation.mutateAsync(id)
      toast.success(t('toasts.deleted'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toasts.error'))
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button
          className="min-h-[48px] rounded-2xl"
          onClick={() => {
            setEditingId(null)
            setOpen(true)
          }}
        >
          {t('actions.new')}
        </Button>
      </section>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const nextParams = new URLSearchParams(searchParams.toString())
          nextParams.set('tab', value)
          router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="commitments">{t('tabs.commitments')}</TabsTrigger>
          <TabsTrigger value="subscriptions">{t('tabs.subscriptions')}</TabsTrigger>
        </TabsList>

        <TabsContent value="commitments" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
            <Card>
              <CardHeader>
                <CardTitle>{t('projectedFlow')}</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={(value) => value.slice(5, 7)} />
                    <YAxis tickFormatter={(value) => `${Math.round(value / 100)}€`} />
                    <Tooltip formatter={formatTooltipValue} />
                    <Area dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.16} />
                    <Area dataKey="expense" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.12} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('annualMatrix')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(commitmentsQuery.data?.annual_matrix ?? []).slice(0, 6).map((row) => (
                  <div key={row.commitment_id} className="rounded-2xl bg-muted/40 p-3">
                    <p className="font-medium">{row.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(row.total_cents)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('activeList')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(commitmentsQuery.data?.commitments ?? []).map((commitment) => (
                <div key={commitment.id} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{commitment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t(`types.${commitment.commitment_type}`)} · {commitment.next_due_date} · {t(`status.${commitment.status}`)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={commitment.is_income ? 'font-semibold text-emerald-600' : 'font-semibold'}>
                        {formatCurrency(commitment.is_income ? commitment.amount_cents : -commitment.amount_cents)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingId(commitment.id)
                          setOpen(true)
                        }}
                      >
                        {t('actions.edit')}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => handleDelete(commitment.id)}>
                        {t('actions.delete')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>{t('subscriptionComparison')}</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subscriptionsQuery.data?.spending_by_month ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={(value) => value.slice(5, 7)} />
                    <YAxis tickFormatter={(value) => `${Math.round(value / 100)}€`} />
                    <Tooltip formatter={formatTooltipValue} />
                    <Bar dataKey="total_cents" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('subscriptionSummary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">{t('monthlyCost')}</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatCurrency(subscriptionsQuery.data?.total_monthly_cost_cents ?? 0)}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">{t('unexpectedCharges')}</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {subscriptionsQuery.data?.unexpected_charge_count ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('tabs.subscriptions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(subscriptionsQuery.data?.subscriptions ?? []).map((subscription) => (
                <div key={subscription.id} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{subscription.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t(`subscriptionStatus.${subscription.status}`)} · {subscription.next_renewal_date ?? '—'}
                      </p>
                    </div>
                    <span className="font-semibold">{formatCurrency(-subscription.amount_cents)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CommitmentDialog
        accounts={accountsQuery.data ?? []}
        categories={categoriesQuery.data ?? []}
        commitment={commitmentDetailQuery.data ?? null}
        onOpenChange={setOpen}
        onSubmit={handleSubmit}
        open={open}
      />
    </div>
  )
}
