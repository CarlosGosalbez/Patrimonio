'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/http/client'
import type { CustomAlertsResponse, CustomAlertListItem } from '@/lib/alerts/types'
import type {
  CommitmentsOverviewResponse,
  CommitmentListItem,
  DashboardSummaryResponse,
  SubscriptionsOverviewResponse,
} from '@/lib/commitments/types'

const queryKeys = {
  accounts: ['accounts'] as const,
  categories: (type = 'all') => ['categories', type] as const,
  customAlert: (id: string | null) => ['custom-alert', id] as const,
  customAlerts: ['custom-alerts'] as const,
  dashboard: ['dashboard', 'summary'] as const,
  commitment: (id: string | null) => ['commitment', id] as const,
  commitments: ['commitments'] as const,
  subscriptions: ['commitments', 'subscriptions'] as const,
}

function invalidatePhaseThreeQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
  void queryClient.invalidateQueries({ queryKey: queryKeys.commitments })
  void queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions })
  void queryClient.invalidateQueries({ queryKey: queryKeys.customAlerts })
}

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => requestJson<DashboardSummaryResponse>('/api/dashboard/summary'),
    staleTime: 300_000,
  })
}

export function useAccountsQuery() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async () => {
      const response = await requestJson<{
        accounts: Array<{ color: string | null; currency: string; icon: string | null; id: string; name: string }>
      }>('/api/accounts')

      return response.accounts
    },
  })
}

export function useCategoriesQuery(type?: 'income' | 'expense') {
  return useQuery({
    queryKey: queryKeys.categories(type ?? 'all'),
    queryFn: async () => {
      const search = type ? `?type=${type}` : ''
      const response = await requestJson<{
        categories: Array<{ color: string | null; icon: string | null; id: string; is_income: boolean; name: string; user_id?: string | null }>
      }>(`/api/categories${search}`)

      return response.categories
    },
  })
}

export function useCommitmentsOverviewQuery() {
  return useQuery({
    queryKey: queryKeys.commitments,
    queryFn: () => requestJson<CommitmentsOverviewResponse>('/api/commitments'),
  })
}

export function useCommitmentQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: queryKeys.commitment(id),
    queryFn: async () => {
      const response = await requestJson<{ commitment: CommitmentListItem }>(
        `/api/commitments/${id}`,
      )

      return response.commitment
    },
  })
}

export function useSubscriptionsOverviewQuery() {
  return useQuery({
    queryKey: queryKeys.subscriptions,
    queryFn: () => requestJson<SubscriptionsOverviewResponse>('/api/commitments/subscriptions'),
  })
}

export function useCustomAlertsOverviewQuery() {
  return useQuery({
    queryKey: queryKeys.customAlerts,
    queryFn: () => requestJson<CustomAlertsResponse>('/api/custom-alerts'),
  })
}

export function useCustomAlertQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: queryKeys.customAlert(id),
    queryFn: async () => {
      const response = await requestJson<{ alert: CustomAlertListItem }>(
        `/api/custom-alerts/${id}`,
      )

      return response.alert
    },
  })
}

export function useCreateCommitmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      requestJson('/api/commitments', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
    onSuccess: () => invalidatePhaseThreeQueries(queryClient),
  })
}

export function useUpdateCommitmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      requestJson(`/api/commitments/${id}`, {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
    onSuccess: (_result, variables) => {
      invalidatePhaseThreeQueries(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.commitment(variables.id) })
    },
  })
}

export function useDeleteCommitmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      requestJson(`/api/commitments/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidatePhaseThreeQueries(queryClient),
  })
}

export function useCreateCustomAlertMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      requestJson('/api/custom-alerts', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
    onSuccess: () => invalidatePhaseThreeQueries(queryClient),
  })
}

export function useUpdateCustomAlertMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      requestJson(`/api/custom-alerts/${id}`, {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
    onSuccess: (_result, variables) => {
      invalidatePhaseThreeQueries(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.customAlert(variables.id) })
    },
  })
}

export function useDeleteCustomAlertMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      requestJson(`/api/custom-alerts/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidatePhaseThreeQueries(queryClient),
  })
}

export function useUpdateAlertPreferencesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { weekly_alert_digest_enabled: boolean }) =>
      requestJson('/api/custom-alerts/preferences', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customAlerts })
    },
  })
}
