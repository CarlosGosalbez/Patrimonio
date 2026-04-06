'use client'

import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Landmark, Plus, RefreshCcw } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { InvestmentOperationDialog } from '@/components/investments/InvestmentOperationDialog'
import { InvestmentPositionDialog } from '@/components/investments/InvestmentPositionDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAccountsQuery } from '@/hooks/usePhaseThree'
import { useCreateInvestmentMutation, useCreateInvestmentOperationMutation, useDeleteInvestmentMutation, useDeleteInvestmentOperationMutation, useInvestmentsOverviewQuery, useUpdateInvestmentMutation } from '@/hooks/usePhaseSix'
import { useMarketRealtime } from '@/hooks/useMarketRealtime'
import { formatCurrency, formatCurrencyCompact, formatPercentChange } from '@/lib/financial/formatters'
import type { InvestmentDistributionItem, InvestmentListItem } from '@/lib/investments/types'

const colors = ['hsl(var(--primary))', 'hsl(var(--ring))', 'hsl(var(--accent-foreground))', 'hsl(var(--destructive))']
const toDate = (value: string) => new Date(`${value}T12:00:00`)

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <Card className="border-border/70 bg-card/95"><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>{detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}</CardContent></Card>
}

function Allocation({ currency, data, empty, title }: { currency: string; data: InvestmentDistributionItem[]; empty: string; title: string }) {
  return (
    <Card className="border-border/70">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[200px,1fr]">
        <div className="h-52">{data.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value_cents" nameKey="label" innerRadius={48} outerRadius={80} paddingAngle={3}>{data.map((item, index) => <Cell key={`${item.label}-${index}`} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value) => typeof value === 'number' ? formatCurrency(value, currency) : String(value ?? '')} /></PieChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-3xl bg-muted/30 px-4 text-center text-sm text-muted-foreground">{empty}</div>}</div>
        <div className="space-y-3">{data.map((item, index) => <div key={`${item.label}-${index}`} className="flex items-center justify-between rounded-2xl bg-muted/30 px-4 py-3"><div className="flex items-center gap-3"><span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} /><p className="font-medium">{item.label}</p></div><p className="font-semibold">{formatCurrency(item.value_cents, currency)}</p></div>)}</div>
      </CardContent>
    </Card>
  )
}

