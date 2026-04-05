'use client'

import { formatCurrency } from '@/lib/financial/formatters'
import type { ConfirmImportRowInput, ImportPreviewRow } from '@/lib/imports/types'
import type { TransactionCategorySummary } from '@/lib/commitments/types'

function toAmountInput(cents: number) {
  return (cents / 100).toFixed(2)
}

export function ImportPreviewTable({
  categories,
  locale,
  labels,
  rows,
  onRowChange,
}: {
  categories: TransactionCategorySummary[]
  labels: {
    amount: string
    category: string
    date: string
    description: string
    duplicate: string
    empty: string
    expense: string
    flags: string
    importRow: string
    income: string
    ok: string
    type: string
    unexpected: string
  }
  locale: string
  onRowChange: (index: number, patch: Partial<ConfirmImportRowInput & ImportPreviewRow>) => void
  rows: Array<ConfirmImportRowInput & ImportPreviewRow>
}) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">{labels.empty}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2">{labels.importRow}</th>
            <th className="px-3 py-2">{labels.date}</th>
            <th className="px-3 py-2">{labels.description}</th>
            <th className="px-3 py-2">{labels.amount}</th>
            <th className="px-3 py-2">{labels.type}</th>
            <th className="px-3 py-2">{labels.category}</th>
            <th className="px-3 py-2">{labels.flags}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.source_row_index}-${index}`} className="rounded-2xl bg-muted/30">
              <td className="rounded-l-2xl px-3 py-3 align-top">
                <input
                  checked={row.should_import !== false}
                  className="h-4 w-4"
                  type="checkbox"
                  onChange={(event) => onRowChange(index, { should_import: event.target.checked })}
                />
              </td>
              <td className="px-3 py-3 align-top">
                <input
                  className="min-h-[44px] w-[136px] rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  type="date"
                  value={row.transaction_date}
                  onChange={(event) => onRowChange(index, { transaction_date: event.target.value })}
                />
              </td>
              <td className="px-3 py-3 align-top">
                <input
                  className="min-h-[44px] w-[280px] rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={row.description}
                  onChange={(event) => onRowChange(index, { description: event.target.value })}
                />
              </td>
              <td className="px-3 py-3 align-top">
                <input
                  className="min-h-[44px] w-[124px] rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  inputMode="decimal"
                  value={toAmountInput(row.amount_cents)}
                  onChange={(event) => {
                    const parsed = Number.parseFloat(event.target.value.replace(',', '.'))
                    if (!Number.isNaN(parsed)) {
                      onRowChange(index, { amount_cents: Math.round(parsed * 100) })
                    }
                  }}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatCurrency(row.amount_cents, 'EUR', locale)}
                </p>
              </td>
              <td className="px-3 py-3 align-top">
                <select
                  className="min-h-[44px] rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={row.is_income ? 'income' : 'expense'}
                  onChange={(event) => onRowChange(index, { is_income: event.target.value === 'income' })}
                >
                  <option value="expense">{labels.expense}</option>
                  <option value="income">{labels.income}</option>
                </select>
              </td>
              <td className="px-3 py-3 align-top">
                <select
                  className="min-h-[44px] min-w-[180px] rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={row.category_id ?? ''}
                  onChange={(event) =>
                    onRowChange(index, { category_id: event.target.value || null })
                  }
                >
                  <option value="">{labels.category}</option>
                  {categories
                    .filter((category) => category.is_income === row.is_income)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </td>
              <td className="rounded-r-2xl px-3 py-3 align-top">
                <div className="space-y-2 text-xs">
                  {row.duplicate ? (
                    <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-700">
                      {labels.duplicate}: {Math.round(row.duplicate.confidence * 100)}%
                    </p>
                  ) : null}
                  {row.unexpected_charge ? (
                    <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-rose-700">
                      {labels.unexpected}: {row.unexpected_charge.service_name}
                    </p>
                  ) : null}
                  {!row.duplicate && !row.unexpected_charge ? (
                    <p className="text-muted-foreground">{labels.ok}</p>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
