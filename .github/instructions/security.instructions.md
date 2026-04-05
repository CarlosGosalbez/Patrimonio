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
} = await supabase.storage.from("attachments").createSignedUrl(`${userId}/${filename}`, 3600);

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

## Rate Limiting

Implementar rate limiting en Edge Middleware para rutas de IA:

```typescript
// middleware.ts — Rate limit por user_id en rutas AI
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests/min por usuario
});

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/ai/")) {
    const { success } = await ratelimit.limit(userId);
    if (!success) return new Response("Too Many Requests", { status: 429 });
  }
}
```

## CORS

- Nunca usar `Access-Control-Allow-Origin: *` en producción
- API routes de Next.js solo son accesibles desde el mismo origen por defecto
- Si se necesita CORS para Edge Functions de Supabase, restringir a dominios de Vercel:

```typescript
const ALLOWED_ORIGINS = ["https://patrimio.vercel.app", "https://patrimio.com"];
const origin = req.headers.get("origin") ?? "";
if (!ALLOWED_ORIGINS.includes(origin)) {
  return new Response("Forbidden", { status: 403 });
}
```

---

## Form Security — Input Injection Prevention

Supabase uses parameterized queries internally, so raw SQL injection via the JS client is not possible. However, application-layer injection (prompt injection, regex injection, path traversal, stored XSS via form data) must be blocked at the Zod schema layer.

### Zod schema hardening for every form

```typescript
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify"; // works in Node + Edge

// ── String fields ──────────────────────────────────────────────────────────
const safeString = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => v === DOMPurify.sanitize(v), { message: "Input contains unsafe HTML" });

// ── Name fields: no HTML at all ────────────────────────────────────────────
const safeName = z
  .string()
  .trim()
  .min(1, "Required")
  .max(200)
  .regex(/^[^<>"'`;\\]+$/, "Name contains invalid characters");

// ── Amount fields: strict numeric, no injection vector ─────────────────────
const amountInput = z
  .string()
  .regex(/^\d+([.,]\d{1,2})?$/, "Invalid amount format")
  .transform((v) => parseFloat(v.replace(",", ".")));
// OR directly:
const amountNumber = z.number().finite().positive().max(999_999_999);

// ── UUID fields: validate format to prevent path traversal ─────────────────
const uuidField = z.string().uuid("Invalid identifier");

// ── Date fields: ISO format only ───────────────────────────────────────────
const dateField = z.string().date("Invalid date format"); // YYYY-MM-DD

// ── URL fields: allowlist origins ─────────────────────────────────────────
const safeUrl = z
  .string()
  .url()
  .refine(
    (url) => {
      const parsed = new URL(url);
      return ["https:"].includes(parsed.protocol);
    },
    { message: "Only HTTPS URLs allowed" },
  );

// ── Example transaction schema (production-grade) ──────────────────────────
export const CreateTransactionSchema = z
  .object({
    amount_cents: z.number().int().positive().max(999_999_999_99),
    description: safeString(500).optional(),
    category_id: uuidField,
    account_id: uuidField,
    transaction_date: dateField,
    notes: safeString(2000).optional(),
  })
  .strict(); // .strict() REQUIRED: rejects unknown fields (mass assignment)
```

### AI agent / prompt injection prevention

Never pass raw user input directly to Claude. Always sanitize before inserting into prompts:

```typescript
// lib/ai/sanitize.ts
export function sanitizeForPrompt(input: string): string {
  return input
    .replace(/[<>]/g, "") // strip HTML tags
    .replace(/\n{3,}/g, "\n\n") // collapse whitespace bombs
    .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, "") // remove non-printable chars
    .trim()
    .slice(0, 2000); // hard length cap
}

// In agent route:
const userMessage = sanitizeForPrompt(input.messages.at(-1)?.content ?? "");
```

**Prompt injection patterns to detect and reject:**

```typescript
const PROMPT_INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /system:\s*you are/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /\bforget\b.*\binstructions\b/i,
];

export function hasPromptInjection(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((p) => p.test(text));
}
// Return 400 Bad Request if detected — never pass to LLM
```

### File upload security

```typescript
// Always validate server-side, never trust client Content-Type
const ALLOWED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const FileUploadSchema = z.object({
  name: z.string().regex(/^[\w\-. ]+\.(csv|xlsx|xls)$/i, "Invalid filename"),
  size: z.number().max(MAX_FILE_SIZE, "File too large"),
  type: z.enum(ALLOWED_MIME_TYPES as [string, ...string[]], { message: "File type not allowed" }),
});

// Path traversal prevention: never use user filename in storage path
// Always generate a server-side path:
const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
```

---

## Accessibility (a11y) — WCAG 2.2 AA Required

Every UI component must meet WCAG 2.2 Level AA. Radix UI + shadcn/ui provide this foundation; these rules enforce it project-wide.

### Semantic HTML and ARIA

```tsx
// ✅ Use semantic elements — never div-soup
<main>, <nav>, <header>, <footer>, <section aria-labelledby="...">, <article>

// ✅ ARIA required when native semantics unavailable
<div role="status" aria-live="polite">{loadingMessage}</div>   // live regions
<div role="alert" aria-live="assertive">{errorMessage}</div>   // errors
<nav aria-label="Main navigation">
<button aria-expanded={isOpen} aria-controls="dropdown-id">

