'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/financial/formatters'
import type { ConfirmImportRowInput, ImportPreviewRow } from '@/lib/imports/types'
import type { TransactionCategorySummary } from '@/lib/commitments/types'

const ROWS_PER_PAGE = 50

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
    nextPage: string
    ok: string
    page: string
    pageOf: string
    previousPage: string
    type: string
    unexpected: string
  }
  locale: string
  onRowChange: (index: number, patch: Partial<ConfirmImportRowInput & ImportPreviewRow>) => void
  rows: Array<ConfirmImportRowInput & ImportPreviewRow>
}) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE)
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedRows = useMemo(() => rows.slice(startIndex, endIndex), [rows, startIndex, endIndex])

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">{labels.empty}</p>
  }

  function handleTypeChange(index: number, newIsIncome: boolean) {
    const globalIndex = startIndex + index
    const row = rows[globalIndex]

    // If category doesn't match new type, reset it
    if (row && row.category_id) {
      const currentCategory = categories.find((cat) => cat.id === row.category_id)
      if (currentCategory && currentCategory.is_income !== newIsIncome) {
        onRowChange(globalIndex, { is_income: newIsIncome, category_id: null })
        return
      }
    }

    onRowChange(globalIndex, { is_income: newIsIncome })
  }

  return (
    <div className="space-y-4">
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
            {paginatedRows.map((row, index) => {
              const globalIndex = startIndex + index
              const filteredCategories = categories.filter((category) => category.is_income === row.is_income)

              return (
                <tr key={`${row.source_row_index}-${globalIndex}`} className="rounded-2xl bg-muted/30">
                  <td className="rounded-l-2xl px-3 py-3 align-top">
                    <input
                      checked={row.should_import !== false}
                      className="h-4 w-4"
                      type="checkbox"
                      onChange={(event) => onRowChange(globalIndex, { should_import: event.target.checked })}
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <input
                      className="min-h-[44px] w-[136px] rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      type="date"
                      value={row.transaction_date}
                      onChange={(event) => onRowChange(globalIndex, { transaction_date: event.target.value })}
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <input
                      className="min-h-[44px] w-[280px] rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      value={row.description}
                      onChange={(event) => onRowChange(globalIndex, { description: event.target.value })}
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
                          onRowChange(globalIndex, { amount_cents: Math.round(parsed * 100) })
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
                      onChange={(event) => handleTypeChange(index, event.target.value === 'income')}
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
                        onRowChange(globalIndex, { category_id: event.target.value || null })
                      }
                    >
                      <option value="">{labels.category}</option>
                      {filteredCategories.map((category) => (
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
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            {labels.pageOf
              .replace('{current}', String(currentPage))
              .replace('{total}', String(totalPages))}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              {labels.previousPage}
            </Button>

            <select
              className="min-h-[36px] rounded-xl border border-input bg-background px-3 py-1 text-sm"
              value={currentPage}
              onChange={(event) => setCurrentPage(Number(event.target.value))}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <option key={pageNum} value={pageNum}>
                  {labels.page} {pageNum}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              {labels.nextPage}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
