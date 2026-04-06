import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // En servidor usar SENTRY_DSN (no público), nunca NEXT_PUBLIC_SENTRY_DSN
  dsn: process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV,

  sendDefaultPii: true,

  // 100% en dev, 10% en producción
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Adjunta valores de variables locales a los stack frames (muy útil para debug)
  includeLocalVariables: true,

  // Habilita el producto Sentry Logs (log-to-trace correlation)
  enableLogs: true,

  debug: process.env.NODE_ENV === "development",
});
