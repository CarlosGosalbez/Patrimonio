---
name: spec-analyzer
description: "Analyze product specs, plan phased implementation, identify risks, and route each feature to the correct skill/agent/instruction. Use when breaking down a spec document into phases, scoping a new feature idea, detecting product gaps, or mapping an implementation to the right Patrimio resources."
argument-hint: "What do you need to analyze? ('spec doc', 'new idea: push notifications', 'find improvements in M5')"
---

# Spec Analyzer

Framework for product analysis, phase planning, risk detection, and implementation routing in Patrimio.

## Phase Planning Framework

| Phase           | Focus                                     | Exit Criteria                                            |
| --------------- | ----------------------------------------- | -------------------------------------------------------- |
| 0 — Foundation  | DB schema, auth, RLS, core types          | Migrations applied · Types generated · Auth guard active |
| 1 — Core Loop   | Primary CRUD + minimal UI                 | Happy path works end-to-end on mobile                    |
| 2 — Enhancement | AI agents, automation, analytics, imports | Agents stream correctly · Anomalies detected             |
| 3 — Polish      | Performance, export, PWA, iOS/Safari      | Lighthouse PWA ≥ 90 · E2E Safari passing                 |

## Risk Matrix

Rate each dimension 1–5. Flag items ≥ 3.

| Dimension     | Flag When                                            | Action                             |
| ------------- | ---------------------------------------------------- | ---------------------------------- |
| Security      | Handles financial data, auth, multi-user isolation   | → invoke **Security Reviewer**     |
| DB Complexity | New tables, complex joins, materialized views, RPCs  | → invoke **DB Architect**          |
| Performance   | Real-time prices, large datasets, heavy aggregations | → plan caching + Edge Functions    |
| UX / Mobile   | Touch targets, amount inputs, iOS Safari quirks      | → check `frontend.instructions.md` |
| Compliance    | Investment data displayed, fiscal summaries, totals  | → add regulatory disclaimers       |
| AI Cost       | Claude API calls per user action, tool call depth    | → plan caching + `maxSteps` limit  |

## Skill / Agent Routing Table

| Task                                     | Primary Resource                              | Supporting                    |
| ---------------------------------------- | --------------------------------------------- | ----------------------------- |
| New DB table, RLS policy, migration      | **DB Architect** + `supabase-migration` skill | `database.instructions.md`    |
| SQL query or index optimization          | `supabase-postgres-best-practices` skill      | DB Architect                  |
| API route (auth + validation)            | `security.instructions.md`                    | **Security Reviewer**         |
| Financial calculation (P&L, projections) | `financial-logic.instructions.md`             | `transaction-formatter` skill |
| Currency/date formatting for UI          | `transaction-formatter` skill                 | —                             |
| Spanish bank transaction categorization  | `spanish-finance-categorizer` skill           | **Auto Categorizer**          |
| Market prices (stocks, ETF, crypto)      | `market-data-fetcher` skill                   | **Investment Research**       |
| Spending anomalies or duplicates         | `anomaly-detector` skill                      | **Financial Insights**        |
| Reports / PDF / Excel export             | `report-generator` skill                      | —                             |
| New AI agent (streaming route)           | `ai-agents.instructions.md`                   | **Security Reviewer**         |
| React component, hook, form              | `frontend.instructions.md`                    | —                             |
| Test (unit, integration, E2E)            | `testing.instructions.md`                     | —                             |
| Migration file (prompt-driven)           | `/new-migration` prompt                       | `supabase-migration` skill    |
| New agent (prompt-driven)                | `/new-ai-agent` prompt                        | `ai-agents.instructions.md`   |

## Patrimio Module Map

| ID  | Module                                          | Phase |
| --- | ----------------------------------------------- | ----- |
| M0  | Autenticación (Login, 2FA TOTP, Recovery)       | 0     |
| M1  | Dashboard (widgets, patrimonio neto)            | 1     |
| M2  | Transacciones (entrada, filtros, bulk)          | 1     |
| M3  | Importación Extractos (CSV/Excel, bancos ES)    | 2     |
| M4  | Compromisos Futuros (recurrentes, proyección)   | 1     |
| M5  | Inversiones (cartera, cotizaciones, dividendos) | 2     |
| M6  | Presupuestos (alertas, progreso)                | 2     |
| M7  | Informes y Análisis (PDF, Excel export)         | 3     |
| M8  | Configuración y Perfil                          | 1     |

## Feature Scoping Template (RICE)

For each idea, produce:

```
User Story: Como [usuario], quiero [feature], para [outcome].
Módulo: M[X] — [name]          Fase: [0-3]
DB Impact: [new tables / columns / no change]
Agent Impact: [new agent / extends existing / none]
Skills: [list from routing table]
Risks: [dimension: level, ...]
RICE:  R:[1-5] × I:[1-3] × C:[%] / E:[weeks] = [score]
       Prioridad: Alta > 3 · Media 1-3 · Baja < 1
```

## Spec Document Analysis Procedure

When given a document to analyze:

1. **Parse** — extract all feature mentions; group by module (M0-M8)
2. **Phase** — assign each feature cluster to phase 0-3 based on dependencies and value
3. **Risk** — apply risk matrix to each feature cluster; flag ≥ 3 in any dimension
4. **Route** — for each feature, identify the skill/agent/instruction that implements it
5. **Gap Check** — identify: described but not architected · architected but missing UX · no tests planned
6. **Output** — phased plan + risk table + routing map (formats below)

## Output Templates

### Phase Plan

```markdown
## Plan de Implementación — [Nombre]

### Resumen de Riesgos

| Dimensión | Nivel    | Acción |
| --------- | -------- | ------ |
| Seguridad | 🔴 Alto  | ...    |
| DB        | 🟡 Medio | ...    |

### Fase 0 — Foundation (~X semanas)

**Objetivo:** [objetivo]

- [ ] [Deliverable] → _[Skill / Agent / Instruction]_

### Fase 1 — Core Loop (~X semanas)

...

### Routing Map

| Feature | Recurso de implementación |
| ------- | ------------------------- |
| ...     | ...                       |
```

### Idea Scoping

```markdown
## [Nombre de la Idea] — Implementation Brief

**User Story:** Como [usuario], quiero... para...
**Módulo:** M[X] | **Fase:** [0-3] | **RICE:** [score] ([prioridad])

**DB:** [impacto]
**Skills:** [lista]
**Riesgos:** [lista]
**Next step:** [primer ticket concreto]
```

### Improvement / Gap Report

```markdown
## Análisis de Mejoras — [Área]

### Gaps detectados

| Gap | Impacto | Esfuerzo | Acción |
| --- | ------- | -------- | ------ |

### Quick Wins (< 1 semana)

- ...

### Mejoras Estratégicas (requieren planificación)

- ...

### Riesgos identificados

- ...
```
