/**
 * Configuración optimizada de TanStack Query para Patrimio
 * Mejora el caching y reduce refetches innecesarios
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * Configuración por defecto de queries
 */
const defaultQueryOptions = {
  queries: {
    // Tiempo que los datos se consideran "frescos" (no refetch automático)
    staleTime: 60000, // 1 minuto

    // Tiempo que los datos permanecen en caché después de no usarse
    gcTime: 300000, // 5 minutos

    // Retry en caso de error
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch automático
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,

    // Network mode
    networkMode: "online" as const,
  },
  mutations: {
    retry: 1,
    networkMode: "online" as const,
  },
};

/**
 * Configuración específica por tipo de query
 */
export const queryConfigs = {
  // Datos que cambian frecuentemente (transacciones, balance)
  realtime: {
    staleTime: 0,
    gcTime: 60000, // 1 min
    refetchInterval: 30000, // Refetch cada 30s
  },

  // Datos que cambian ocasionalmente (cuentas, categorías)
  standard: {
    staleTime: 60000, // 1 min
    gcTime: 300000, // 5 min
  },

  // Datos estáticos o que casi nunca cambian (preferencias, perfil)
  static: {
    staleTime: 600000, // 10 min
    gcTime: 3600000, // 1 hora
  },

  // Datos de market (precios, cotizaciones)
  market: {
    staleTime: 300000, // 5 min
    gcTime: 900000, // 15 min
    refetchInterval: 300000, // Refetch cada 5 min durante mercado abierto
  },

  // Reportes y analytics (pesados, no refetch automático)
  reports: {
    staleTime: 300000, // 5 min
    gcTime: 1800000, // 30 min
    refetchOnWindowFocus: false,
  },
};

/**
 * Query client singleton con configuración optimizada
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
  });
}

/**
 * Query keys organizados por dominio
 * Facilita invalidación y debugging
 */
export const queryKeys = {
  // Autenticación
  auth: ["auth"] as const,
  session: ["auth", "session"] as const,

  // Dashboard
  dashboard: ["dashboard"] as const,
  dashboardSummary: ["dashboard", "summary"] as const,

  // Transacciones
  transactions: ["transactions"] as const,
  transactionsList: (filters?: unknown) => ["transactions", "list", filters] as const,
  transaction: (id: string) => ["transactions", id] as const,

  // Cuentas
  accounts: ["accounts"] as const,
  account: (id: string) => ["accounts", id] as const,

  // Categorías
  categories: ["categories"] as const,

  // Inversiones
  investments: ["investments"] as const,
  investmentsOverview: ["investments", "overview"] as const,
  investment: (id: string) => ["investments", id] as const,

  // Presupuestos
  budgets: ["budgets"] as const,
  budget: (id: string) => ["budgets", id] as const,

  // Analytics
  analytics: ["analytics"] as const,
  analyticsSummary: (period?: string) => ["analytics", "summary", period] as const,

  // Market data
  marketPrices: ["market", "prices"] as const,
  marketPrice: (symbol: string) => ["market", "prices", symbol] as const,

  // Preferencias
  preferences: ["preferences"] as const,
  profile: ["profile"] as const,

  // Reportes
  reports: ["reports"] as const,
  report: (type: string, params?: unknown) => ["reports", type, params] as const,
};
