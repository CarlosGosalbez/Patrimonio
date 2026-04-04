---
description: "Run a security audit on Patrimio code: check for OWASP Top 10 vulnerabilities, RLS policy gaps, authentication bypass risks, improper data exposure, Zod schema weaknesses, and financial data mishandling."
name: "Security Audit"
agent: agent
tools: [read, search]
argument-hint: "What to audit: a specific file path, module name, or 'all' for full project audit"
---

Perform a security audit on the specified Patrimio code.

## Scope

$input

## Audit Process

1. **Read** the target files completely before analyzing
2. **Apply** the security checklist from [security.instructions.md](../.github/instructions/security.instructions.md)
3. **Use** the Security Reviewer subagent for detailed analysis when appropriate
4. **Verify** each OWASP Top 10 category relevant to the code

## Security Checklist

### Authentication & Authorization

- [ ] All API routes authenticate via `supabase.auth.getUser()` (not from body)
- [ ] No route accessible without valid JWT
- [ ] `service_role` key never used in client-side or Next.js code
- [ ] RLS enabled on all Supabase tables queried

### Input Validation

- [ ] All API route inputs use Zod `.strict()` schemas
- [ ] No mass assignment vulnerabilities
- [ ] File upload validation on type and size

### Data Exposure

- [ ] No sensitive data (amounts, descriptions) in error messages
- [ ] No financial data in Sentry events (check `beforeSend` scrubbing)
- [ ] Supabase Storage uses signed URLs, not public paths
- [ ] JWT contents don't include sensitive custom claims

### Financial Data Integrity

- [ ] Monetary amounts stored as INTEGER cents (not floats)
- [ ] No float arithmetic on financial calculations
- [ ] Soft deletes used (no physical DELETE)

### AI Agents

- [ ] Tool calls filter data by `user.id` from JWT scope
- [ ] Agent inputs validated with Zod strict
- [ ] No cross-user data leakage in agent context

## Output Format

Report findings grouped by severity (CRITICAL → HIGH → MEDIUM → LOW).
For each finding:

- File and line number
- Vulnerability type
- Current code snippet
- Fixed code snippet
- OWASP category

Conclude with: "✅ X checks passed, ⚠️ Y issues found"
