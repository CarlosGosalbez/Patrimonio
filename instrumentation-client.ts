import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  // PII: el usuario es el propietario de la app, útil para soporte
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

  // 100% en dev, 10% en producción para tracing de rendimiento
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay: 10% de sesiones normales, 100% de sesiones con errores
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Habilita el producto Sentry Logs (log-to-trace correlation)
  enableLogs: true,

  integrations: [
    Sentry.replayIntegration({
      // App financiera personal — enmascarar texto e imágenes por privacidad
      maskAllText: true,
      blockAllMedia: true,
    }),
    // Widget de feedback de usuario (aparece en esquina inferior derecha al reportar error)
    Sentry.feedbackIntegration({
      colorScheme: "system",
      showBranding: false,
      triggerLabel: "Reportar problema",
      formTitle: "Reportar un problema",
      submitButtonLabel: "Enviar reporte",
      cancelButtonLabel: "Cancelar",
      nameLabel: "Nombre",
      namePlaceholder: "Tu nombre",
      emailLabel: "Email",
      emailPlaceholder: "tu@email.com",
      messageLabel: "Descripción",
      messagePlaceholder: "¿Qué ocurrió? ¿Qué esperabas que ocurriera?",
      successMessageText: "¡Gracias! Tu reporte ha sido enviado.",
    }),
  ],

  // Ignorar errores conocidos y no críticos
  ignoreErrors: [
    // Errores de red comunes
    "NetworkError",
    "Failed to fetch",
    "Load failed",
    "AbortError",
    "Network request failed",
    // Errores de extensiones de navegador
    "top.GLOBALS",
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    "atomicFindClose",
    // Errores de terceros
    "ChunkLoadError",
    // Errores de ResizeObserver (común en React)
    "ResizeObserver loop",
  ],

  // Solo log de SDK en desarrollo
  debug: process.env.NODE_ENV === "development",
});

// Captura transiciones de navegación App Router (Next.js 14+)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
