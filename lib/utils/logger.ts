/**
 * Logging utilities con Sentry integration
 * Centraliza logging y reporting de errores
 */

import * as Sentry from "@sentry/nextjs";

export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Logger centralizado que integra console y Sentry
 */
export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, data);
    }
  },

  info: (message: string, data?: Record<string, unknown>) => {
    console.info(`[INFO] ${message}`, data);
    Sentry.addBreadcrumb({
      category: "info",
      message,
      level: "info",
      data,
    });
  },

  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, data);
    Sentry.addBreadcrumb({
      category: "warning",
      message,
      level: "warning",
      data,
    });
  },

  error: (message: string, error?: Error | unknown, data?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, error, data);
    Sentry.captureException(error instanceof Error ? error : new Error(message), {
      contexts: {
        custom: data,
      },
    });
  },

  /**
   * Log de transacción SQL lenta (solo en dev)
   */
  slowQuery: (query: string, durationMs: number) => {
    if (process.env.NODE_ENV === "development" && durationMs > 1000) {
      console.warn(`[SLOW QUERY] ${durationMs}ms: ${query}`);
    }
  },

  /**
   * Log de render lento de componente React
   */
  slowRender: (componentName: string, durationMs: number) => {
    if (process.env.NODE_ENV === "development" && durationMs > 50) {
      console.warn(`[SLOW RENDER] ${componentName}: ${durationMs}ms`);
    }
  },
};

/**
 * Wrapper para funciones que puede fallar con logging automático
 */
export async function withErrorLogging<T>(
  fn: () => Promise<T>,
  context: string,
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    logger.error(`Error en ${context}`, error);
    return null;
  }
}
