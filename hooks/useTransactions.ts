import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TransactionListItem, TransactionListResponse } from "@/lib/transactions/types";

const LIMIT = 20;

export interface TransactionQueryFilters {
  search?: string;
  category_id?: string;
  account_id?: string;
  is_income?: boolean;
  date_from?: string;
  date_to?: string;
  amount_min_cents?: number;
  amount_max_cents?: number;
}

const transactionKeys = {
  all: ["transactions"] as const,
  list: (filters: TransactionQueryFilters) => [...transactionKeys.all, "list", filters] as const,
};

function buildQueryString(page: number, filters: TransactionQueryFilters): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(LIMIT));
  if (filters.search) params.set("search", filters.search);
  if (filters.category_id) params.set("category_id", filters.category_id);
  if (filters.account_id) params.set("account_id", filters.account_id);
  if (filters.is_income !== undefined) params.set("is_income", String(filters.is_income));
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.amount_min_cents !== undefined)
    params.set("amount_min_cents", String(filters.amount_min_cents));
  if (filters.amount_max_cents !== undefined)
    params.set("amount_max_cents", String(filters.amount_max_cents));
  return params.toString();
}

export function useTransactionsQuery(filters: TransactionQueryFilters = {}) {
  return useInfiniteQuery<TransactionListResponse>({
    queryKey: transactionKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const qs = buildQueryString(pageParam as number, filters);
      const res = await fetch(`/api/transactions?${qs}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to fetch transactions");
      }
      return res.json() as Promise<TransactionListResponse>;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.next_page ?? undefined,
    staleTime: 60_000,
  });
}

export interface CreateTransactionInput {
  account_id: string;
  category_id?: string | null;
  amount_cents: number;
  description: string;
  is_income: boolean;
  transaction_date?: string;
  notes?: string | null;
  tags?: string[];
}

export function useCreateTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to create transaction");
      }
      return res.json() as Promise<{ transaction: TransactionListItem }>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export interface UpdateTransactionInput extends Partial<CreateTransactionInput> {
  id: string;
}

export function useUpdateTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTransactionInput) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to update transaction");
      }
      return res.json() as Promise<{ transaction: TransactionListItem }>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useDeleteTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to delete transaction");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
