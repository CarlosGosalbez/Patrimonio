---
description: "Use when implementing security features, writing authentication code, reviewing API routes for vulnerabilities, setting up CSP headers, handling user data, or implementing RGPD/GDPR compliance features. Covers OWASP Top 10 mitigations."
name: "Security Guidelines"
---

# Security Guidelines — Patrimio

Patrimio handles sensitive personal financial data. Every line of code must follow **Security First** principles.

## Authentication Patterns

### Always authenticate from JWT, never from request body

```typescript
// app/api/any-route/route.ts
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // NEVER trust user_id from request body
  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // user.id is the safe, verified user identifier
  const userId = user.id;
}
```

## Input Validation

### Zod strict schemas on all API inputs

```typescript
import { z } from "zod";

// .strict() prevents mass assignment attacks
const CreateTransactionSchema = z
  .object({
    amount_cents: z.number().int().positive(),
    description: z.string().max(500).trim(),
    category_id: z.string().uuid(),
    account_id: z.string().uuid(),
    transaction_date: z.string().date(),
  })
  .strict(); // REQUIRED — rejects unknown fields

// In route handler:
const input = CreateTransactionSchema.parse(await req.json());
```

## XSS Prevention

```typescript
// If rendering user-provided HTML/rich text
import DOMPurify from "dompurify";
const safeHtml = DOMPurify.sanitize(userHtml);

// dangerouslySetInnerHTML is FORBIDDEN without DOMPurify
// React components escape by default — don't bypass this
```

## Session & Token Security

- Access tokens stored in **memory** (never localStorage or sessionStorage)
- Refresh tokens in **HttpOnly cookies** only
- Session data: use Supabase Auth session management
- 2FA TOTP is optional for users but recommended — all auth routes support it

## Secret Management

```typescript
// Environment variables — access pattern
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!; // Public — ok in client
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Public — ok in client
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!; // PRIVATE — server/Edge only

// NEVER expose SUPABASE_SERVICE_ROLE_KEY in client components
// NEVER commit .env files with real credentials
// Secrets go in Vercel Dashboard or Supabase CLI secrets
```

## HTTP Security Headers (next.config.js)

The following headers are required in production (already configured):

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{NONCE}'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## File Upload Security

All file uploads go through Supabase Storage with signed URLs:

```typescript
// Generate signed URL for reading (expires after N seconds)
const {
  data: { signedUrl },
} = await supabase.storage
  .from("attachments")
  .createSignedUrl(`${userId}/${filename}`, 3600);

// NEVER expose rawPath or publicUrl for private buckets
```

Bucket `attachments` has a policy: only the owning user can read/write their folder.

## OWASP Mitigations Checklist

| Risk                      | Mitigation in Patrimio                                           |
| ------------------------- | ---------------------------------------------------------------- |
| Injection                 | Supabase prepared statements + RLS on every query                |
| Broken Auth               | JWT RS256, refresh rotation, TOTP 2FA, 5-attempt lockout         |
| Sensitive Data            | HTTPS/TLS 1.3, AES-256 at rest, no financial data in logs/Sentry |
| IDOR                      | RLS makes cross-user data access impossible at DB level          |
| Security Misconfiguration | CSP headers, security audit in CI/CD                             |
| XSS                       | React default escaping + DOMPurify for rich text                 |
| CSRF                      | SameSite=Strict cookies, JWT in headers                          |
| SSRF                      | Market API calls go through Edge Functions, not from client      |
| Vulnerable Dependencies   | Dependabot + npm audit in CI/CD                                  |
| Logging Failures          | Sentry configured to scrub financial data before sending         |

## RGPD / Data Privacy

When building data export or deletion features:

```typescript
// Data export: all user tables must be included
const tables = [
  "profiles",
  "accounts",
  "categories",
  "transactions",
  "recurring_commitments",
  "investments",
  "investment_operations",
  "budgets",
  "auto_categorization_rules",
  "notifications",
];

// Physical deletion cascade (only on account deletion, never on soft delete)
// Triggered by: supabase.auth.admin.deleteUser(userId)
// All tables have ON DELETE CASCADE on user_id FK
```

AI agents must NOT process data for training — Anthropic API is called with Zero Data Retention preference in API agreements.
