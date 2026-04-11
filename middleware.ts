import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── CORS ────────────────────────────────────────────────────────────────────
// Allowlist of origins permitted to call the Patrimio API.
// Only same-origin browser requests pass — third-party callers are rejected.
const ALLOWED_ORIGINS = [
  "https://patrimio.app",
  "https://www.patrimio.app",
  "https://staging.patrimio.app",
  ...(process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://127.0.0.1:3000"]
    : []),
];

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Credentials": "true",
};

function getCorsResponse(origin: string | null, res: NextResponse): NextResponse {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  }
  return res;
}
// ── END CORS ─────────────────────────────────────────────────────────────────

// Rate limiters — only instantiated if Upstash env vars are present
let authRatelimit: Ratelimit | null = null;
let apiRatelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  // Auth endpoints: 10 req/min per IP
  authRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "rl:auth",
  });
  // General API: 100 req/min per IP
  apiRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    prefix: "rl:api",
  });
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous"
  );
}

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/two-factor"];
const PUBLIC_ROUTES = ["/api/auth/callback", "/monitoring"];
const AUTH_API_ROUTES = ["/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // Handle CORS preflight (OPTIONS) for API routes
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const preflightRes = new NextResponse(null, { status: 204 });
    return getCorsResponse(origin, preflightRes);
  }

  // Skip public/static routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);

  // Rate limit: auth API endpoints (10 req/min per IP)
  if (AUTH_API_ROUTES.some((r) => pathname.startsWith(r)) && authRatelimit) {
    const { success, limit, remaining } = await authRatelimit.limit(ip);
    if (!success) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      });
    }
    // Inject rate limit headers on success
    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Limit", String(limit));
    res.headers.set("X-RateLimit-Remaining", String(remaining));
  }

  // Rate limit: general API endpoints (100 req/min per IP)
  if (
    pathname.startsWith("/api/") &&
    !AUTH_API_ROUTES.some((r) => pathname.startsWith(r)) &&
    apiRatelimit
  ) {
    const { success } = await apiRatelimit.limit(ip);
    if (!success) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/transactions") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/investments") ||
    pathname.startsWith("/budgets") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/commitments");

  // Redirect unauthenticated users trying to access app routes
  if (isAppRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect root to dashboard (authenticated) or login (unauthenticated)
  if (pathname === "/") {
    return NextResponse.redirect(new URL(user ? "/dashboard" : "/login", request.url));
  }

  return getCorsResponse(origin, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|manifest)$).*)",
  ],
};