export function InvestmentsPageClient() {
  useMarketRealtime()
  const t = useTranslations('investments')
  const f = useFormatter()
  const [year, setYear] = useState(new Date().getFullYear())
  const [positionOpen, setPositionOpen] = useState(false)
  const [operationOpen, setOperationOpen] = useState(false)
  const [editing, setEditing] = useState<InvestmentListItem | null>(null)
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null)
  const [confirmDeletePositionId, setConfirmDeletePositionId] = useState<string | null>(null)
  const [confirmDeleteOperationId, setConfirmDeleteOperationId] = useState<string | null>(null)
  const overviewQuery = useInvestmentsOverviewQuery(year)
  const accountsQuery = useAccountsQuery()
  const createInvestment = useCreateInvestmentMutation(year)
  const updateInvestment = useUpdateInvestmentMutation(year)
  const deleteInvestment = useDeleteInvestmentMutation(year)
  const createOperation = useCreateInvestmentOperationMutation(year)
  const deleteOperation = useDeleteInvestmentOperationMutation(year)

  const overview = overviewQuery.data
  const baseCurrency = overview?.base_currency ?? 'EUR'
  const positions = overview?.positions ?? []
  const distribution = useMemo(() => ({
    byCurrency: overview?.distribution.by_currency ?? [],
    bySector: overview?.distribution.by_sector.map((item) => ({ ...item, label: item.label === 'unassigned' ? t('distributions.uncategorizedSector') : item.label })) ?? [],
    byType: overview?.distribution.by_type.map((item) => ({ ...item, label: t(`types.${item.label}`) })) ?? [],
  }), [overview?.distribution, t])

  const date = (value: string) => f.dateTime(toDate(value), { day: '2-digit', month: 'short', year: 'numeric' })
  const dateTime = (value: string) => f.dateTime(new Date(value), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const units = (value: number) => f.number(value, { maximumFractionDigits: 8 })

  async function handleConfirmDeletePosition() {
    if (!confirmDeletePositionId) return
    try {
      await deleteInvestment.mutateAsync(confirmDeletePositionId)
      toast.success(t('toasts.positionDeleted'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toasts.error'))
    } finally {
      setConfirmDeletePositionId(null)
    }
  }

  async function handleConfirmDeleteOperation() {
    if (!confirmDeleteOperationId) return
    const op = overview?.operations.find((o) => o.id === confirmDeleteOperationId)
    if (!op) { setConfirmDeleteOperationId(null); return }
    try {
      await deleteOperation.mutateAsync({ investmentId: op.investment_id, operationId: op.id })
      toast.success(t('toasts.operationDeleted'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toasts.error'))
    } finally {
      setConfirmDeleteOperationId(null)
    }
  }

  async function savePosition(payload: Record<string, unknown>, id?: string) {
    try {
      if (id) { await updateInvestment.mutateAsync({ id, payload }); toast.success(t('toasts.positionUpdated')) } else { await createInvestment.mutateAsync(payload); toast.success(t('toasts.positionCreated')) }
      setEditing(null); setPositionOpen(false)
    } catch (error) { toast.error(error instanceof Error ? error.message : t('toasts.error')) }
  }

  async function saveOperation(investmentId: string, payload: Record<string, unknown>) {
    try {
      await createOperation.mutateAsync({ investmentId, payload })
      toast.success(t('toasts.operationCreated'))
      setSelectedInvestmentId(null); setOperationOpen(false)
    } catch (error) { toast.error(error instanceof Error ? error.message : t('toasts.error')) }
  }

  async function downloadExport() {
    try {
      const response = await fetch(`/api/investments/export?year=${year}`)
      if (!response.ok) throw new Error(t('toasts.exportError'))
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `patrimio-investments-${year}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success(t('toasts.exported'))
    } catch (error) { toast.error(error instanceof Error ? error.message : t('toasts.exportError')) }
  }

  if (overviewQuery.isError) return <Card className="border-destructive/40"><CardContent className="p-6"><p role="alert" className="text-sm text-destructive">{overviewQuery.error instanceof Error ? overviewQuery.error.message : t('toasts.error')}</p></CardContent></Card>

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-border/70 bg-gradient-to-br from-primary/10 via-background to-secondary/80 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2"><Badge variant="secondary" className="rounded-full px-3 py-1"><Landmark className="mr-1 h-3.5 w-3.5" aria-hidden="true" />{t('badge')}</Badge><div><h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('subtitle')}</p></div></div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="investments-year">{t('fields.year')}</label>
            <select id="investments-year" className="min-h-[44px] rounded-2xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={year} onChange={(event) => setYear(Number(event.target.value))}>{Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((option) => <option key={option} value={option}>{option}</option>)}</select>
            <Button type="button" variant="outline" className="rounded-2xl" disabled={overviewQuery.isFetching} onClick={() => void overviewQuery.refetch()}><RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />{t('actions.refresh')}</Button>
            <Button type="button" variant="outline" className="rounded-2xl" onClick={() => void downloadExport()}><Download className="mr-2 h-4 w-4" aria-hidden="true" />{t('actions.export')}</Button>
            {positions.length ? <Button type="button" variant="outline" className="rounded-2xl" onClick={() => { setSelectedInvestmentId(positions[0]?.id ?? null); setOperationOpen(true) }}><Plus className="mr-2 h-4 w-4" aria-hidden="true" />{t('actions.newOperation')}</Button> : null}
            <Button type="button" className="rounded-2xl" onClick={() => { setEditing(null); setPositionOpen(true) }}><Plus className="mr-2 h-4 w-4" aria-hidden="true" />{t('actions.newPosition')}</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('summary.totalValue')} value={formatCurrency(overview?.summary.total_value_cents ?? 0, baseCurrency)} detail={t('summary.positions', { count: overview?.summary.active_positions ?? 0 })} />
        <Stat label={t('summary.unrealizedPnL')} value={formatCurrency(overview?.summary.unrealized_pl_cents ?? 0, baseCurrency)} detail={overview?.summary.unrealized_pl_percent == null ? undefined : formatPercentChange(overview.summary.unrealized_pl_percent)} />
        <Stat label={t('summary.realizedPnL')} value={formatCurrency(overview?.summary.realized_pl_cents ?? 0, baseCurrency)} detail={t('summary.realizedPnLDetail')} />
        <Stat label={t('summary.dividendsGross')} value={formatCurrency(overview?.irpf.dividends_received_cents ?? 0, baseCurrency)} detail={t('summary.staleCount', { count: overview?.summary.stale_quotes ?? 0 })} />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger><TabsTrigger value="operations">{t('tabs.operations')}</TabsTrigger><TabsTrigger value="dividends">{t('tabs.dividends')}</TabsTrigger></TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1.6fr,1fr]">
            <Card className="border-border/70"><CardHeader><CardTitle>{t('charts.timeline')}</CardTitle></CardHeader><CardContent className="h-80">{overview?.evolution.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={overview.evolution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="snapshot_date" tickFormatter={(value: string) => f.dateTime(toDate(value), { day: '2-digit', month: 'short' })} /><YAxis tickFormatter={(value: number) => formatCurrencyCompact(value, baseCurrency)} /><Tooltip formatter={(value) => typeof value === 'number' ? formatCurrency(value, baseCurrency) : String(value ?? '')} labelFormatter={(value) => typeof value === 'string' ? date(value) : String(value ?? '')} /><Area dataKey="total_value_cents" fill="hsl(var(--primary) / 0.18)" stroke="hsl(var(--primary))" type="monotone" /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-3xl bg-muted/30 px-6 text-center text-sm text-muted-foreground">{t('states.noTimeline')}</div>}</CardContent></Card>
            <Card className="border-border/70"><CardHeader><CardTitle>{t('summary.dayChange')}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-2xl bg-muted/30 p-4"><p className="text-sm text-muted-foreground">{t('summary.dayChange')}</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(overview?.summary.day_change_cents ?? 0, baseCurrency)}</p></div><div className="rounded-2xl bg-muted/30 p-4"><p className="text-sm text-muted-foreground">{t('summary.dayChangePercent')}</p><p className="mt-2 text-2xl font-semibold">{overview?.summary.day_change_percent == null ? t('states.notAvailable') : formatPercentChange(overview.summary.day_change_percent)}</p></div><div className="rounded-2xl bg-muted/30 p-4"><p className="text-sm text-muted-foreground">{t('summary.lastSync')}</p><p className="mt-2 text-sm font-medium">{overview?.as_of ? dateTime(overview.as_of) : t('states.notAvailable')}</p></div></CardContent></Card>
          </div>
          <div className="grid gap-4 xl:grid-cols-3"><Allocation currency={baseCurrency} data={distribution.byType} empty={t('states.noDistribution')} title={t('charts.distributionByType')} /><Allocation currency={baseCurrency} data={distribution.bySector} empty={t('states.noDistribution')} title={t('charts.distributionBySector')} /><Allocation currency={baseCurrency} data={distribution.byCurrency} empty={t('states.noDistribution')} title={t('charts.distributionByCurrency')} /></div>
          <Card className="border-border/70"><CardHeader><CardTitle>{t('sections.positions')}</CardTitle></CardHeader><CardContent className="space-y-4">{positions.length ? positions.map((position) => <article key={position.id} className="rounded-3xl border border-border/60 bg-muted/20 p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{position.ticker} · {position.name}</h2><Badge variant="outline">{t(`types.${position.investment_type}`)}</Badge><Badge variant={position.is_price_stale ? 'destructive' : 'secondary'}>{position.is_price_stale ? t('status.stale') : t('status.live')}</Badge></div><p className="text-sm text-muted-foreground">{position.account?.name ?? t('fields.optionalAccount')} · {position.sector ?? t('distributions.uncategorizedSector')}</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="rounded-2xl" onClick={() => { setSelectedInvestmentId(position.id); setOperationOpen(true) }}>{t('actions.newOperation')}</Button><Button type="button" variant="outline" className="rounded-2xl" onClick={() => { setEditing(position); setPositionOpen(true) }}>{t('actions.edit')}</Button>{confirmDeletePositionId === position.id ? <span className="flex items-center gap-2"><Button type="button" variant="ghost" size="sm" className="rounded-2xl" onClick={() => setConfirmDeletePositionId(null)}>{t('actions.cancel')}</Button><Button type="button" variant="destructive" size="sm" className="rounded-2xl" onClick={() => void handleConfirmDeletePosition()}>{t('actions.confirmDelete')}</Button></span> : <Button type="button" variant="ghost" className="rounded-2xl text-destructive hover:text-destructive" onClick={() => setConfirmDeletePositionId(position.id)}>{t('actions.delete')}</Button>}</div></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"><div className="rounded-2xl bg-background px-4 py-3"><p className="text-xs text-muted-foreground">{t('summary.currentValue')}</p><p className="mt-2 font-semibold">{formatCurrency(position.current_value_base_cents, baseCurrency)}</p></div><div className="rounded-2xl bg-background px-4 py-3"><p className="text-xs text-muted-foreground">{t('summary.totalInvested')}</p><p className="mt-2 font-semibold">{formatCurrency(position.total_invested_base_cents, baseCurrency)}</p></div><div className="rounded-2xl bg-background px-4 py-3"><p className="text-xs text-muted-foreground">{t('summary.unrealizedPnL')}</p><p className="mt-2 font-semibold">{formatCurrency(position.unrealized_pl_cents, baseCurrency)}</p></div><div className="rounded-2xl bg-background px-4 py-3"><p className="text-xs text-muted-foreground">{t('fields.quantity')}</p><p className="mt-2 font-semibold">{units(position.quantity)}</p></div><div className="rounded-2xl bg-background px-4 py-3"><p className="text-xs text-muted-foreground">{t('fields.avgPrice')}</p><p className="mt-2 font-semibold">{formatCurrency(position.avg_purchase_price_cents, position.currency)}</p></div></div></article>) : <div className="rounded-3xl bg-muted/30 p-6 text-sm text-muted-foreground"><p>{t('states.noPositions')}</p><p className="mt-1">{t('states.noPositionsDetail')}</p></div>}</CardContent></Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1.5fr,1fr]">
            <Card className="border-border/70"><CardHeader><CardTitle>{t('sections.operations')}</CardTitle></CardHeader><CardContent className="space-y-3">{overview?.operations.length ? overview.operations.map((operation) => <div key={operation.id} className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-medium">{operation.investment.ticker} · {operation.investment.name}</p><p className="text-xs text-muted-foreground">{date(operation.operation_date)} · {units(operation.quantity)}</p></div><div className="flex flex-wrap items-center gap-3"><Badge variant="secondary">{t(`operations.${operation.operation_type}`)}</Badge><p className="font-semibold">{formatCurrency(operation.total_cents, baseCurrency)}</p>{confirmDeleteOperationId === operation.id ? <span className="flex items-center gap-2"><Button type="button" variant="ghost" size="sm" className="rounded-2xl" onClick={() => setConfirmDeleteOperationId(null)}>{t('actions.cancel')}</Button><Button type="button" variant="destructive" size="sm" className="rounded-2xl" onClick={() => void handleConfirmDeleteOperation()}>{t('actions.confirmDelete')}</Button></span> : <Button type="button" variant="ghost" className="rounded-2xl text-destructive hover:text-destructive" onClick={() => setConfirmDeleteOperationId(operation.id)}>{t('actions.delete')}</Button>}</div></div>) : <div className="rounded-3xl bg-muted/30 p-6 text-sm text-muted-foreground">{t('states.noOperations')}</div>}</CardContent></Card>
            <Card className="border-border/70"><CardHeader><CardTitle>{t('sections.realizedSales')}</CardTitle></CardHeader><CardContent className="space-y-3">{overview?.realized_sales.length ? overview.realized_sales.map((sale) => <div key={sale.operation_id} className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{sale.ticker} · {sale.investment_name}</p><p className="text-xs text-muted-foreground">{date(sale.operation_date)}</p></div><p className="font-semibold">{formatCurrency(sale.realized_pl_cents, baseCurrency)}</p></div><div className="mt-3 grid gap-1 text-xs text-muted-foreground"><p>{t('fields.proceeds')}: {formatCurrency(sale.proceeds_cents, baseCurrency)}</p><p>{t('fields.costBasis')}: {formatCurrency(sale.cost_basis_cents, baseCurrency)}</p></div></div>) : <div className="rounded-3xl bg-muted/30 p-6 text-sm text-muted-foreground">{t('states.noSales')}</div>}</CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="dividends" className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1.25fr,0.75fr]">
            <Card className="border-border/70"><CardHeader><CardTitle>{t('sections.dividendCalendar')}</CardTitle></CardHeader><CardContent className="space-y-3">{overview?.dividend_calendar.length ? overview.dividend_calendar.map((item) => <div key={`${item.investment_id}-${item.next_dividend_date}`} className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3"><div><p className="font-medium">{item.ticker} · {item.name}</p><p className="text-xs text-muted-foreground">{date(item.next_dividend_date)} · {item.account?.name ?? t('fields.optionalAccount')}</p></div><div className="text-right"><p className="font-semibold">{formatCurrency(item.estimated_payment_cents, baseCurrency)}</p><p className="text-xs text-muted-foreground">{formatCurrency(item.annual_income_cents, baseCurrency)}</p></div></div>) : <div className="rounded-3xl bg-muted/30 p-6 text-sm text-muted-foreground">{t('states.noDividends')}</div>}</CardContent></Card>
            <Card className="border-border/70"><CardHeader><CardTitle>{t('sections.fiscalReport')}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-2xl bg-muted/30 p-4"><p className="text-sm text-muted-foreground">{t('summary.dividendsGross')}</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(overview?.irpf.dividends_received_cents ?? 0, baseCurrency)}</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-muted/30 p-4"><p className="text-sm text-muted-foreground">{t('summary.dividendsWithholding')}</p><p className="mt-2 text-lg font-semibold">{formatCurrency(overview?.irpf.withholding_cents ?? 0, baseCurrency)}</p></div><div className="rounded-2xl bg-muted/30 p-4"><p className="text-sm text-muted-foreground">{t('summary.dividendsNet')}</p><p className="mt-2 text-lg font-semibold">{formatCurrency(overview?.irpf.net_dividends_cents ?? 0, baseCurrency)}</p></div></div><p className="text-xs leading-6 text-muted-foreground">{overview?.irpf.disclaimer ?? t('fiscal.disclaimer')}</p></CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>

      <InvestmentPositionDialog accounts={(accountsQuery.data ?? []).map((account) => ({ currency: account.currency, id: account.id, name: account.name }))} open={positionOpen} position={editing} onOpenChange={setPositionOpen} onSubmit={savePosition} />
      <InvestmentOperationDialog open={operationOpen} positions={positions.map((position) => ({ id: position.id, name: position.name, quantity: position.quantity, ticker: position.ticker }))} selectedInvestmentId={selectedInvestmentId} onOpenChange={setOperationOpen} onSubmit={saveOperation} />
    </div>
  )
}
