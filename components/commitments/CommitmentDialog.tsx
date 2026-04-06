'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CommitmentListItem } from '@/lib/commitments/types'

const commitmentTypes = [
  'mortgage',
  'rent_income',
  'rent_expense',
  'subscription',
  'tax',
  'insurance',
  'utility',
  'other',
] as const

const commitmentFrequencies = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannual',
  'annual',
] as const

interface CommitmentDialogProps {
  accounts: Array<{ id: string; name: string }>
  categories: Array<{ id: string; is_income: boolean; name: string }>
  commitment: CommitmentListItem | null
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: Record<string, unknown>, id?: string) => Promise<void>
  open: boolean
}

function buildInitialState(commitment?: CommitmentListItem | null) {
  return {
    account_id: commitment?.account_id ?? '',
    advance_notice_days: commitment?.advance_notice_days ?? 7,
    allows_early_repayment: commitment?.allows_early_repayment ?? false,
    amount_input: commitment ? String((commitment.amount_cents / 100).toFixed(2)).replace('.', ',') : '',
    cancelled_at: commitment?.cancelled_at ?? '',
    category_id: commitment?.category_id ?? '',
    commitment_type: commitment?.commitment_type ?? 'other',
    description: commitment?.description ?? '',
    frequency: commitment?.frequency ?? 'monthly',
    interest_rate_input: commitment?.interest_rate?.toString() ?? '',
    is_active: commitment?.is_active ?? true,
    is_automated: commitment?.is_automated ?? true,
    is_income: commitment?.is_income ?? false,
    is_variable_rate: commitment?.is_variable_rate ?? false,
    maturity_year: commitment?.maturity_year?.toString() ?? '',
    name: commitment?.name ?? '',
    next_due_date: commitment?.next_due_date ?? new Date().toISOString().slice(0, 10),
    service_name: commitment?.service_name ?? '',
    start_date: commitment?.start_date ?? new Date().toISOString().slice(0, 10),
    tolerance_days: commitment?.tolerance_days ?? 3,
  }
}

type CommitmentFormState = ReturnType<typeof buildInitialState>

export function CommitmentDialog({
  accounts,
  categories,
  commitment,
  onOpenChange,
  onSubmit,
  open,
}: CommitmentDialogProps) {
  const t = useTranslations('commitments')
  const [state, setState] = useState<CommitmentFormState>(() => buildInitialState(commitment))
  const filteredCategories = categories.filter((category) => category.is_income === state.is_income)

  useEffect(() => {
    setState(buildInitialState(commitment))
  }, [commitment])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onSubmit({
      ...state,
      cancelled_at: state.cancelled_at || null,
      category_id: state.category_id || null,
      interest_rate_input: state.interest_rate_input || null,
      maturity_year: state.maturity_year ? Number(state.maturity_year) : null,
      service_name: state.service_name || null,
    }, commitment?.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{commitment ? t('editTitle') : t('newTitle')}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {commitment?.mortgage_projection ? (
            <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-sm font-medium">{t('mortgageProjection.title')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('mortgageProjection.detail', {
                  months: commitment.mortgage_projection.remaining_months,
                  years: commitment.mortgage_projection.remaining_years,
                })}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="commitment-name">{t('fields.name')}</Label>
              <Input id="commitment-name" value={state.name} onChange={(event) => setState((current) => ({ ...current, name: event.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commitment-type">{t('fields.type')}</Label>
              <select
                id="commitment-type"
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={state.commitment_type}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    commitment_type: event.target.value as (typeof commitmentTypes)[number],
                  }))
                }
              >
                {commitmentTypes.map((value) => (
                  <option key={value} value={value}>{t(`types.${value}`)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commitment-account">{t('fields.account')}</Label>
              <select
                id="commitment-account"
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={state.account_id}
                onChange={(event) => setState((current) => ({ ...current, account_id: event.target.value }))}
                required
              >
                <option value="">{t('fields.selectAccount')}</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commitment-category">{t('fields.category')}</Label>
              <select
                id="commitment-category"
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={state.category_id}
                onChange={(event) => setState((current) => ({ ...current, category_id: event.target.value }))}
              >
                <option value="">{t('fields.noCategory')}</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commitment-amount">{t('fields.amount')}</Label>
              <Input id="commitment-amount" inputMode="decimal" value={state.amount_input} onChange={(event) => setState((current) => ({ ...current, amount_input: event.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commitment-frequency">{t('fields.frequency')}</Label>
              <select
                id="commitment-frequency"
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={state.frequency}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    frequency: event.target.value as (typeof commitmentFrequencies)[number],
                  }))
                }
              >
                {commitmentFrequencies.map((value) => (
                  <option key={value} value={value}>{t(`frequencies.${value}`)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commitment-next-due">{t('fields.nextDueDate')}</Label>
              <Input id="commitment-next-due" type="date" value={state.next_due_date} onChange={(event) => setState((current) => ({ ...current, next_due_date: event.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commitment-start">{t('fields.startDate')}</Label>
              <Input id="commitment-start" type="date" value={state.start_date} onChange={(event) => setState((current) => ({ ...current, start_date: event.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commitment-cancelled-at">{t('fields.cancelledAt')}</Label>
              <Input id="commitment-cancelled-at" type="date" value={state.cancelled_at} onChange={(event) => setState((current) => ({ ...current, cancelled_at: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commitment-service-name">{t('fields.serviceName')}</Label>
              <Input id="commitment-service-name" value={state.service_name} onChange={(event) => setState((current) => ({ ...current, service_name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commitment-maturity-year">{t('fields.maturityYear')}</Label>
              <Input id="commitment-maturity-year" inputMode="numeric" value={state.maturity_year} onChange={(event) => setState((current) => ({ ...current, maturity_year: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commitment-interest-rate">{t('fields.interestRate')}</Label>
              <Input id="commitment-interest-rate" inputMode="decimal" value={state.interest_rate_input} onChange={(event) => setState((current) => ({ ...current, interest_rate_input: event.target.value }))} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-border/60 px-4 py-3 text-sm">
              <input checked={state.is_income} type="checkbox" onChange={(event) => setState((current) => ({ ...current, is_income: event.target.checked, category_id: '' }))} />
              {t('fields.isIncome')}
            </label>
            <label className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-border/60 px-4 py-3 text-sm">
              <input checked={state.is_automated} type="checkbox" onChange={(event) => setState((current) => ({ ...current, is_automated: event.target.checked }))} />
              {t('fields.isAutomated')}
            </label>
            <label className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-border/60 px-4 py-3 text-sm">
              <input checked={state.allows_early_repayment} type="checkbox" onChange={(event) => setState((current) => ({ ...current, allows_early_repayment: event.target.checked }))} />
              {t('fields.allowsEarlyRepayment')}
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commitment-description">{t('fields.description')}</Label>
            <Textarea id="commitment-description" value={state.description} onChange={(event) => setState((current) => ({ ...current, description: event.target.value }))} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('actions.cancel')}</Button>
            <Button type="submit">{commitment ? t('actions.save') : t('actions.create')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
