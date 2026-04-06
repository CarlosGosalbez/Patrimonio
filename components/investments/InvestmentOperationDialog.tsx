'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface InvestmentOperationDialogProps {
  onOpenChange: (open: boolean) => void
  onSubmit: (investmentId: string, payload: Record<string, unknown>) => Promise<void>
  open: boolean
  positions: Array<{ id: string; name: string; quantity: number; ticker: string }>
  selectedInvestmentId: string | null
}

function buildInitialState(selectedInvestmentId: string | null) {
  return {
    fee_input: '',
    investment_id: selectedInvestmentId ?? '',
    notes: '',
    operation_date: new Date().toISOString().slice(0, 10),
    operation_type: 'buy',
    price_input: '',
    quantity_input: '',
    withholding_input: '',
  }
}

type OperationFormState = ReturnType<typeof buildInitialState>

export function InvestmentOperationDialog({
  onOpenChange,
  onSubmit,
  open,
  positions,
  selectedInvestmentId,
}: InvestmentOperationDialogProps) {
  const t = useTranslations('investments')
  const formatter = useFormatter()
  const uid = useId()
  const [state, setState] = useState<OperationFormState>(() => buildInitialState(selectedInvestmentId))

  useEffect(() => {
    setState(buildInitialState(selectedInvestmentId))
  }, [selectedInvestmentId])

  const selectedPosition = useMemo(
    () => positions.find((position) => position.id === state.investment_id) ?? null,
    [positions, state.investment_id],
  )

  useEffect(() => {
    if (!selectedPosition || state.operation_type !== 'dividend' || state.quantity_input) {
      return
    }

    setState((current) => ({
      ...current,
      quantity_input: String(selectedPosition.quantity).replace('.', ','),
    }))
  }, [selectedPosition, state.operation_type, state.quantity_input])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onSubmit(
      state.investment_id,
      {
        fee_input:
          state.operation_type === 'buy' || state.operation_type === 'sell'
            ? state.fee_input || '0'
            : '0',
        notes: state.notes || null,
        operation_date: state.operation_date,
        operation_type: state.operation_type,
        price_input: state.operation_type === 'split' ? null : state.price_input || null,
        quantity_input: state.quantity_input,
        withholding_input:
          state.operation_type === 'dividend' ? state.withholding_input || '0' : '0',
      },
    )
  }

  const quantityLabel =
    state.operation_type === 'split' ? t('fields.splitRatio') : t('fields.quantity')
  const priceLabel =
    state.operation_type === 'dividend' ? t('fields.dividendPerShare') : t('fields.price')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('dialogs.operation.newTitle')}</DialogTitle>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`${uid}-investment`}>{t('fields.position')}</Label>
              <select
                id={`${uid}-investment`}
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
                value={state.investment_id}
                onChange={(event) =>
                  setState((current) => ({ ...current, investment_id: event.target.value }))
                }
              >
                <option value="">{t('fields.selectPosition')}</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.ticker} · {position.name}
                  </option>
                ))}
              </select>
              {selectedPosition ? (
                <p className="text-xs text-muted-foreground">
                  {t('dialogs.operation.currentUnits', {
                    quantity: formatter.number(selectedPosition.quantity, {
                      maximumFractionDigits: 8,
                    }),
                  })}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${uid}-type`}>{t('fields.operationType')}</Label>
              <select
                id={`${uid}-type`}
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={state.operation_type}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    fee_input: '',
                    operation_type: event.target.value,
                    price_input: '',
                    quantity_input:
                      event.target.value === 'dividend' && selectedPosition
                        ? String(selectedPosition.quantity).replace('.', ',')
                        : '',
                    withholding_input: '',
                  }))
                }
              >
                {['buy', 'sell', 'dividend', 'split'].map((value) => (
                  <option key={value} value={value}>
                    {t(`operations.${value}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${uid}-date`}>{t('fields.operationDate')}</Label>
              <Input
                className="min-h-[44px]"
                id={`${uid}-date`}
                required
                type="date"
                value={state.operation_date}
                onChange={(event) =>
                  setState((current) => ({ ...current, operation_date: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${uid}-quantity`}>{quantityLabel}</Label>
              <Input
                className="min-h-[44px]"
                id={`${uid}-quantity`}
                inputMode="decimal"
                required
                value={state.quantity_input}
                onChange={(event) =>
                  setState((current) => ({ ...current, quantity_input: event.target.value }))
                }
              />
            </div>

            {state.operation_type !== 'split' ? (
              <div className="space-y-2">
                <Label htmlFor={`${uid}-price`}>{priceLabel}</Label>
                <Input
                  className="min-h-[44px]"
                  id={`${uid}-price`}
                  inputMode="decimal"
                  required
                  value={state.price_input}
                  onChange={(event) =>
                    setState((current) => ({ ...current, price_input: event.target.value }))
                  }
                />
              </div>
            ) : null}

            {(state.operation_type === 'buy' || state.operation_type === 'sell') && (
              <div className="space-y-2">
                <Label htmlFor={`${uid}-fee`}>{t('fields.fee')}</Label>
                <Input
                  className="min-h-[44px]"
                  id={`${uid}-fee`}
                  inputMode="decimal"
                  value={state.fee_input}
                  onChange={(event) =>
                    setState((current) => ({ ...current, fee_input: event.target.value }))
                  }
                />
              </div>
            )}

            {state.operation_type === 'dividend' ? (
              <div className="space-y-2">
                <Label htmlFor={`${uid}-withholding`}>{t('fields.withholding')}</Label>
                <Input
                  className="min-h-[44px]"
                  id={`${uid}-withholding`}
                  inputMode="decimal"
                  value={state.withholding_input}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      withholding_input: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${uid}-notes`}>{t('fields.notes')}</Label>
            <Textarea
              id={`${uid}-notes`}
              value={state.notes}
              onChange={(event) =>
                setState((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              onClick={() => onOpenChange(false)}
            >
              {t('actions.cancel')}
            </Button>
            <Button className="min-h-[44px]" disabled={!state.investment_id} type="submit">
              {t('dialogs.operation.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
