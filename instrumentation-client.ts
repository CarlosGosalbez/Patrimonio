import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  // PII: el usuario es el propietario de la app, útil para soporte
  sendDefaultPii: true,

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

  // Solo log de SDK en desarrollo
  debug: process.env.NODE_ENV === "development",
});

// Captura transiciones de navegación App Router (Next.js 14+)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
