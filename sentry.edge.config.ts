import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // En edge usar SENTRY_DSN (no público)
  dsn: process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV,

  // App personal de un único usuario: PII aceptable para debug.
  sendDefaultPii: true,

  // Filtrar datos sensibles antes de enviar
  beforeSend(event) {
    // Filtrar query params
    if (event.request?.query_string) {
      event.request.query_string = "[Filtered]";
    }

    // Filtrar cookies sensibles
    if (event.request?.cookies) {
      const safeCookies: Record<string, string> = {};
      for (const [key, value] of Object.entries(event.request.cookies)) {
        if (!key.includes("session") && !key.includes("token")) {
          safeCookies[key] = value;
        } else {
          safeCookies[key] = "[Filtered]";
        }
      }
      event.request.cookies = safeCookies;
    }

    // Filtrar campos financieros del contexto
    if (event.contexts) {
      for (const context of Object.values(event.contexts)) {
        if (context && typeof context === "object") {
          for (const key of Object.keys(context)) {
            if (
              key.includes("amount") ||
              key.includes("balance") ||
              key.includes("price") ||
              key.includes("cent")
            ) {
              (context as Record<string, unknown>)[key] = "[Filtered]";
            }
          }
        }
      }
    }

    return event;
  },

  // 100% en dev, 10% en producción
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Habilita el producto Sentry Logs
  enableLogs: true,

  // Ignorar errores conocidos y no críticos
  ignoreErrors: ["NetworkError", "Failed to fetch", "Load failed", "AbortError", "ChunkLoadError"],

  debug: process.env.NODE_ENV === "development",
});
