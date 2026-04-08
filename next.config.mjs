import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
import withPWAInit from "@ducanh2912/next-pwa";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Caching strategies
  runtimeCaching: [
    // Cache-First for static assets (fonts, icons, images)
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "images",
        expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    // Stale-While-Revalidate for dashboard summary
    {
      urlPattern: /^\/api\/dashboard\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "patrimio-dashboard",
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 5 },
      },
    },
    // Network-First for transactions (data freshness matters)
    {
      urlPattern: /^\/api\/(?:accounts|categories|commitments|analytics)\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "patrimio-data",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
      },
    },
    // Network-Only for writes (auth, mutations, imports)
    {
      urlPattern: /^\/api\/(?:auth|imports|investments|reports|budgets|cron|custom-alerts)\/.*/i,
      handler: "NetworkOnly",
    },
  ],
  // App Router offline fallback: the SW serves cached pages when network fails.
  // The /offline page is available for direct navigation when completely offline.
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Generate client-side source maps in production so Sentry can upload and
  // resolve stack traces. Sentry's hideSourceMaps deletes them after upload.
  productionBrowserSourceMaps: true,
  experimental: {},
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // Next.js inline scripts + Sentry
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://browser.sentry-cdn.com https://js.sentry-cdn.com",
            // Estilos inline de Next.js + shadcn
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            // Fuentes
            "font-src 'self' https://fonts.gstatic.com",
            // Supabase realtime, storage, APIs externas de mercado + Sentry tunnel
            `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co"} *.sentry.io https://o*.ingest.sentry.io wss://*.supabase.co`,
            // Imágenes
            "img-src 'self' data: blob: https://*.supabase.co",
            // Workers para PWA + Sentry
            "worker-src 'self' blob:",
            // Frames: nunca embeder
            "frame-ancestors 'none'",
            // Sin plugins
            "object-src 'none'",
            // Form actions solo a self
            "form-action 'self'",
            // Base URI fija
            "base-uri 'self'",
          ].join("; "),
        },
      ],
    },
  ],
};

export default withSentryConfig(withPWA(withNextIntl(nextConfig)), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suprime output no-CI en builds locales
  silent: !process.env.CI,

  // Sube más archivos cliente para mejores stack traces legibles en producción
  widenClientFileUpload: true,

  // Proxy anti-adblockers: /monitoring → sentry.io
  tunnelRoute: "/monitoring",

  // Generate + upload source maps in Sentry, then delete from public output
  hideSourceMaps: true,

  // Detecta Vercel Cron Jobs + elimina Sentry debug logs del bundle
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
