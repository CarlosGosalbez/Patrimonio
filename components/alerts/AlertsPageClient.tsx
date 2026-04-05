'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { BellRing, CalendarClock, Mail, PauseCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  useCategoriesQuery,
  useCreateCustomAlertMutation,
  useCustomAlertQuery,
  useCustomAlertsOverviewQuery,
  useDeleteCustomAlertMutation,
  useUpdateAlertPreferencesMutation,
  useUpdateCustomAlertMutation,
} from '@/hooks/usePhaseThree'
import { formatCurrency } from '@/lib/financial/formatters'
import { CustomAlertDialog } from '@/components/alerts/CustomAlertDialog'

export function AlertsPageClient() {
  const t = useTranslations('alerts')
  const alertsQuery = useCustomAlertsOverviewQuery()
  const categoriesQuery = useCategoriesQuery('expense')
  const createMutation = useCreateCustomAlertMutation()
  const updateMutation = useUpdateCustomAlertMutation()
  const deleteMutation = useDeleteCustomAlertMutation()
  const preferencesMutation = useUpdateAlertPreferencesMutation()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [snoozeDate, setSnoozeDate] = useState('')
  const alertDetailQuery = useCustomAlertQuery(editingId)

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

  async function handleSnooze(id: string) {
    if (!snoozeDate) {
      return
    }

    try {
      await updateMutation.mutateAsync({ id, payload: { dismissed_until: snoozeDate } })
      toast.success(t('toasts.snoozed'))
      setSnoozeDate('')
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

      <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('upcomingDeadlines')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(alertsQuery.data?.upcoming_deadlines ?? []).map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 text-amber-500" />
                    <div>
                      <p className="font-medium">{alert.name}</p>
                      <p className="text-xs text-muted-foreground">{alert.next_due_date}</p>
                    </div>
                  </div>
                  <span className="font-semibold">
                    {alert.expected_amount_cents ? formatCurrency(alert.expected_amount_cents) : ''}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('preferences')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-border/60 px-4 py-3">
              <Mail className="h-4 w-4 text-blue-600" />
              <span className="flex-1 text-sm">{t('weeklyDigest')}</span>
              <input
                checked={alertsQuery.data?.preferences.weekly_alert_digest_enabled ?? false}
                type="checkbox"
                onChange={(event) =>
                  preferencesMutation.mutate({
                    weekly_alert_digest_enabled: event.target.checked,
                  })
                }
              />
            </label>
            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">{t('snoozeHint')}</p>
              <div className="mt-3 flex gap-2">
                <Input type="date" value={snoozeDate} onChange={(event) => setSnoozeDate(event.target.value)} />
                <Button type="button" variant="outline" disabled={!editingId} onClick={() => handleSnooze(editingId!)}>
                  <PauseCircle className="mr-2 h-4 w-4" />
                  {t('actions.snooze')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('allAlerts')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(alertsQuery.data?.alerts ?? []).map((alert) => (
            <div key={alert.id} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <BellRing
                    className={
                      alert.severity === 'critical'
                        ? 'mt-0.5 h-4 w-4 text-rose-600'
                        : alert.severity === 'warning'
                          ? 'mt-0.5 h-4 w-4 text-amber-500'
                          : 'mt-0.5 h-4 w-4 text-blue-600'
                    }
                  />
                  <div>
                    <p className="font-medium">{alert.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.next_due_date} · {t(`severity.${alert.severity}`)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    {alert.expected_amount_cents ? formatCurrency(alert.expected_amount_cents) : ''}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId(alert.id)
                      setOpen(true)
                    }}
                  >
                    {t('actions.edit')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => handleDelete(alert.id)}>
                    {t('actions.delete')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <CustomAlertDialog
        alert={alertDetailQuery.data ?? null}
        categories={categoriesQuery.data ?? []}
        onOpenChange={setOpen}
        onSubmit={handleSubmit}
        open={open}
      />
    </div>
  )
}
