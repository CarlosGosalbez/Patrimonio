import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ReorderCategoriesInput,
  CategoryTree,
} from "@/lib/categories/types";

/**
 * TanStack Query hooks for FASE 4: Custom Categories
 */

// ============================================================
// QUERY KEYS
// ============================================================

const categoriesKeys = {
  all: ["categories"] as const,
  byType: (type?: "income" | "expense") => [...categoriesKeys.all, type] as const,
};

// ============================================================
// QUERIES
// ============================================================

/**
 * Fetch all categories (system + user's)
 */
export function useCategoriesQuery(type?: "income" | "expense") {
  return useQuery({
    queryKey: categoriesKeys.byType(type),
    queryFn: async () => {
      const url = type ? `/api/categories?type=${type}` : "/api/categories";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      return data.categories as CategoryTree[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create a new category
 */
export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create category");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesKeys.all });
    },
  });
}

/**
 * Update a category
 */
export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateCategoryInput & { id: string }) => {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update category");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesKeys.all });
    },
  });
}

/**
 * Delete a category (soft delete)
 */
export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete category");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesKeys.all });
    },
  });
}

/**
 * Reorder categories (drag-drop)
 */
export function useReorderCategoriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReorderCategoriesInput) => {
      const res = await fetch("/api/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reorder categories");
      }
    },
    // Optimistic update
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: categoriesKeys.all });

      const previousCategories = queryClient.getQueryData(categoriesKeys.all);

      queryClient.setQueryData(categoriesKeys.all, (old: CategoryTree[] | undefined) => {
        if (!old) return old;

        const newCategories = [...old];
        data.updates.forEach((update) => {
          const index = newCategories.findIndex((cat) => cat.id === update.id);
          if (index !== -1) {
            newCategories[index] = {
              ...newCategories[index],
              sort_order: update.sort_order,
              ...(update.parent_id !== undefined && { parent_id: update.parent_id }),
            };
          }
        });

        return newCategories.sort((a, b) => a.sort_order - b.sort_order);
      });

      return { previousCategories };
    },
    onError: (_err, _data, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(categoriesKeys.all, context.previousCategories);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoriesKeys.all });
    },
  });
}
