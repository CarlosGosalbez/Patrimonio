"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete transaction");
      return res.json();
    },
    onSuccess: () => {
      // Invalidate dashboard queries to refetch
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
