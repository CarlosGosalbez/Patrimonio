'use client'

import { useState } from 'react'
import { GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ColumnMapping, ImportTargetField, ParsedStatementFile } from '@/lib/imports/types'

const FIELDS: Array<{
  key: ImportTargetField
  required?: boolean
}> = [
  { key: 'transaction_date', required: true },
  { key: 'description', required: true },
  { key: 'amount' },
  { key: 'credit' },
  { key: 'debit' },
  { key: 'value_date' },
  { key: 'type' },
  { key: 'notes' },
  { key: 'external_id' },
]

export function ImportMappingBoard({
  labels,
  mapping,
  parsedFile,
  onMappingChange,
}: {
  labels: {
    descriptions: Record<ImportTargetField, string>
    dragHint: string
    dropHere: string
    names: Record<ImportTargetField, string>
    noColumn: string
    title: string
  }
  mapping: ColumnMapping
  onMappingChange: (field: ImportTargetField, columnIndex: number | null) => void
  parsedFile: ParsedStatementFile
}) {
  const [draggingColumn, setDraggingColumn] = useState<number | null>(null)

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr,1.1fr]">
      <section className="rounded-3xl border border-border/60 bg-muted/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">{labels.title}</h3>
          <Badge variant="secondary">{labels.dragHint}</Badge>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {parsedFile.headers.map((header, index) => {
            const assignedField = Object.entries(mapping).find(([, value]) => value === index)?.[0]

            return (
              <button
                key={`${header}-${index}`}
                className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-border/60 bg-background px-3 py-2 text-left text-sm transition hover:border-primary/50"
                draggable
                type="button"
                onDragStart={() => setDraggingColumn(index)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span>{header}</span>
                {assignedField ? <Badge variant="outline">{assignedField}</Badge> : null}
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-muted/20 p-4">
        <div className="space-y-3">
          {FIELDS.map((field) => (
            <div
              key={field.key}
              className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                if (draggingColumn !== null) {
                  onMappingChange(field.key, draggingColumn)
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {labels.names[field.key]}
                    {field.required ? ' *' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{labels.descriptions[field.key]}</p>
                </div>
                <Badge variant={field.required ? 'default' : 'secondary'}>
                  {mapping[field.key] !== undefined
                    ? parsedFile.headers[mapping[field.key]!] ?? labels.noColumn
                    : labels.dropHere}
                </Badge>
              </div>

              <select
                className="mt-3 flex min-h-[44px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                value={mapping[field.key] ?? ''}
                onChange={(event) =>
                  onMappingChange(
                    field.key,
                    event.target.value === '' ? null : Number(event.target.value),
                  )
                }
              >
                <option value="">{labels.noColumn}</option>
                {parsedFile.headers.map((header, index) => (
                  <option key={`${field.key}-${index}`} value={index}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
