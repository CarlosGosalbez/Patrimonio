import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Simple in-memory rate limiter (producción: usar Redis/Upstash)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiter básico por IP para API routes
 * En producción, reemplazar con Upstash Rate Limit o similar
 */
export function rateLimit(config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }) {
  return function middleware(req: NextRequest): NextResponse | null {
    // En desarrollo, skip rate limiting
    if (process.env.NODE_ENV === "development") {
      return null;
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      // Nueva ventana
      rateLimitMap.set(ip, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return null;
    }

    if (record.count >= config.maxRequests) {
      return NextResponse.json(
        {
          error: "Demasiadas solicitudes. Por favor, inténtalo más tarde.",
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((record.resetTime - now) / 1000)),
          },
        },
      );
    }

    record.count++;
    return null;
  };
}

/**
 * Limpiar entradas antiguas cada 10 minutos
 */
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
      if (now > record.resetTime + 60000) {
        rateLimitMap.delete(ip);
      }
    }
  },
  10 * 60 * 1000,
);
