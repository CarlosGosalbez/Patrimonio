---
name: new-feature-spec
description: "Generate a complete feature specification for Patrimio: user story, DB impact, agent impact, UI changes, risks, RICE score, and phased implementation plan."
---

# New Feature Spec

Generate a complete, implementation-ready feature specification for Patrimio.

## Instructions

Use the [Product Strategist](../agents/product-strategist.agent.md) agent to produce this spec.
Load the `spec-analyzer` skill for routing and templates.
Read `docs/patrimio-technical-spec.md` for current architecture context.

---

Describe the feature or idea below and produce a full spec:

**Feature idea:** $FEATURE_IDEA

---

Produce the following sections in Spanish:

## 1. User Story

As a [usuario de Patrimio], I want [feature], so that [outcome].

## 2. Fit in Product

- **Module:** M[X] — [name]
- **Phase:** [0–3] — [Foundation / Core / Enhancement / Polish]
- **Related modules:** (if any cross-module impact)

## 3. DB Impact

List required schema changes following Patrimio conventions:

- New tables (with key columns)
- New columns on existing tables
- New RLS policies needed
- New indexes / views / RPCs

→ **Route to:** DB Architect subagent + `supabase-migration` skill

## 4. Agent / AI Impact

- New agent needed? (name, endpoint, skills)
- Existing agent extended? (which one, how)
- No AI impact?

→ **Route to:** `ai-agents.instructions.md` + `/new-ai-agent` prompt

## 5. Frontend Impact

- New pages/routes
- New components
- Forms and inputs (note any amount fields → `inputMode="decimal"`)
- Mobile/iOS Safari considerations

→ **Route to:** `frontend.instructions.md`

## 6. Risk Assessment

| Dimension     | Level (1–5) | Notes |
| ------------- | ----------- | ----- |
| Security      |             |       |
| DB Complexity |             |       |
| Performance   |             |       |
| UX / Mobile   |             |       |
| Compliance    |             |       |
| AI Cost       |             |       |

Flag any dimension ≥ 3 with the appropriate subagent or instruction.

## 7. RICE Score

| Factor         | Value   | Notes                                         |
| -------------- | ------- | --------------------------------------------- |
| Reach          | /5      | How many user actions/month does this affect? |
| Impact         | /3      | 1=minimal · 2=significant · 3=massive         |
| Confidence     | %       | How sure are we about estimates?              |
| Effort         | weeks   | Development + testing effort                  |
| **RICE Score** | R×I×C/E | Alta >3 · Media 1–3 · Baja <1                 |

## 8. Implementation Routing

| Task | Skill / Agent / Instruction |
| ---- | --------------------------- |
|      |                             |

(Fill using `spec-analyzer` routing table)

## 9. Phased Plan

Break into subtasks per phase:

**Fase 0 — Foundation**

- [ ] ...

**Fase 1 — Core**

- [ ] ...

**Fase 2 — Enhancement** (if applicable)

- [ ] ...

## 10. Acceptance Criteria

- [ ] Unit tests for all financial calculations
- [ ] RLS verified: user A cannot access user B data
- [ ] E2E test on Safari iPhone 14
- [ ] (Feature-specific criteria)

---

**Próximo paso recomendado:** [One concrete first action]
