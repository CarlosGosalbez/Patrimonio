# 🔌 Skill: API Service Generator

Servicios Supabase + React Query 5+ type-safe.

## Stack

Supabase JS 2.48+ · React Query 5.56+ · Zod 3.23+ · TypeScript 5.5+ · Sentry 8+

## Features

- Queries, mutations, optimistic updates
- RLS-aware
- Zod validation runtime
- Sentry integration

## Output

```
src/features/[feature]/
├── services/
│   ├── [entity].service.ts
│   ├── [entity].hooks.ts
│   └── [entity].schemas.ts
└── __tests__/
    ├── [entity].service.test.ts
    └── [entity].hooks.test.tsx
```

## 1. Service File (.service.ts)

```typescript
import { createClient } from "@/lib/supabase/client";
import * as Sentry from "@sentry/nextjs";
import type { Database } from "@/types/database.types";
import { TransactionSchema } from "./transactions.schemas";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];

/**
 * TransactionsService - CRUD operations para transacciones
 * Todos los métodos están protegidos por RLS
 */
export const transactionsService = {
  /**
   * Obtener todas las transacciones del usuario autenticado
   * @returns Promise<Transaction[]>
   */
  async getAll(): Promise<Transaction[]> {
    const supabase = createClient();

    Sentry.addBreadcrumb({
      category: "api",
      message: "Fetching all transactions",
      level: "info",
    });

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false });

    if (error) {
      Sentry.captureException(error, {
        tags: { service: "transactions", operation: "getAll" },
      });
      throw error;
    }

    // Runtime validation con Zod
    return TransactionSchema.array().parse(data);
  },

  /**
   * Obtener una transacción por ID
   * @param id - UUID de la transacción
   * @returns Promise<Transaction>
   */
  async getOne(id: string): Promise<Transaction> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      Sentry.captureException(error, {
        tags: { service: "transactions", operation: "getOne" },
        contexts: { transaction: { id } },
      });
      throw error;
    }

    return TransactionSchema.parse(data);
  },

  /**
   * Crear nueva transacción
   * @param transaction - Datos de la transacción
   * @returns Promise<Transaction>
   */
  async create(transaction: TransactionInsert): Promise<Transaction> {
    const supabase = createClient();

    // Validar antes de enviar
    const validatedData = TransactionSchema.parse(transaction);

    const { data, error } = await supabase
      .from("transactions")
      .insert(validatedData)
      .select()
      .single();

    if (error) {
      Sentry.captureException(error, {
        tags: { service: "transactions", operation: "create" },
        contexts: { transaction: validatedData },
      });
      throw error;
    }

    Sentry.addBreadcrumb({
      category: "api",
      message: "Transaction created",
      level: "info",
      data: { id: data.id },
    });

    return TransactionSchema.parse(data);
  },

  /**
   * Actualizar transacción existente
   * @param id - UUID de la transacción
   * @param updates - Campos a actualizar
   * @returns Promise<Transaction>
   */
  async update(id: string, updates: TransactionUpdate): Promise<Transaction> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      Sentry.captureException(error, {
        tags: { service: "transactions", operation: "update" },
        contexts: { transaction: { id, updates } },
      });
      throw error;
    }

    return TransactionSchema.parse(data);
  },

  /**
   * Soft delete de transacción
   * @param id - UUID de la transacción
   * @returns Promise<void>
   */
  async delete(id: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from("transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      Sentry.captureException(error, {
        tags: { service: "transactions", operation: "delete" },
        contexts: { transaction: { id } },
      });
      throw error;
    }

    Sentry.addBreadcrumb({
      category: "api",
      message: "Transaction deleted",
      level: "info",
      data: { id },
    });
  },

  /**
   * Obtener balance total del usuario
   * @returns Promise<number>
   */
  async getBalance(): Promise<number> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_user_balance", {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
    });

    if (error) {
      Sentry.captureException(error);
      throw error;
    }

    return data ?? 0;
  },
};
```

## 2. Hooks File (.hooks.ts)

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionsService } from "./transactions.service";
import * as Sentry from "@sentry/nextjs";
import type { Database } from "@/types/database.types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];

// Query Keys
export const transactionsKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionsKeys.all, "list"] as const,
  list: (filters: string) => [...transactionsKeys.lists(), filters] as const,
  details: () => [...transactionsKeys.all, "detail"] as const,
  detail: (id: string) => [...transactionsKeys.details(), id] as const,
  balance: () => [...transactionsKeys.all, "balance"] as const,
};

/**
 * Hook: Obtener todas las transacciones
 * @returns UseQueryResult<Transaction[]>
 */
