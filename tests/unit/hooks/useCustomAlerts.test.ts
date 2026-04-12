import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import {
  useCustomAlertsOverviewQuery,
  useCreateCustomAlertMutation,
  useUpdateCustomAlertMutation,
  useDeleteCustomAlertMutation,
} from "@/hooks/usePhaseThree";

const mockAlertsResponse = {
  alerts: [
    {
      id: "alert-1",
      title: "Renovación Seguro Coche",
      due_date: "2026-05-15",
      alert_days_before: 30,
      is_active: true,
      is_predefined: false,
      snoozed_until: null,
      category: "insurance",
      notes: null,
    },
  ],
  preferences: {
    weekly_alert_digest_enabled: true,
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

describe("useCustomAlertsOverviewQuery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches and returns custom alerts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAlertsResponse,
        headers: { get: () => "application/json" },
      }),
    );

    const { result } = renderHook(() => useCustomAlertsOverviewQuery(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.alerts).toHaveLength(1);
    expect(result.current.data?.alerts[0].title).toBe("Renovación Seguro Coche");
  });

  it("returns error state on API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
        headers: { get: () => "application/json" },
      }),
    );

    const { result } = renderHook(() => useCustomAlertsOverviewQuery(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateCustomAlertMutation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls POST /api/custom-alerts", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ alert: mockAlertsResponse.alerts[0] }),
      headers: { get: () => "application/json" },
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useCreateCustomAlertMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        title: "Renovación Seguro Coche",
        due_date: "2026-05-15",
        alert_days_before: 30,
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/custom-alerts"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("useUpdateCustomAlertMutation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls PATCH /api/custom-alerts/:id", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ alert: mockAlertsResponse.alerts[0] }),
      headers: { get: () => "application/json" },
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useUpdateCustomAlertMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "alert-1", payload: { due_date: "2026-05-20" } });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/custom-alerts/alert-1"),
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

describe("useDeleteCustomAlertMutation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls DELETE /api/custom-alerts/:id", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
      headers: { get: () => "application/json" },
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useDeleteCustomAlertMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("alert-1");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/custom-alerts/alert-1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
