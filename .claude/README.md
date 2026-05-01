# .claude/ — Configuración de Agentes Claude Code

## Estructura

```
.claude/
├── settings.json              # Configuración global + MCPs
├── session-context.md         # Contexto temporal de sesión (no commitear)
├── .gitignore                 # Excluir temporales
├── MEJORAS-ORQUESTADOR.md     # Documentación de mejoras 2.0
├── agents/                    # Agentes especializados
│   ├── project-orchestrator.md  # [P0] Orquestador maestro (AUTO-ACTIVA)
│   ├── feature-builder.md       # [P1] Constructor full-stack
│   ├── db-architect.md          # [P2] Arquitecto DB
│   ├── security-reviewer.md     # [P2] Revisor seguridad
│   ├── code-reviewer.md         # [P4] Revisor código
│   ├── financial-insights.md    # [P3] Insights financieros
│   ├── investment-research.md   # [P3] Investigación inversiones
│   ├── budget-optimizer.md      # [P3] Optimizador presupuestos
│   ├── import-assistant.md      # [P4] Asistente importación
│   └── auto-categorizer.md      # [P4] Auto-categorizador
├── skills/                    # Skills reutilizables
│   ├── supabase-migration/
│   ├── transaction-formatter/
│   ├── spanish-finance-categorizer/
│   ├── financial-data-reader/
│   ├── market-data-fetcher/
│   ├── anomaly-detector/
│   ├── report-generator/
│   ├── spec-analyzer/
│   └── context-optimizer/
├── rules/                     # Reglas path-scoped (auto-load)
│   ├── ai-agents.md           # app/api/ai/**
│   ├── database.md            # supabase/**
│   ├── financial.md           # lib/financial/**
│   ├── frontend.md            # app/**/*.tsx, components/**
│   ├── security.md            # app/api/**, lib/supabase/**
│   └── testing.md             # tests/**, *.test.ts
└── instructions/              # Instrucciones detalladas (legacy)
    ├── ai-agents.instructions.md
    ├── database.instructions.md
    ├── financial-logic.instructions.md
    ├── frontend.instructions.md
    ├── security.instructions.md
    └── testing.instructions.md
```

## MCPs Configurados

| MCP          | Acceso       | Uso                                             |
| ------------ | ------------ | ----------------------------------------------- |
| **github**   | read + write | repos, PRs, issues, commits, branches           |
| **supabase** | read + write | migrations, SQL, types, edge functions, logs    |
| **vercel**   | read + write | deployments, build logs, runtime logs, env vars |
| **sentry**   | read         | errores de producción, stack traces, eventos    |

## Agentes Disponibles

### Orquestador (P0 — Auto-activa)

**Nombre:** `project-orchestrator`

**Se activa automáticamente cuando:**

- Reportas error/bug
- Pides implementar algo
- Solicitas auditoría
- Mencionas deploy, Vercel, Sentry, Supabase

**Usa todos los MCPs y skills. Delega a especialistas cuando es eficiente.**

### Especialistas

| Agente                | Prioridad | Cuándo usar                          |
| --------------------- | --------- | ------------------------------------ |
| `feature-builder`     | P1        | Feature completo DB→API→UI→tests     |
| `db-architect`        | P2        | Schema, migraciones, RLS, índices    |
| `security-reviewer`   | P2        | Audit OWASP post-cambios API/auth    |
| `financial-insights`  | P3        | "analiza mis gastos", "cómo voy hoy" |
| `investment-research` | P3        | "analiza mi portfolio", "ETFs"       |
| `budget-optimizer`    | P3        | "optimiza presupuesto", "50/30/20"   |
| `auto-categorizer`    | P4        | Auto tras importar transacciones     |
| `import-assistant`    | P4        | "importa extracto CSV"               |
| `code-reviewer`       | P4        | Auto tras cambios significativos     |

## Sistema de Contexto de Sesión

**Archivo:** `session-context.md` (temporal, no se commitea)

**Propósito:** Reducir tokens 40-60% evitando re-análisis.

**El agente lo usa para:**

1. Leer estado previo al iniciar tarea
2. Actualizar tras cada acción significativa
3. Escribir estado final antes de completar

**Formato:**

```markdown
# Contexto de Sesión — [timestamp]

## Tarea Actual

[descripción]

## Archivos Modificados

- path/file.ts — [cambio]

## Próximos Pasos

- [ ] acción pendiente

## Decisiones Tomadas

- decisión — razón

## Blockers

- blocker o "Ninguno"
```

## Cómo Usar

### Usuario (tú)

**Simplemente escribe en lenguaje natural:**

```
"Hay un error en login"
"Implementa módulo presupuestos"
"Audita Vercel y Sentry"
```

El agente orquestador se activa automáticamente.

### Invocar agente específico

```
@feature-builder implementa módulo M6 budgets
@db-architect crea tabla budgets con RLS
@security-reviewer revisa nueva API route
```

## Variables de Entorno

**Crear `.env.local` con:**

```env
GITHUB_TOKEN=ghp_xxx...
SENTRY_AUTH_TOKEN=sntrys_xxx...
VERCEL_TOKEN=xxx...
```

## Verificación

**Test rápido:**

1. Escribe: "analiza estado del proyecto"
2. Verifica:
   - ✅ Se activa sin invocación explícita
   - ✅ Crea/actualiza `session-context.md`
   - ✅ Consulta MCPs
   - ✅ Reporta con tabla ≤5 filas
   - ✅ Sin saludos ni resúmenes

## Reglas de Eficiencia

| ❌ Prohibido        | ✅ Hacer                |
| ------------------- | ----------------------- |
| Saludos, alabanzas  | Responder directo       |
| "Voy a..."          | Actuar sin anunciar     |
| Reescribir archivos | Edit quirúrgico         |
| Re-analizar código  | Usar session-context.md |
| Resúmenes largos    | Tabla ≤5 filas          |

## Troubleshooting

**Agente no funciona:**

1. Ver logs: Menú `...` en Chat → "Show Agent Debug Logs"
2. Verificar MCPs: `npx @modelcontextprotocol/inspector`
3. Verificar tokens en `.env.local`
4. Reiniciar VS Code

**Modificar comportamiento:**

Editar `.claude/agents/[agente].md` y reiniciar VS Code.

---

**Versión:** 2.0 (2026-05-01)
**Changelog:** Ver `MEJORAS-ORQUESTADOR.md`
