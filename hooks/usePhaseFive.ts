"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/lib/http/client";
import { parseCurrencyInput } from "@/lib/financial/formatters";
import type { AnalyticsPeriod, AnalyticsSummaryResponse } from "@/lib/analytics/types";
import type { BudgetsOverviewResponse, BudgetStatus } from "@/lib/budgets/types";

const queryKeys = {
  analytics: (period: AnalyticsPeriod) => ["analytics", "summary", period] as const,
  budgets: ["budgets"] as const,
  dashboard: ["dashboard", "summary"] as const,
};

function recalculateBudgetPreview(
  budget: BudgetsOverviewResponse["budgets"][number],
  payload: Record<string, unknown>,
) {
  const nextLimitCents =
    typeof payload.limit_input === "string"
      ? parseCurrencyInput(payload.limit_input)
      : budget.limit_cents;
  const nextThreshold =
    typeof payload.alert_threshold === "number" ? payload.alert_threshold : budget.alert_threshold;
  const nextProgressRatio = nextLimitCents > 0 ? budget.spent_cents / nextLimitCents : 0;

  const status: BudgetStatus =
    nextProgressRatio >= 1
      ? "exceeded"
      : nextProgressRatio >= nextThreshold / 100
        ? "warning"
        : nextProgressRatio >= Math.max(0.7, nextThreshold / 100 - 0.15)
          ? "approaching"
          : "ok";

  return {
    ...budget,
    alert_threshold: nextThreshold,
    available_cents: nextLimitCents - budget.spent_cents,
    currency: typeof payload.currency === "string" ? payload.currency : budget.currency,
    end_date:
      typeof payload.end_date === "string" || payload.end_date === null
        ? (payload.end_date as string | null)
        : budget.end_date,
    is_active: typeof payload.is_active === "boolean" ? payload.is_active : budget.is_active,
    limit_cents: nextLimitCents,
    period:
      payload.period === "monthly" || payload.period === "annual" ? payload.period : budget.period,
    progress_percent: Math.round(nextProgressRatio * 100),
    progress_ratio: nextProgressRatio,
    start_date: typeof payload.start_date === "string" ? payload.start_date : budget.start_date,
    status,
    threshold_reached: nextProgressRatio >= nextThreshold / 100,
  };
}

function invalidatePhaseFiveQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
  void queryClient.invalidateQueries({ queryKey: ["analytics"] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
}

export function useBudgetsOverviewQuery() {
  return useQuery({
    queryKey: queryKeys.budgets,
    queryFn: () => requestJson<BudgetsOverviewResponse>("/api/budgets"),
    staleTime: 60_000,
  });
}

export function useAnalyticsSummaryQuery(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: queryKeys.analytics(period),
    queryFn: () => requestJson<AnalyticsSummaryResponse>(`/api/analytics/summary?period=${period}`),
    staleTime: 120_000,
  });
}

export function useCreateBudgetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      requestJson("/api/budgets", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    onSuccess: () => invalidatePhaseFiveQueries(queryClient),
  });
}

export function useUpdateBudgetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      requestJson(`/api/budgets/${id}`, {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      }),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.budgets });
      const previous = queryClient.getQueryData<BudgetsOverviewResponse>(queryKeys.budgets);

      if (previous) {
        const budgets = previous.budgets.map((budget) =>
          budget.id === id ? recalculateBudgetPreview(budget, payload) : budget,
        );

        queryClient.setQueryData<BudgetsOverviewResponse>(queryKeys.budgets, {
          budgets,
          summary: {
            exceeded_count: budgets.filter((budget) => budget.status === "exceeded").length,
            total_available_cents: budgets.reduce((sum, budget) => sum + budget.available_cents, 0),
            total_limit_cents: budgets.reduce((sum, budget) => sum + budget.limit_cents, 0),
            total_spent_cents: budgets.reduce((sum, budget) => sum + budget.spent_cents, 0),
            warning_count: budgets.filter((budget) => budget.status === "warning").length,
          },
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.budgets, context.previous);
      }
    },
    onSettled: () => invalidatePhaseFiveQueries(queryClient),
  });
}

export function useDeleteBudgetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      requestJson(`/api/budgets/${id}`, {
        method: "DELETE",
      }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.budgets });
      const previous = queryClient.getQueryData<BudgetsOverviewResponse>(queryKeys.budgets);

      if (previous) {
        const budgets = previous.budgets.filter((budget) => budget.id !== id);

        queryClient.setQueryData<BudgetsOverviewResponse>(queryKeys.budgets, {
          budgets,
          summary: {
            exceeded_count: budgets.filter((budget) => budget.status === "exceeded").length,
            total_available_cents: budgets.reduce((sum, budget) => sum + budget.available_cents, 0),
            total_limit_cents: budgets.reduce((sum, budget) => sum + budget.limit_cents, 0),
            total_spent_cents: budgets.reduce((sum, budget) => sum + budget.spent_cents, 0),
            warning_count: budgets.filter((budget) => budget.status === "warning").length,
          },
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.budgets, context.previous);
      }
    },
    onSettled: () => invalidatePhaseFiveQueries(queryClient),
  });
}
