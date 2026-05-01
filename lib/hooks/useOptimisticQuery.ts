import { useQuery, useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

/**
 * Hook optimizado para queries que necesitan refetch frecuente
 * Incluye manejo de errores, loading states y refresh automático
 */
export function useOptimisticQuery<TData = unknown, TError = Error>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: {
    staleTime?: number;
    refetchInterval?: number;
    enabled?: boolean;
  },
) {
  const t = useTranslations("common");

  return useQuery({
    queryKey,
    queryFn,
    staleTime: options?.staleTime ?? 60000, // 1 min por defecto
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: true,
    retry: 2,
    enabled: options?.enabled ?? true,
    throwOnError: (error) => {
      toast.error(t("errors.loadData"));
      console.error("Query error:", error);
      return false;
    },
  });
}

/**
 * Hook para mutaciones con optimistic updates automáticos
 */
export function useOptimisticMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
    onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
    invalidateQueries?: QueryKey[];
    successMessage?: string;
    errorMessage?: string;
  },
) {
  const queryClient = useQueryClient();
  const t = useTranslations("common");

  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Invalidar queries relacionadas
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      // Toast de éxito
      if (options.successMessage) {
        toast.success(options.successMessage);
      }

      // Callback custom
      if (options.onSuccess) {
        options.onSuccess(data, variables, context as TContext);
      }
    },
    onError: (error, variables, context) => {
      // Toast de error
      toast.error(options.errorMessage ?? t("errors.generic"));

      // Callback custom
      if (options.onError) {
        options.onError(error as TError, variables, context as TContext | undefined);
      }
    },
  });
}

/**
 * Hook para prefetch de datos antes de navegación
 */
export function usePrefetchQuery<TData = unknown>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 60000,
    });
  };
}
