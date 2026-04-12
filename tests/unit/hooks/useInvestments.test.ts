import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import {
  useInvestmentsOverviewQuery,
  useCreateInvestmentMutation,
  useDeleteInvestmentMutation,
} from "@/hooks/usePhaseSix";

const mockOverview = {
  positions: [
    {
      id: "pos-1",
      name: "ACME Corp",
      ticker: "ACME",
      investment_type: "stock",
      quantity: 10,
      avg_purchase_price_cents: 5000,
      total_invested_cents: 50000,
      current_price_cents: 6000,
      current_value_cents: 60000,
      unrealized_pl_cents: 10000,
      unrealized_pl_percent: 20,
      currency: "EUR",
    },
  ],
  summary: {
    total_invested_cents: 50000,
    total_current_value_cents: 60000,
    total_unrealized_pl_cents: 10000,
    total_realized_pl_cents: 0,
    total_dividend_income_cents: 0,
  },
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

describe("useInvestmentsOverviewQuery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches investments overview for given year", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOverview,
        headers: { get: () => "application/json" },
      }),
    );

    const { result } = renderHook(() => useInvestmentsOverviewQuery(2026), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.positions).toHaveLength(1);
    expect(result.current.data?.positions[0].ticker).toBe("ACME");
  });

  it("uses year in query key to allow per-year caching", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOverview,
        headers: { get: () => "application/json" },
      }),
    );

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    const { result: r2025 } = renderHook(() => useInvestmentsOverviewQuery(2025), { wrapper });
    const { result: r2026 } = renderHook(() => useInvestmentsOverviewQuery(2026), { wrapper });

    await waitFor(() => expect(r2025.current.isSuccess).toBe(true));
    await waitFor(() => expect(r2026.current.isSuccess).toBe(true));

    // Both should exist independently in cache
    const cache = qc.getQueriesData({ queryKey: ["investments", "overview"] });
    expect(cache.length).toBeGreaterThanOrEqual(2);
  });

  it("returns error state on API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
        headers: { get: () => "application/json" },
      }),
    );

    const { result } = renderHook(() => useInvestmentsOverviewQuery(2026), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateInvestmentMutation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls POST /api/investments", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ position: mockOverview.positions[0] }),
      headers: { get: () => "application/json" },
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useCreateInvestmentMutation(2026), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        ticker: "ACME",
        name: "ACME Corp",
        investment_type: "stock",
        opening_price_input: "50",
        opening_quantity_input: "10",
        currency: "EUR",
        opening_date: "2026-04-01",
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/investments"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("useDeleteInvestmentMutation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls DELETE /api/investments/:id", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
      headers: { get: () => "application/json" },
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useDeleteInvestmentMutation(2026), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("pos-1");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/investments/pos-1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
