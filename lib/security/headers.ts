/**
 * Security headers middleware configuration
 * Mejoras adicionales de seguridad para producción
 */

import { NextResponse } from "next/server";

/**
 * Security headers recomendados por OWASP
 */
export const securityHeaders = {
  // Previene ataques XSS
  "X-XSS-Protection": "1; mode=block",

  // Previene clickjacking
  "X-Frame-Options": "DENY",

  // Previene MIME type sniffing
  "X-Content-Type-Options": "nosniff",

  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Permissions policy (antes Feature-Policy)
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",

  // HSTS - Force HTTPS (solo en producción)
  ...(process.env.NODE_ENV === "production"
    ? {
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
      }
    : {}),
};

/**
 * Content Security Policy
 * Protege contra XSS, data injection y otras vulnerabilidades
 */
export function getCSPHeader(): string {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live https://*.sentry.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  // En desarrollo, permitir más fuentes
  if (process.env.NODE_ENV === "development") {
    cspDirectives.push("connect-src 'self' ws://localhost:* http://localhost:*");
  }

  return cspDirectives.join("; ");
}

/**
 * Aplica headers de seguridad a una respuesta
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Headers estáticos
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // CSP dinámico
  response.headers.set("Content-Security-Policy", getCSPHeader());

  return response;
}