// ❌ Never use onClick on non-interactive elements without role+tabIndex
// ❌ Never use placeholder as label substitute
```

### Form accessibility (mandatory pattern)

```tsx
// lib/components/forms/AccessibleField.tsx
import { useId } from "react";
import { useTranslations } from "next-intl";

interface FieldProps {
  name: string;
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
}

export function AccessibleField({ name, label, error, description, required }: FieldProps) {
  const id = useId(); // React 18+: stable SSR-compatible ID
  const descId = description ? `${id}-desc` : undefined;
  const errId = error ? `${id}-err` : undefined;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-foreground text-sm font-medium">
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive ml-1">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>

      {description && (
        <p id={descId} className="text-muted-foreground text-xs">
          {description}
        </p>
      )}

      <input
        id={id}
        name={name}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={[descId, errId].filter(Boolean).join(" ") || undefined}
        className="..."
      />

      {error && (
        <p id={errId} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
```

### Keyboard navigation

```tsx
// Every interactive element must be keyboard-reachable
// Focus ring: never remove outline without replacement
<button className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none">

// Focus trap in modals/drawers (Radix Dialog handles this automatically)
// Skip navigation link for keyboard users
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-background p-2 rounded">
  Skip to main content
</a>

// Tab order: never use tabIndex > 0; use DOM order + tabIndex=0 only
```

### Color contrast & visual accessibility

```tsx
// Minimum contrast ratios (WCAG 2.2):
// Normal text: 4.5:1
// Large text (18pt / 14pt bold): 3:1
// UI components (inputs, buttons): 3:1

// ✅ Do not convey information by color alone — always add icon or text
// ❌ Bad: <span className="text-red-500">{error}</span>
// ✅ Good:
<span className="text-destructive flex items-center gap-1">
  <AlertCircle className="h-4 w-4" aria-hidden="true" />
  {error}
</span>

// Status badges: combine color + icon + text
<Badge variant="destructive">
  <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
  {t("status.overbudget")}
</Badge>
```

### Loading and async states

```tsx
// Live regions for async content updates
<div aria-live="polite" aria-atomic="true">
  {isLoading ? (
    <span className="sr-only">{t("common.loading")}</span>
  ) : (
    <TransactionList data={data} />
  )}
</div>

// Loading spinners must have screen reader text
<div role="status">
  <Spinner className="animate-spin" aria-hidden="true" />
  <span className="sr-only">{t("common.loading")}</span>
</div>

// Optimistic updates: announce success/failure
<div role="status" aria-live="polite" className="sr-only">
  {submitStatus === "success" && t("transaction.saved")}
</div>
```

### Financial data accessibility

```tsx
// Monetary amounts: screen readers need context
// ❌ <span>850,75</span>
// ✅
<span>
  <span aria-hidden="true">{formatCurrency(amount, currency)}</span>
  <span className="sr-only">{formatCurrencyVerbose(amount, currency)}</span>
  {/* formatCurrencyVerbose → "850 euros and 75 cents" */}
</span>

// Charts: always provide accessible table alternative
<section aria-label={t("charts.spending.label")}>
  <ResponsiveContainer>
    <LineChart aria-label={t("charts.spending.description")} role="img">
      {/* ... */}
    </LineChart>
  </ResponsiveContainer>
  {/* Accessible data table for screen readers */}
  <table className="sr-only">
    <caption>{t("charts.spending.caption")}</caption>
    {/* data rows */}
  </table>
</section>

// Data tables: always use proper thead/tbody + scope
<table>
  <thead>
    <tr>
      <th scope="col">{t("transactions.columns.date")}</th>
      <th scope="col">{t("transactions.columns.description")}</th>
      <th scope="col" className="text-right">{t("transactions.columns.amount")}</th>
    </tr>
  </thead>
</table>
```

### Reduced motion

```tsx
// Respect prefers-reduced-motion
// In Tailwind: use motion-safe: and motion-reduce: variants
<div className="motion-safe:animate-fade-in motion-reduce:opacity-100">

// For JS animations (Framer Motion / CSS):
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const duration = prefersReducedMotion ? 0 : 300;
```

### a11y checklist per component

- [ ] Every `<img>` has `alt` text (decorative images: `alt=""` + `aria-hidden="true"`)
- [ ] Every form input has an associated `<label htmlFor={id}>`
- [ ] Error messages use `role="alert"` and are linked via `aria-describedby`
- [ ] Modals trap focus (Radix Dialog automatic) and return focus on close
- [ ] Dropdowns and comboboxes use `aria-expanded`, `aria-haspopup`, `aria-activedescendant`
- [ ] Interactive elements have `:focus-visible` ring (never `outline: none` without replacement)
- [ ] Color contrast meets 4.5:1 for normal text, 3:1 for UI components
- [ ] All information conveyed by color also conveyed by shape/icon/text
- [ ] Page has a single `<h1>` and logical heading hierarchy
- [ ] Charts and graphs have accessible text alternatives
- [ ] `aria-live` regions for async updates and form validation
- [ ] Keyboard navigation works without mouse (Tab, Enter, Space, Escape, Arrow keys)
