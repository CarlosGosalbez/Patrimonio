import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useTransactionsQuery } from "@/hooks/useTransactions";

const mockItems = [
  {
    id: "txn-1",
    user_id: "uid-1",
    account_id: "acc-1",
    category_id: null,
    amount_cents: -5000,
    currency: "EUR",
    description: "Supermercado",
    notes: null,
    is_income: false,
    transaction_date: "2026-04-01",
    value_date: null,
    tags: [],
    receipt_url: null,
    recurring_id: null,
    is_recurring_instance: false,
    import_source: "manual",
    import_batch_id: null,
    transfer_id: null,
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-01T10:00:00Z",
    deleted_at: null,
    account: { id: "acc-1", name: "Cuenta corriente", currency: "EUR", color: null, icon: null },
    category: null,
  },
];

vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ items: mockItems, next_page: null, total: 1 }),
    headers: { get: () => "application/json" },
  }),
);

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

describe("useTransactionsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches transactions without filters", async () => {
    const { result } = renderHook(() => useTransactionsQuery(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const items =
      result.current.data?.pages.flatMap(
        (p: import("@/lib/transactions/types").TransactionListResponse) => p.items,
      ) ?? [];
    expect(items).toHaveLength(1);
    expect(items[0]?.description).toBe("Supermercado");
  });

  it("builds correct query string with filters", async () => {
    renderHook(
      () =>
        useTransactionsQuery({
          search: "mercado",
          is_income: false,
          account_id: "acc-1",
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      const called = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(called).toContain("search=mercado");
      expect(called).toContain("is_income=false");
      expect(called).toContain("account_id=acc-1");
    });
  });

  it("reports total count from first page", async () => {
    const { result } = renderHook(() => useTransactionsQuery(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]?.total).toBe(1);
  });
});
