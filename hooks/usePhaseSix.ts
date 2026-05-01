"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/lib/http/client";
import type { InvestmentSearchResult, InvestmentsOverviewResponse } from "@/lib/investments/types";

const queryKeys = {
  overview: (year: number) => ["investments", "overview", year] as const,
  search: (query: string) => ["investments", "search", query] as const,
};

function invalidatePhaseSixQueries({
  queryClient,
  year,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  year: number;
}) {
  void queryClient.invalidateQueries({ queryKey: ["investments"] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.overview(year) });
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  void queryClient.invalidateQueries({ queryKey: ["analytics"] });
}

export function useInvestmentsOverviewQuery(year: number) {
  return useQuery({
    queryKey: queryKeys.overview(year),
    queryFn: () => requestJson<InvestmentsOverviewResponse>(`/api/investments?year=${year}`),
    staleTime: 60_000,
  });
}

export function useTickerSearchQuery(query: string) {
  return useQuery({
    enabled: query.trim().length >= 2,
    queryKey: queryKeys.search(query),
    queryFn: async () => {
      const response = await requestJson<{ results: InvestmentSearchResult[] }>(
        `/api/investments/search?q=${encodeURIComponent(query)}&limit=6`,
      );

      return response.results;
    },
    staleTime: 300_000,
  });
}

export function useCreateInvestmentMutation(year: number, onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      requestJson("/api/investments", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    onSuccess: () => {
      invalidatePhaseSixQueries({ queryClient, year });
      onSuccess?.();
    },
  });
}

export function useUpdateInvestmentMutation(year: number, onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      requestJson(`/api/investments/${id}`, {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      }),
    onSuccess: () => {
      invalidatePhaseSixQueries({ queryClient, year });
      onSuccess?.();
    },
  });
}

export function useDeleteInvestmentMutation(year: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      requestJson(`/api/investments/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidatePhaseSixQueries({ queryClient, year }),
  });
}

export function useCreateInvestmentOperationMutation(year: number, onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      payload,
    }: {
      investmentId: string;
      payload: Record<string, unknown>;
    }) =>
      requestJson(`/api/investments/${investmentId}/operations`, {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    onSuccess: () => {
      invalidatePhaseSixQueries({ queryClient, year });
      onSuccess?.();
    },
  });
}

export function useDeleteInvestmentOperationMutation(year: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ investmentId, operationId }: { investmentId: string; operationId: string }) =>
      requestJson(`/api/investments/${investmentId}/operations/${operationId}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidatePhaseSixQueries({ queryClient, year }),
  });
}
