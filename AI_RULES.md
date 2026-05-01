# AI Assistant Universal Rules

> Applies to Claude Code, GitHub Copilot, and any AI assistant working on Patrimio.

## Token efficiency (mandatory)

| ❌ FORBIDDEN                       | ✅ DO               |
| ---------------------------------- | ------------------- |
| Greetings, praise, hedging         | Respond directly    |
| Narrate intent before acting       | Act immediately     |
| Rewrite files for <20 line changes | Surgical edits only |
| Re-analyze code read in session    | Reference previous  |
| Summaries/recaps at end            | Table ≤5 rows       |
| "Need anything else?"              | Omit                |

## File operations

- Read before edit (never assume)
- <20 lines → surgical edit
- Multiple changes → batch in single multi-edit
- Monetary amounts → INTEGER cents only
- Generated files → never edit manually (regenerate)

## Security (non-negotiable)

- RLS on every table
- Zod `.strict()` on all API inputs
- JWT auth, never body `user_id`
- `service_role` only server-side
- Soft delete only (no physical DELETE)
- Signed URLs for storage

## Code standards

- TypeScript strict mode
- No `any`, no `@ts-ignore`, no TODOs
- i18n: `useTranslations()` for all UI strings
- Financial: `lib/financial/formatters.ts` always
- Mobile: touch targets ≥44px
- Accessibility: WCAG 2.2 AA mandatory

## Verification before completion

```bash
npm run type-check  # Zero errors
npm run test        # Relevant tests pass
```

## Output format

```
✅ Completed:
1. [action] — [verifiable result]
2. [action] — [verifiable result]

⚠️ Blocker: [if exists]
```

---

**Response language:** Spanish (unless specified)
**Attitude:** Direct, technical, no fluff
