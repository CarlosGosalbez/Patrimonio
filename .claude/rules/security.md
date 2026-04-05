---
paths:
  - "app/api/**"
  - "lib/supabase/**"
  - "middleware.ts"
---

# Security Rules — Patrimio (OWASP Top 10 2025)

## Auth pattern — mandatory on every API route

```typescript
// ALWAYS from JWT, never from request body
const supabase = createServerClient();
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
if (error || !user) return new Response("Unauthorized", { status: 401 });
// user.id is the ONLY source of truth for user_id
```

## Input validation — Zod .strict() prevents mass assignment (A03)

```typescript
const Schema = z
  .object({
    amount_cents: z.number().int().positive(),
    description: z.string().max(255),
  })
  .strict();
try {
  const input = Schema.parse(await req.json());
} catch (e) {
  return new Response("Bad Request", { status: 400 });
}
```

## OWASP Top 10 — quick reference

| ID  | Risk                      | Patrimio mitigation                                  |
| --- | ------------------------- | ---------------------------------------------------- |
| A01 | Broken Access Control     | RLS on every table; `auth.uid() = user_id` policies  |
| A02 | Cryptographic Failures    | Supabase handles encryption; signed URLs for Storage |
| A03 | Injection                 | Supabase parameterized queries; Zod on all inputs    |
| A04 | Insecure Design           | JWT-only auth; cents-only monetary storage           |
| A05 | Security Misconfiguration | `service_role` only in Deno Edge Functions           |
| A06 | Vulnerable Components     | `npm audit` in CI; pin major versions                |
| A07 | Auth Failures             | Supabase Auth + TOTP 2FA; HttpOnly session cookies   |
| A08 | Data Integrity Failures   | Signed URLs; CSP headers; no `eval()`                |
| A09 | Security Logging          | Supabase Audit Logs; Sentry for errors               |
| A10 | SSRF                      | URL allowlist before any `fetch()` to external APIs  |

## Security rules (never break)

- `service_role` key: **only** in Supabase Deno Edge Functions — never in Next.js client or server code
- `user_id`: **only** from `user.id` (JWT) — never from request body, never passed to AI agents
- `dangerouslySetInnerHTML`: only with `DOMPurify.sanitize()`
- Storage paths: **signed URLs only** via `supabase.storage.createSignedUrl()`
- Session tokens: **HttpOnly cookies only** — never localStorage or sessionStorage
- Monetary inputs: convert to INTEGER cents before DB write — reject floats
- File uploads: validate MIME type server-side (not just extension), max 10MB
- External URLs: validate against allowlist before `fetch()` (prevent SSRF)

## Security headers (Next.js middleware)

```typescript
// middleware.ts — apply to all /(app)/* routes
response.headers.set("X-Frame-Options", "DENY");
response.headers.set("X-Content-Type-Options", "nosniff");
response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
response.headers.set(
  "Strict-Transport-Security",
  "max-age=31536000; includeSubDomains",
);
response.headers.set(
  "Permissions-Policy",
  "camera=(), microphone=(), geolocation=()",
);
// CSP: use nonce for inline scripts (generated per-request)
response.headers.set(
  "Content-Security-Policy",
  `default-src 'self'; script-src 'self' 'nonce-${nonce}'; connect-src 'self' https://*.supabase.co`,
);
```

## Rate limiting (API routes)

```typescript
// Use Upstash Redis or Supabase Edge Functions for rate limiting
// Per-user: 60 req/min on write endpoints; 300 req/min on read
// Per-IP: 1000 req/min (DoS protection, before auth)
// AI endpoints: 10 req/min per user (cost control)
```

## CORS (API routes that receive external requests)

```typescript
// Only allow same-origin + Vercel preview URLs
const ALLOWED_ORIGINS = [process.env.NEXT_PUBLIC_APP_URL, /\.vercel\.app$/];
const origin = req.headers.get("origin");
if (
  origin &&
  !ALLOWED_ORIGINS.some((o) =>
    typeof o === "string" ? o === origin : o.test(origin),
  )
)
  return new Response("Forbidden", { status: 403 });
```
