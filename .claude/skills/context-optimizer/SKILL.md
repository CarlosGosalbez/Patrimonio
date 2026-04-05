---
name: context-optimizer
description: "Guidelines for keeping Claude Code sessions efficient in Patrimio: subagent routing, skill preloading, path-scoped rules, compaction strategy, and optimal prompt patterns for financial development tasks."
---

# Context Optimizer — Patrimio

## Subagent routing (when to delegate)

**Rule:** delegate when output > 200 lines, involves external data, or is a security/quality audit.

| Task                              | Agent                  | Why delegate                 |
| --------------------------------- | ---------------------- | ---------------------------- |
| New table / schema change         | `db-architect`         | Complex SQL, migrations      |
| Security audit after API change   | `security-reviewer`    | OWASP checklist, read-only   |
| Categorize bank transactions      | `auto-categorizer`     | High-volume, haiku cost      |
| Monthly financial narrative       | `financial-insights`   | Long Spanish output          |
| Portfolio / ticker research       | `investment-research`  | Market data fetching         |
| Budget analysis + suggestions     | `budget-optimizer`     | Statistical, Spanish output  |
| Code quality after writing code   | `code-reviewer`        | Full diff, read-only         |
| Multi-layer feature (DB→UI→tests) | `feature-builder`      | Delegates to all specialists |
| Any ambiguous complex task        | `project-orchestrator` | Plans before delegating      |

**Key limitation:** subagents CANNOT spawn other subagents. Chaining must happen from the main conversation (e.g., project-orchestrator → db-architect → security-reviewer in sequence from main thread).

## Agent frontmatter cheatsheet (for creating/editing agents)

```yaml
name: my-agent
description: "Spanish description. Use proactively when..."  # triggers auto-delegation
model: opus | sonnet | haiku | inherit
effort: low | medium | high | max             # max = Opus 4.6 only
memory: user | project | local
skills:
  - skill-name                                # preloads full skill content at startup
tools: Read, Write, Edit, Grep, Glob, Bash
disallowedTools: Write, Edit, MultiEdit       # for read-only agents
color: red | blue | green | yellow | magenta | orange | cyan | purple | pink | violet
tools: ..., Agent(db-architect,security-reviewer)  # restrict which subagents this can spawn
isolation: worktree                           # isolated git worktree (destructive operations)
background: true                              # always run as background task
maxTurns: 20                                  # cap agentic turns
```

## Path-scoped rules (auto-loaded — zero token cost until file touched)

| Rule file      | Loads when touching                                              |
| -------------- | ---------------------------------------------------------------- |
| `database.md`  | `supabase/**`, `types/database.ts`                               |
| `security.md`  | `app/api/**`, `lib/supabase/**`, `middleware.ts`                 |
| `financial.md` | `lib/financial/**`, `types/financial.ts`, `components/charts/**` |
| `ai-agents.md` | `app/api/ai/**`, `lib/ai/**`                                     |
| `frontend.md`  | `app/**/*.tsx`, `components/**`, `hooks/**`, `stores/**`         |
| `testing.md`   | `tests/**`, `**/*.test.ts`, `**/*.spec.ts`                       |

## Skills (auto-load by path or invoke by name)

Some skills auto-load when touching matching files; others need explicit invocation:

| Skill                         | Auto-loads on                                           | Invoke explicitly        |
| ----------------------------- | ------------------------------------------------------- | ------------------------ |
| `transaction-formatter`       | `lib/financial/**`, `components/charts/**`              | `/transaction-formatter` |
| `market-data-fetcher`         | `lib/market/**`, `supabase/functions/market-updater/**` | `/market-data-fetcher`   |
| `report-generator`            | `lib/reports/**`, `app/(app)/informes/**`               | `/report-generator`      |
| `supabase-migration`          | (manual only)                                           | `/supabase-migration`    |
| `context-optimizer`           | (manual only)                                           | `/context-optimizer`     |
| `spanish-finance-categorizer` | `app/api/ai/categorize/**`, `lib/ai/**`                 | (internal, no menu item) |
| `anomaly-detector`            | `lib/ai/**`, `app/api/ai/insights/**`                   | (internal, no menu item) |

## Compaction strategy

Auto-compacts at 95% context. On `/compact`, always preserve:

1. Modified files not yet committed
2. Pending migration filenames in progress
3. Active subagent delegation state

Use `/compact Focus on the API changes` to scope what survives.

## CLAUDE.md token tips

- HTML comments `<!-- note -->` are **stripped before injection** — free maintainer notes, zero token cost
- Keep root CLAUDE.md under 200 lines — longer files reduce adherence
- Use `@path/to/file` imports to split into modular includes
- Move task-specific content to skills (on-demand) instead of CLAUDE.md (always loaded)

## Efficient prompt patterns

```
# Good — specific + verifiable
"add a price_alerts table with: ticker TEXT NOT NULL, threshold_pct INT NOT NULL,
 direction CHECK('above','below'), enabled BOOL DEFAULT true, user_id UUID refs auth.users.
 Run type-check after."

# Good — includes error context
"import-assistant fails column detection. Bank: Santander CSV.
 Header: Fecha;Concepto;Importe;Saldo"

# Avoid — vague, no verification criteria
"fix the database" / "improve performance"
```

## Task routing map

```
Any task → project-orchestrator (if multi-layer or ambiguous)
Feature  → feature-builder (DB + API + UI + tests in one delegation)
DB only  → db-architect
Security → security-reviewer (after writing any API route)
Finance  → financial.md auto-loads + financial-insights agent
AI code  → ai-agents.md auto-loads
React    → frontend.md auto-loads
Tests    → testing.md auto-loads
└── Tests?                  → testing.md rule auto-loads
```
