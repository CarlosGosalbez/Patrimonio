import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProfileDisplayData, UpdateProfileInput } from "@/lib/profile/types";

// Query keys
export const profileKeys = {
  all: ["profile"] as const,
  detail: () => ["profile", "detail"] as const,
};

/**
 * Fetch current user profile
 */
export function useProfileQuery() {
  return useQuery({
    queryKey: profileKeys.detail(),
    queryFn: async (): Promise<ProfileDisplayData> => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/**
 * Update user profile (optimistic updates)
 */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput): Promise<ProfileDisplayData> => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onMutate: async (newProfile) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.detail() });

      const previousProfile = queryClient.getQueryData<ProfileDisplayData>(profileKeys.detail());

      queryClient.setQueryData<ProfileDisplayData>(profileKeys.detail(), (old) => ({
        ...old!,
        ...newProfile,
      }));

      return { previousProfile };
    },
    onError: (_err, _newProfile, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(profileKeys.detail(), context.previousProfile);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
    },
  });
}
