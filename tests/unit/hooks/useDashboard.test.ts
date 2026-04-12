import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useDashboardSummaryQuery } from "@/hooks/usePhaseThree";

const mockSummary = {
  net_worth_cents: 125000,
  net_worth_change_cents: 5000,
  net_worth_change_percent: 4.16,
  monthly_income_cents: 300000,
  monthly_expense_cents: 150000,
  monthly_balance_cents: 150000,
  upcoming_commitments: [],
  recent_transactions: [],
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

describe("useDashboardSummaryQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and returns dashboard summary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSummary,
        headers: { get: () => "application/json" },
      }),
    );

    const { result } = renderHook(() => useDashboardSummaryQuery(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      net_worth_cents: 125000,
      monthly_balance_cents: 150000,
    });
  });

  it("exposes error state when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal Server Error" }),
        headers: { get: () => "application/json" },
      }),
    );

    const { result } = renderHook(() => useDashboardSummaryQuery(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it("starts in loading state", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
    );

    const { result } = renderHook(() => useDashboardSummaryQuery(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isPending).toBe(true);
  });
});
