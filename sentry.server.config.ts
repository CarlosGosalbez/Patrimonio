import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  sendDefaultPii: true,

  // Filtrar datos sensibles antes de enviar a Sentry
  beforeSend(event) {
    // Eliminar query params que puedan contener importes
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

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  includeLocalVariables: true,
  enableLogs: true,
  debug: process.env.NODE_ENV === "development",

  // Integración mejorada de errores
  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ["error", "warn"],
    }),
  ],

  // Ignorar errores conocidos y no críticos
  ignoreErrors: [
    // Errores de red comunes
    "NetworkError",
    "Failed to fetch",
    "Load failed",
    // Errores de extensiones de navegador
    "top.GLOBALS",
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    // Errores de terceros
    "ChunkLoadError",
  ],
});
