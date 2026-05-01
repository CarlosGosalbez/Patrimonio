# Security Scanner Skill

## Metadata

- **name**: security-scanner
- **description**: OWASP quick checks: injection (Zod), XSS (DOMPurify), RLS. Detecta vulnerabilidades comunes.
- **when-to-use**: Nueva API route, dependency update, pre-deploy, post-security-review
- **model**: sonnet

## What this skill does

Ejecuta checks rápidos de seguridad enfocados en OWASP Top 3:

1. **A01 Broken Access Control**: RLS, JWT validation, user_id en body
2. **A03 Injection**: Zod .strict(), SQL injection, prompt injection
3. **A07 XSS**: dangerouslySetInnerHTML, DOMPurify, CSP headers

## Actions

```bash
# A01: Access Control
grep -rn "service_role" app/ components/ hooks/ lib/supabase/client.ts
grep -rn "user_id.*body\|user_id.*req.json" app/api/ --include="*.ts"
grep -L "supabase.auth.getUser()" app/api/**/route.ts

# A03: Injection
grep -L ".strict()" app/api/**/route.ts | head -10
grep -rn "to_tsquery.*\${" lib/ supabase/ --include="*.ts" --include="*.sql"
grep -L "hasPromptInjection()" app/api/ai/**/route.ts

# A07: XSS
grep -rn "dangerouslySetInnerHTML" components/ app/ --include="*.tsx"
grep -L "DOMPurify" components/**/*.tsx | xargs grep -l "innerHTML\|dangerously"
grep -rn "Content-Security-Policy" middleware.ts next.config.mjs
```

## Output format

```
🛡️  SECURITY SCAN REPORT
═══════════════════════════════════════════════

🚨 CRITICAL (2 issues)

[A01] app/api/investments/route.ts:23
  Issue: user_id taken from request body, not JWT
  Risk: Attacker can access other users' data
  Fix:
    const { user_id } = await req.json();  // ❌ REMOVE
    const { data: { user } } = await supabase.auth.getUser();
    // Use user.id instead

[A03] app/api/ai/categorize/route.ts:45
  Issue: User input sent to LLM without prompt injection check
  Risk: Malicious prompts can leak system instructions
  Fix:
    if (hasPromptInjection(userDescription)) {
      return new Response("Invalid input", { status: 400 });
    }

⚠️  HIGH (3 issues)

[A03] app/api/transactions/route.ts:67
  Issue: Zod schema missing .strict()
  Risk: Mass assignment, unexpected fields
  Fix: InputSchema.strict().parse(body)

[A07] components/reports/CustomReport.tsx:89
  Issue: dangerouslySetInnerHTML without DOMPurify
  Risk: XSS if user content
  Fix:
    import DOMPurify from "isomorphic-dompurify";
    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}

[A01] lib/supabase/client.ts:12
  Issue: service_role key imported in client-side file
  Risk: Exposed in browser, bypasses RLS
  Fix: Move to Edge Function only

📊 OWASP MATRIX

Category                      Status    Issues
A01 Broken Access Control     ⚠️  FAIL     2
A03 Injection                 ⚠️  FAIL     2
A07 XSS                       ⚠️  FAIL     1
Other (A02,A04-A06,A08-A10)   ✅ PASS     0

🎯 VERDICT: BLOCK 🚫
Fix 5 issues before deploy.

Priority order:
1. Remove user_id from body (A01) — 5 min
2. Add hasPromptInjection() (A03) — 10 min
3. Add .strict() to schemas (A03) — 5 min
4. Move service_role to Edge Function (A01) — 15 min
5. Add DOMPurify (A07) — 5 min

Estimated fix time: 40 min
```

## Prerequisites

- Zod instalado
- isomorphic-dompurify instalado
- lib/security/prompt-injection.ts con hasPromptInjection()

## Example invocation

"@security-scanner revisa el código antes del deploy"
