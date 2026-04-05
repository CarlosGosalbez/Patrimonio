'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/http/client'
import type { ConfirmImportResponse, ImportBatchesResponse, ImportPreviewResponse } from '@/lib/imports/types'

const queryKeys = {
  importBatches: ['imports', 'batches'] as const,
}

export function useImportBatchesQuery() {
  return useQuery({
    queryKey: queryKeys.importBatches,
    queryFn: () => requestJson<ImportBatchesResponse>('/api/imports/batches'),
  })
}

export function useImportPreviewMutation() {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      requestJson<ImportPreviewResponse>('/api/imports/preview', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
  })
}

export function useConfirmImportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      requestJson<ConfirmImportResponse>('/api/imports/confirm', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.importBatches })
    },
  })
}

export function useRollbackImportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      requestJson<{ rolled_back_count: number }>(`/api/imports/batches/${id}/rollback`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.importBatches })
    },
  })
}
