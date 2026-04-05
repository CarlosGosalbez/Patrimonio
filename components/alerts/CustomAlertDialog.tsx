'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CustomAlertListItem } from '@/lib/alerts/types'

const alertRecurrences = ['monthly', 'quarterly', 'semiannual', 'annual', 'biennial', 'once'] as const

interface CustomAlertDialogProps {
  alert: CustomAlertListItem | null
  categories: Array<{ id: string; is_income: boolean; name: string }>
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: Record<string, unknown>, id?: string) => Promise<void>
  open: boolean
}

function buildInitialState(alert?: CustomAlertListItem | null) {
  return {
    advance_notice_days: alert?.advance_notice_days ?? 30,
    auto_deactivate: alert?.auto_deactivate ?? true,
    category_id: alert?.category_id ?? '',
    description: alert?.description ?? '',
    dismissed_until: alert?.dismissed_until ?? '',
    due_date: alert?.due_date ?? new Date().toISOString().slice(0, 10),
    expected_amount_input: alert?.expected_amount_cents
      ? String((alert.expected_amount_cents / 100).toFixed(2)).replace('.', ',')
      : '',
    is_active: alert?.is_active ?? true,
    name: alert?.name ?? '',
    recurrence: alert?.recurrence ?? 'annual',
  }
}

type CustomAlertFormState = ReturnType<typeof buildInitialState>

export function CustomAlertDialog({
  alert,
  categories,
  onOpenChange,
  onSubmit,
  open,
}: CustomAlertDialogProps) {
  const t = useTranslations('alerts')
  const [state, setState] = useState<CustomAlertFormState>(() => buildInitialState(alert))

  useEffect(() => {
    setState(buildInitialState(alert))
  }, [alert])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onSubmit(
      {
        ...state,
        category_id: state.category_id || null,
        dismissed_until: state.dismissed_until || null,
        expected_amount_input: state.expected_amount_input || null,
      },
      alert?.id,
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{alert ? t('editTitle') : t('newTitle')}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="alert-name">{t('fields.name')}</Label>
            <Input id="alert-name" value={state.name} onChange={(event) => setState((current) => ({ ...current, name: event.target.value }))} required />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="alert-due-date">{t('fields.dueDate')}</Label>
              <Input id="alert-due-date" type="date" value={state.due_date} onChange={(event) => setState((current) => ({ ...current, due_date: event.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-recurrence">{t('fields.recurrence')}</Label>
              <select
                id="alert-recurrence"
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={state.recurrence}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    recurrence: event.target.value as (typeof alertRecurrences)[number],
                  }))
                }
              >
                {alertRecurrences.map((value) => (
                  <option key={value} value={value}>{t(`recurrence.${value}`)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-amount">{t('fields.expectedAmount')}</Label>
              <Input id="alert-amount" inputMode="decimal" value={state.expected_amount_input} onChange={(event) => setState((current) => ({ ...current, expected_amount_input: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-category">{t('fields.category')}</Label>
              <select
                id="alert-category"
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={state.category_id}
                onChange={(event) => setState((current) => ({ ...current, category_id: event.target.value }))}
              >
                <option value="">{t('fields.noCategory')}</option>
                {categories.filter((category) => !category.is_income).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="alert-advance">{t('fields.advanceNoticeDays')}</Label>
              <Input id="alert-advance" inputMode="numeric" value={String(state.advance_notice_days)} onChange={(event) => setState((current) => ({ ...current, advance_notice_days: Number(event.target.value || 0) }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-snooze">{t('fields.dismissedUntil')}</Label>
              <Input id="alert-snooze" type="date" value={state.dismissed_until} onChange={(event) => setState((current) => ({ ...current, dismissed_until: event.target.value }))} />
            </div>
          </div>

          <label className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-border/60 px-4 py-3 text-sm">
            <input checked={state.auto_deactivate} type="checkbox" onChange={(event) => setState((current) => ({ ...current, auto_deactivate: event.target.checked }))} />
            {t('fields.autoDeactivate')}
          </label>

          <div className="space-y-2">
            <Label htmlFor="alert-description">{t('fields.description')}</Label>
            <Textarea id="alert-description" value={state.description} onChange={(event) => setState((current) => ({ ...current, description: event.target.value }))} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('actions.cancel')}</Button>
            <Button type="submit">{alert ? t('actions.save') : t('actions.create')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
