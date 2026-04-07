'use client'

import { useMemo, useState, type DragEvent } from 'react'
import { toast } from 'sonner'
import { useLocale, useTranslations } from 'next-intl'
import { FileSpreadsheet, History, RefreshCcw, UploadCloud } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAccountsQuery, useCategoriesQuery } from '@/hooks/usePhaseThree'
import { useConfirmImportMutation, useImportBatchesQuery, useImportPreviewMutation, useRollbackImportMutation } from '@/hooks/usePhaseFour'
import { detectColumnMapping, normalizeStatementRows, parseStatementFile } from '@/lib/imports/parser'
import { uploadImportFile, validateImportFile } from '@/lib/imports/storage'
import type { ColumnMapping, ConfirmImportRowInput, ImportPreviewRow, ParsedStatementFile } from '@/lib/imports/types'
import { ImportMappingBoard } from '@/components/imports/ImportMappingBoard'
import { ImportPreviewTable } from '@/components/imports/ImportPreviewTable'

async function sha256Hex(file: File) {
  const buffer = await file.arrayBuffer()
  const digest = await window.crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export function ImportsPageClient() {
  const t = useTranslations('imports')
  const locale = useLocale()
  const accountsQuery = useAccountsQuery()
  const categoriesQuery = useCategoriesQuery()
  const previewMutation = useImportPreviewMutation()
  const confirmMutation = useConfirmImportMutation()
  const batchesQuery = useImportBatchesQuery()
  const rollbackMutation = useRollbackImportMutation()

  const [accountId, setAccountId] = useState('')
  const [parsedFile, setParsedFile] = useState<ParsedStatementFile | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [fileChecksum, setFileChecksum] = useState<string | null>(null)
  const [storagePath, setStoragePath] = useState<string | null>(null)
  const [reviewRows, setReviewRows] = useState<Array<ConfirmImportRowInput & ImportPreviewRow>>([])
  const [bulkMerchantKey, setBulkMerchantKey] = useState('')
  const [bulkCategoryId, setBulkCategoryId] = useState('')

  const categories = useMemo(
    () =>
      (categoriesQuery.data ?? []).map((category) => ({
        ...category,
        user_id: category.user_id ?? null,
      })),
    [categoriesQuery.data],
  )
  const batches = batchesQuery.data?.batches ?? []

  const previewSummary = useMemo(() => previewMutation.data?.summary ?? null, [previewMutation.data])

  async function handleFile(file: File) {
    const validationError = validateImportFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      const [parsed, checksum] = await Promise.all([parseStatementFile(file), sha256Hex(file)])
      const autoMapping = detectColumnMapping(parsed.headers, parsed.rawRows, parsed.sourceBank)

      setParsedFile(parsed)
      setFileChecksum(checksum)
      setMapping(autoMapping)
      setReviewRows([])
      setStoragePath(null)

      // Upload to Storage in background — non-blocking for UX
      const supabaseClient = (await import('@/lib/supabase/client')).createClient()
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (user) {
        uploadImportFile(user.id, file).then(({ storagePath: path, error }) => {
          if (error) {
            console.warn('[Storage] Upload failed:', error)
          } else {
            setStoragePath(path)
          }
        })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toasts.parseError'))
    }
  }

  async function handlePreview() {
    if (!accountId || !parsedFile || !fileChecksum) {
      toast.error(t('toasts.missingFile'))
      return
    }

    const normalizedRows = normalizeStatementRows({
      mapping,
      rawRows: parsedFile.rawRows,
    })

    if (!normalizedRows.length) {
      toast.error(t('toasts.mappingError'))
      return
    }

    try {
      const response = await previewMutation.mutateAsync({
        account_id: accountId,
        file_checksum: fileChecksum,
        file_name: parsedFile.fileName,
        rows: normalizedRows,
        source_bank: parsedFile.sourceBank,
        source_format: parsedFile.sourceFormat,
      })

      setReviewRows(
        response.rows.map((row) => ({
          ...row,
          category_id: row.category?.id ?? null,
        })),
      )
      toast.success(t('toasts.previewReady'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toasts.previewError'))
    }
  }

  async function handleConfirmImport() {
    if (!accountId || !parsedFile || !fileChecksum || !reviewRows.length) {
      toast.error(t('toasts.previewRequired'))
      return
    }

    try {
      // Filter to only valid schema fields (remove preview metadata)
      const cleanRows = reviewRows.map((row) => ({
        amount_cents: row.amount_cents,
        description: row.description,
        external_id: row.external_id,
        is_income: row.is_income,
        merchant_key: row.merchant_key,
        notes: row.notes,
        source_row_index: row.source_row_index,
        transaction_date: row.transaction_date,
        value_date: row.value_date,
        category_id: row.category_id,
        should_import: row.should_import,
      }))

      const result = await confirmMutation.mutateAsync({
        account_id: accountId,
        file_checksum: fileChecksum,
        file_name: parsedFile.fileName,
        rows: cleanRows,
        source_bank: parsedFile.sourceBank,
        source_format: parsedFile.sourceFormat,
      })

      toast.success(
        t('toasts.confirmed', {
          count: result.imported_transaction_count,
        }),
      )
      setReviewRows([])
      previewMutation.reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toasts.confirmError'))
    }
  }

  function applyBulkCategory() {
    if (!bulkMerchantKey || !bulkCategoryId) {
      return
    }

    setReviewRows((current) =>
      current.map((row) =>
        row.merchant_key === bulkMerchantKey ? { ...row, category_id: bulkCategoryId } : row,
      ),
    )
    toast.success(t('toasts.bulkApplied'))
  }

  function onDropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      void handleFile(file)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="flex min-w-[260px] flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="import-account">
            {t('fields.account')}
          </label>
          <select
            id="import-account"
            className="min-h-[48px] rounded-2xl border border-input bg-background px-3 py-2 text-sm"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          >
            <option value="">{t('fields.selectAccount')}</option>
            {(accountsQuery.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('upload.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="rounded-3xl border border-dashed border-border/80 bg-muted/20 p-6 text-center"
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDropFile}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-medium">{t('upload.dropzone')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('upload.formats')}</p>
              <Input
                className="mt-4"
                type="file"
                accept=".xlsx,.xls,.csv,.ofx,.qif"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void handleFile(file)
                  }
                }}
              />
            </div>

            {parsedFile ? (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{parsedFile.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('upload.detectedBank', { bank: t(`banks.${parsedFile.sourceBank}`) })} · {parsedFile.rawRows.length}{' '}
                      {t('upload.rows')}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('summary.title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-2xl bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">{t('summary.supportedBanks')}</p>
              <p className="mt-1 text-sm font-medium">{t('summary.bankList')}</p>
            </div>
            <div className="rounded-2xl bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">{t('summary.duplicateRule')}</p>
              <p className="mt-1 text-sm font-medium">{t('summary.duplicateRuleValue')}</p>
            </div>
            <Button className="min-h-[48px] rounded-2xl" disabled={!parsedFile || previewMutation.isPending} onClick={() => void handlePreview()}>
              {previewMutation.isPending ? t('actions.previewing') : t('actions.preview')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {parsedFile ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('mapping.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ImportMappingBoard
              labels={{
                descriptions: {
                  amount: t('mapping.fields.amount'),
                  credit: t('mapping.fields.credit'),
                  debit: t('mapping.fields.debit'),
                  description: t('mapping.fields.description'),
                  external_id: t('mapping.fields.external_id'),
                  notes: t('mapping.fields.notes'),
                  transaction_date: t('mapping.fields.transaction_date'),
                  type: t('mapping.fields.type'),
                  value_date: t('mapping.fields.value_date'),
                },
                dragHint: t('mapping.dragHint'),
                dropHere: t('mapping.dropHere'),
                names: {
                  amount: t('mapping.names.amount'),
                  credit: t('mapping.names.credit'),
                  debit: t('mapping.names.debit'),
                  description: t('mapping.names.description'),
                  external_id: t('mapping.names.external_id'),
                  notes: t('mapping.names.notes'),
                  transaction_date: t('mapping.names.transaction_date'),
                  type: t('mapping.names.type'),
                  value_date: t('mapping.names.value_date'),
                },
                noColumn: t('mapping.noColumn'),
                title: t('mapping.availableColumns'),
              }}
              mapping={mapping}
              parsedFile={parsedFile}
              onMappingChange={(field, columnIndex) =>
                setMapping((current) => ({
                  ...current,
                  [field]: columnIndex === null ? undefined : columnIndex,
                }))
              }
            />
          </CardContent>
        </Card>
      ) : null}

      {previewSummary ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('summary.rows')}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{previewSummary.row_count}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('summary.duplicates')}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{previewSummary.duplicate_count + previewSummary.duplicate_in_file_count}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('summary.unexpectedCharges')}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{previewSummary.unexpected_charge_count}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('summary.expectedIncomeGaps')}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{previewSummary.expected_income_gap_count}</CardContent>
          </Card>
        </div>
      ) : null}

      {reviewRows.length ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t('bulk.title')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[1fr,1fr,auto]">
              <select
                className="min-h-[44px] rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                value={bulkMerchantKey}
                onChange={(event) => setBulkMerchantKey(event.target.value)}
              >
                <option value="">{t('bulk.selectMerchant')}</option>
                {(previewMutation.data?.similar_merchants ?? []).map((merchant) => (
                  <option key={merchant.merchant_key} value={merchant.merchant_key}>
                    {merchant.label} ({merchant.row_count})
                  </option>
                ))}
              </select>
              <select
                className="min-h-[44px] rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                value={bulkCategoryId}
                onChange={(event) => setBulkCategoryId(event.target.value)}
              >
                <option value="">{t('bulk.selectCategory')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Button className="min-h-[44px] rounded-2xl" type="button" variant="outline" onClick={applyBulkCategory}>
                {t('bulk.apply')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('preview.title')}</CardTitle>
              <Button className="min-h-[44px] rounded-2xl" disabled={confirmMutation.isPending} onClick={() => void handleConfirmImport()}>
                {confirmMutation.isPending ? t('actions.confirming') : t('actions.confirm')}
              </Button>
            </CardHeader>
            <CardContent>
              <ImportPreviewTable
                categories={categories}
                labels={{
                  amount: t('preview.columns.amount'),
                  category: t('preview.columns.category'),
                  date: t('preview.columns.date'),
                  description: t('preview.columns.description'),
                  duplicate: t('preview.flags.duplicate'),
                  empty: t('preview.empty'),
                  expense: t('preview.type.expense'),
                  flags: t('preview.columns.flags'),
                  importRow: t('preview.columns.import'),
                  income: t('preview.type.income'),
                  nextPage: t('preview.pagination.nextPage'),
                  ok: t('preview.flags.ok'),
                  page: t('preview.pagination.page'),
                  pageOf: t('preview.pagination.pageOf'),
                  previousPage: t('preview.pagination.previousPage'),
                  type: t('preview.columns.type'),
                  unexpected: t('preview.flags.unexpected'),
                }}
                locale={locale}
                rows={reviewRows}
                onRowChange={(index, patch) =>
                  setReviewRows((current) =>
                    current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
                  )
                }
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            {t('history.title')}
          </CardTitle>
          <Button size="sm" type="button" variant="ghost" onClick={() => void batchesQuery.refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t('history.refresh')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {batches.length ? (
            batches.map((batch) => (
              <div key={batch.id} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{batch.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {batch.account?.name} · {batch.source_format.toUpperCase()} · {batch.created_at.slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{t(`history.status.${batch.status}`)}</Badge>
                    <Badge variant="secondary">
                      {t('history.imported', { count: batch.imported_count })}
                    </Badge>
                    {batch.status === 'confirmed' ? (
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() =>
                          rollbackMutation
                            .mutateAsync(batch.id)
                            .then(() => toast.success(t('toasts.rolledBack')))
                            .catch((error) =>
                              toast.error(error instanceof Error ? error.message : t('toasts.rollbackError')),
                            )
                        }
                      >
                        {t('actions.rollback')}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{t('history.duplicates', { count: batch.duplicate_count })}</span>
                  <span>{t('history.unexpectedCharges', { count: batch.unexpected_charge_count })}</span>
                  <span>{t('history.expectedIncomeGaps', { count: batch.expected_income_gap_count })}</span>
                  <span>{t('history.range', { end: batch.source_range_end ?? '—', start: batch.source_range_start ?? '—' })}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t('history.empty')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
