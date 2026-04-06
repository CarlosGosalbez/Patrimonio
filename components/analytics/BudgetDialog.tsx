'use client'

import { useEffect, useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { centsToDec } from '@/lib/financial/formatters'
import type { BudgetListItem } from '@/lib/budgets/types'

interface BudgetDialogProps {
  budget: BudgetListItem | null
  categories: Array<{ id: string; name: string }>
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: Record<string, unknown>, id?: string) => Promise<void>
  open: boolean
}

function buildInitialState(budget?: BudgetListItem | null) {
  return {
    alert_threshold: budget?.alert_threshold ?? 80,
    category_id: budget?.category_id ?? '',
    end_date: budget?.end_date ?? '',
    is_active: budget?.is_active ?? true,
    limit_input: budget
      ? String(centsToDec(budget.limit_cents).toFixed(2)).replace('.', ',')
      : '',
    period: budget?.period ?? 'monthly',
    start_date: budget?.start_date ?? new Date().toISOString().slice(0, 10),
  }
}

type BudgetFormState = ReturnType<typeof buildInitialState>

export function BudgetDialog({
  budget,
  categories,
  onOpenChange,
  onSubmit,
  open,
}: BudgetDialogProps) {
  const t = useTranslations('analytics')
  const uid = useId()
  const [state, setState] = useState<BudgetFormState>(() => buildInitialState(budget))

  const id = {
    category: `${uid}-category`,
    period: `${uid}-period`,
    limit: `${uid}-limit`,
    threshold: `${uid}-threshold`,
    startDate: `${uid}-start-date`,
    endDate: `${uid}-end-date`,
    active: `${uid}-active`,
  }

  useEffect(() => {
    setState(buildInitialState(budget))
  }, [budget])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onSubmit(
      {
        ...state,
        end_date: state.end_date || null,
      },
      budget?.id,
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {budget ? t('budgets.dialog.editTitle') : t('budgets.dialog.newTitle')}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={id.category}>{t('budgets.form.category')}</Label>
              <select
                id={id.category}
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
                value={state.category_id}
                onChange={(event) =>
                  setState((current) => ({ ...current, category_id: event.target.value }))
                }
              >
                <option value="">{t('budgets.form.selectCategory')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={id.period}>{t('budgets.form.period')}</Label>
              <select
                id={id.period}
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={state.period}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    period: event.target.value as 'annual' | 'monthly',
                  }))
                }
              >
                <option value="monthly">{t('budgets.periods.monthly')}</option>
                <option value="annual">{t('budgets.periods.annual')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={id.limit}>{t('budgets.form.limit')}</Label>
              <Input
                id={id.limit}
                inputMode="decimal"
                required
                value={state.limit_input}
                onChange={(event) =>
                  setState((current) => ({ ...current, limit_input: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={id.threshold}>{t('budgets.form.threshold')}</Label>
              <Input
                id={id.threshold}
                inputMode="numeric"
                max={100}
                min={1}
                required
                type="number"
                value={state.alert_threshold}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    alert_threshold: Number(event.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={id.startDate}>{t('budgets.form.startDate')}</Label>
              <Input
                id={id.startDate}
                required
                type="date"
                value={state.start_date}
                onChange={(event) =>
                  setState((current) => ({ ...current, start_date: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={id.endDate}>{t('budgets.form.endDate')}</Label>
              <Input
                id={id.endDate}
                type="date"
                value={state.end_date}
                onChange={(event) =>
                  setState((current) => ({ ...current, end_date: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-border/60 px-4 py-3">
            <input
              checked={state.is_active}
              className="h-4 w-4 rounded border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              id={id.active}
              type="checkbox"
              onChange={(event) =>
                setState((current) => ({ ...current, is_active: event.target.checked }))
              }
            />
            <Label className="cursor-pointer text-sm font-normal" htmlFor={id.active}>
              {t('budgets.form.active')}
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit">
              {budget ? t('budgets.dialog.save') : t('budgets.dialog.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
