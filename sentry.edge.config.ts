import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // En edge usar SENTRY_DSN (no público)
  dsn: process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV,

  // App personal de un único usuario: PII aceptable para debug.
  sendDefaultPii: true,

  // 100% en dev, 10% en producción
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Habilita el producto Sentry Logs
  enableLogs: true,
});
