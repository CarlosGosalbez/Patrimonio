import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import {
  useBudgetsOverviewQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
} from "@/hooks/usePhaseFive";

const mockBudgetsResponse = {
  budgets: [
    {
      id: "budget-1",
      category_id: "cat-1",
      category_name: "Alimentación",
      category_color: "#22c55e",
      limit_cents: 50000,
      spent_cents: 30000,
      available_cents: 20000,
      progress_percent: 60,
      progress_ratio: 0.6,
      status: "ok",
      alert_threshold: 80,
      threshold_reached: false,
      period: "monthly",
      currency: "EUR",
      start_date: "2026-04-01",
      end_date: null,
      is_active: true,
    },
  ],
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

describe("useBudgetsOverviewQuery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches and returns budgets list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockBudgetsResponse,
        headers: { get: () => "application/json" },
      }),
    );

    const { result } = renderHook(() => useBudgetsOverviewQuery(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.budgets).toHaveLength(1);
    expect(result.current.data?.budgets[0].category_name).toBe("Alimentación");
  });

  it("returns error state when API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
        headers: { get: () => "application/json" },
      }),
    );

    const { result } = renderHook(() => useBudgetsOverviewQuery(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateBudgetMutation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls POST /api/budgets with payload", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ budget: { id: "new-budget", ...mockBudgetsResponse.budgets[0] } }),
      headers: { get: () => "application/json" },
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useCreateBudgetMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        category_id: "cat-1",
        limit_input: "500",
        period: "monthly",
        currency: "EUR",
        alert_threshold: 80,
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/budgets"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("exposes mutation error on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ error: "Validation failed" }),
        headers: { get: () => "application/json" },
      }),
    );

    const { result } = renderHook(() => useCreateBudgetMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ category_id: "cat-1", limit_input: "500" });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useUpdateBudgetMutation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls PATCH /api/budgets/:id", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ budget: mockBudgetsResponse.budgets[0] }),
      headers: { get: () => "application/json" },
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useUpdateBudgetMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "budget-1", payload: { limit_input: "600" } });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/budgets/budget-1"),
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

describe("useDeleteBudgetMutation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls DELETE /api/budgets/:id", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
      headers: { get: () => "application/json" },
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useDeleteBudgetMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("budget-1");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/budgets/budget-1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
