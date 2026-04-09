import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/lib/http/client";

const queryKeys = {
  accounts: ["accounts"] as const,
};

export type Account = {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  currency: string;
  initial_balance_cents: number;
  current_balance_cents: number;
  bank_name: string | null;
  iban: string | null;
  color: string | null;
  icon: string | null;
  is_default: boolean;
  is_hidden: boolean;
  annual_interest_rate: number | null;
  interest_capitalization: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export function useAccountsQuery() {
  return useQuery<Account[]>({
    queryKey: queryKeys.accounts,
    queryFn: async () => {
      const response = await requestJson<{ accounts: Account[] }>("/api/accounts");
      return response.accounts;
    },
    staleTime: 300_000, // 5 minutes
  });
}

export function useUpdateAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string } & Partial<Account>) => {
      const { id, ...updates } = data;
      const response = await requestJson<{ account: Account }>(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      return response.account;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

export function useDeleteAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const response = await requestJson<{ account: Account }>(
        `/api/accounts/${accountId}/soft-delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      return response.account;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}