export const useTransactions = () => {
  return useQuery({
    queryKey: transactionsKeys.lists(),
    queryFn: transactionsService.getAll,
    staleTime: 30000, // 30 segundos
    retry: 2,
    onError: (error) => {
      Sentry.captureException(error, {
        tags: { hook: "useTransactions" },
      });
    },
  });
};

/**
 * Hook: Obtener una transacción por ID
 * @param id - UUID de la transacción
 * @returns UseQueryResult<Transaction>
 */
export const useTransaction = (id: string) => {
  return useQuery({
    queryKey: transactionsKeys.detail(id),
    queryFn: () => transactionsService.getOne(id),
    enabled: !!id,
    staleTime: 60000, // 1 minuto
    retry: 2,
  });
};

/**
 * Hook: Crear nueva transacción
 * @returns UseMutationResult
 */
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transactionsService.create,
    onMutate: async (newTransaction) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: transactionsKeys.lists() });

      // Snapshot previous value
      const previousTransactions = queryClient.getQueryData(
        transactionsKeys.lists(),
      );

      // Optimistically update
      queryClient.setQueryData<Transaction[]>(
        transactionsKeys.lists(),
        (old) =>
          old
            ? [...old, { ...newTransaction, id: "temp-id" } as Transaction]
            : [],
      );

      return { previousTransactions };
    },
    onError: (error, _newTransaction, context) => {
      // Rollback on error
      queryClient.setQueryData(
        transactionsKeys.lists(),
        context?.previousTransactions,
      );

      Sentry.captureException(error, {
        tags: { hook: "useCreateTransaction" },
      });
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: transactionsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionsKeys.balance() });
    },
  });
};

/**
 * Hook: Actualizar transacción
 * @returns UseMutationResult
 */
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TransactionUpdate }) =>
      transactionsService.update(id, updates),
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(transactionsKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: transactionsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionsKeys.balance() });
    },
    onError: (error) => {
      Sentry.captureException(error, {
        tags: { hook: "useUpdateTransaction" },
      });
    },
  });
};

/**
 * Hook: Eliminar transacción
 * @returns UseMutationResult
 */
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transactionsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionsKeys.balance() });
    },
    onError: (error) => {
      Sentry.captureException(error, {
        tags: { hook: "useDeleteTransaction" },
      });
    },
  });
};

/**
 * Hook: Obtener balance total
 * @returns UseQueryResult<number>
 */
export const useBalance = () => {
  return useQuery({
    queryKey: transactionsKeys.balance(),
    queryFn: transactionsService.getBalance,
    staleTime: 60000, // 1 minuto
    cacheTime: 300000, // 5 minutos
  });
};
```

## 3. Schemas File (.schemas.ts)

```typescript
import { z } from "zod";

/**
 * Zod schema para validación de transacciones
 */
export const TransactionSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  amount: z.number().refine((val) => val !== 0, "Amount cannot be zero"),
  type: z.enum(["income", "expense"]),
  description: z.string().max(500).optional(),
  transaction_date: z.string().datetime(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  deleted_at: z.string().datetime().nullable().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;
```

## 4. Tests

### Service Tests (.service.test.ts)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { transactionsService } from "./transactions.service";
import { createClient } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client");

describe("transactionsService", () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    is: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    single: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
  });

  it("should fetch all transactions", async () => {
    mockSupabase.select.mockResolvedValueOnce({
      data: [{ id: "1", amount: 100 }],
      error: null,
    });

    const result = await transactionsService.getAll();
    expect(result).toHaveLength(1);
  });

  it("should handle errors", async () => {
    mockSupabase.select.mockResolvedValueOnce({
      data: null,
      error: new Error("Database error"),
    });

    await expect(transactionsService.getAll()).rejects.toThrow();
  });
});
```

### Hooks Tests (.hooks.test.tsx)

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTransactions } from './transactions.hooks';

describe('useTransactions', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should fetch transactions', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

## Patrones Avanzados

### Infinite Queries

```typescript
export const useInfiniteTransactions = () => {
  return useInfiniteQuery({
    queryKey: transactionsKeys.lists(),
    queryFn: ({ pageParam = 0 }) => transactionsService.getPaginated(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
};
```

### Realtime Subscriptions

```typescript
export const useRealtimeTransactions = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = supabase
      .channel("transactions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          queryClient.invalidateQueries(transactionsKeys.lists());
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);
};
```

## Mejores Prácticas

- ✅ Query keys estructurados jerárquicamente
- ✅ Optimistic updates en mutations
- ✅ Sentry breadcrumbs en todas las operaciones
- ✅ Runtime validation con Zod
- ✅ Error handling robusto
- ✅ TypeScript strict
- ✅ Stale times configurados apropiadamente

---

**Versión:** 1.0  
**Actualizado:** 2026-05-02  
**Maintainer:** @patrimonio-orchestrator
