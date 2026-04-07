import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // En servidor usar SENTRY_DSN (no público), nunca NEXT_PUBLIC_SENTRY_DSN
  dsn: process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV,

  // App personal de un único usuario: enviar PII (IP, User-Agent) es aceptable
  // para debug. Si se convierte en SaaS multi-usuario, cambiar a false y usar
  // beforeSend para scrubbing manual.
  sendDefaultPii: true,

  // Evitar enviar datos financieros sensibles en breadcrumbs
  beforeSend(event) {
    // Eliminar query params que puedan contener importes
    if (event.request?.query_string) {
      event.request.query_string = "[Filtered]";
    }
    return event;
  },

  // 100% en dev, 10% en producción
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Adjunta valores de variables locales a los stack frames (muy útil para debug)
  includeLocalVariables: true,

  // Habilita el producto Sentry Logs (log-to-trace correlation)
  enableLogs: true,

  debug: process.env.NODE_ENV === "development",
});
