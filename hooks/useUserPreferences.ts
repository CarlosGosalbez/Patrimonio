import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserPreferences } from "@/lib/preferences/types";
import type { Database } from "@/types/database";

type UserPreferencesRow = Database["public"]["Tables"]["user_preferences"]["Row"];

const PREFERENCES_QUERY_KEY = ["user", "preferences"] as const;

/**
 * Fetch user preferences from API
 */
async function fetchPreferences(): Promise<UserPreferencesRow> {
  const response = await fetch("/api/preferences");

  if (!response.ok) {
    throw new Error("Failed to fetch preferences");
  }

  return response.json();
}

/**
 * Update user preferences via API
 */
async function updatePreferences(
  preferences: Partial<UserPreferences>,
): Promise<UserPreferencesRow> {
  const response = await fetch("/api/preferences", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update preferences");
  }

  return response.json();
}

/**
 * Hook to fetch user preferences with TanStack Query
 * @returns Query result with user preferences data
 */
export function usePreferencesQuery() {
  return useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: fetchPreferences,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to update user preferences with optimistic updates
 * @returns Mutation result for updating preferences
 */
export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePreferences,
    onMutate: async (newPreferences) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: PREFERENCES_QUERY_KEY });

      // Snapshot previous value
      const previousPreferences =
        queryClient.getQueryData<UserPreferencesRow>(PREFERENCES_QUERY_KEY);

      // Optimistically update
      if (previousPreferences) {
        queryClient.setQueryData<UserPreferencesRow>(PREFERENCES_QUERY_KEY, {
          ...previousPreferences,
          ...newPreferences,
        });
      }

      return { previousPreferences };
    },
    onError: (err, newPreferences, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(PREFERENCES_QUERY_KEY, context.previousPreferences);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY });
    },
  });
}

/**
 * Get current preferences from cache (synchronous)
 * @returns Current preferences or undefined if not loaded
 */
export function usePreferencesSnapshot() {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<UserPreferencesRow>(PREFERENCES_QUERY_KEY);
}
