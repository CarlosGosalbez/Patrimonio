---
description: "Create a new custom React hook for Patrimio with TanStack Query for server state, TypeScript strict typing, and proper cache invalidation patterns."
name: "New Custom Hook"
agent: agent
tools: [read, edit, search]
argument-hint: "Describe the hook (e.g., 'useTransactions with filters for date range, category, account and optimistic delete')"
---

Create a new custom React hook for Patrimio.

## Hook description

$input

## Requirements

### File location

`hooks/use[HookName].ts`

### TypeScript

- Strict typing; all parameters and return values typed explicitly
- Use types from `@/types/financial` for domain data
- Return value should be descriptively typed (not just `any`)

### TanStack Query pattern

```typescript
// hooks/useTransactions.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Transaction, TransactionFilters } from "@/types/financial";

// Query keys factory — co-locate with the hook
export const transactionKeys = {
  all: ["transactions"] as const,
  list: (filters: TransactionFilters) =>
    ["transactions", "list", filters] as const,
  detail: (id: string) => ["transactions", "detail", id] as const,
};

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => fetchTransactions(filters),
    staleTime: 30_000, // 30 seconds before refetch
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    // Optimistic update
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.all });
      const snapshot = queryClient.getQueryData(transactionKeys.all);
      // Update cache optimistically
      return { snapshot };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.snapshot) {
        queryClient.setQueryData(transactionKeys.all, context.snapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
```

### Rules

- Fetch functions call Supabase client (NOT directly in hook body)
- Include proper `staleTime` to avoid refetches on every render
- Optimistic updates for mutations that modify lists
- Error state handling
- Loading state handling

### Generate also

- Unit test in `tests/unit/hooks/use[HookName].test.ts`
- Mock Supabase client in test
- Test loading, success, and error states
