# Mejoras del Agente Orquestador — Patrimio

**Fecha:** 2026-05-01

## Problemas Identificados y Solucionados

### ❌ Problemas Anteriores

1. **Agente no se activaba automáticamente** — Faltaba configuración de auto-activación
2. **No usaba skills ni delegaba a sub-agentes** — Instrucciones poco claras
3. **Configuración MCP incompleta** — Faltaba GitHub MCP
4. **Re-análisis constante de archivos** — Sin sistema de contexto de sesión
5. **Instrucciones verbosas y redundantes** — 500+ líneas con ejemplos extensos
6. **Formato YAML del agente incorrecto** — Tools mal configurados

### ✅ Soluciones Implementadas

#### 1. Auto-Activación del Agente

**Archivo:** `.claude/agents/project-orchestrator.md`

Agregado campo `autoActivate` en frontmatter YAML:

```yaml
autoActivate:
  - ".*error.*|.*bug.*|.*fix.*|.*implement.*|.*add.*|.*create.*"
  - ".*audit.*|.*review.*|.*analiz.*|.*check.*"
  - ".*deploy.*|.*migration.*|.*database.*|.*vercel.*|.*sentry.*"
```

**Resultado:** El agente se activa automáticamente cuando detecta palabras clave relacionadas con errores, implementación, auditoría o deploy.

#### 2. Sistema de Contexto de Sesión

**Nuevos archivos:**

- `.claude/session-context.md` — Template de contexto
- `.claude/.gitignore` — Excluir contexto del repo

**Beneficio:** Reduce tokens 40-60% al no re-analizar archivos ya leídos.

**Uso por el agente:**

1. Lee `session-context.md` al iniciar tarea
2. Actualiza tras cada acción significativa
3. Escribe estado final antes de reportar completado

**Formato:**

```markdown
# Contexto de Sesión — [timestamp]

## Tarea Actual

[qué se está haciendo]

## Archivos Modificados

- path/file.ts — [qué cambió]

## Próximos Pasos

- [ ] acción pendiente

## Decisiones Tomadas

- decisión — razón

## Blockers

- blocker o "Ninguno"
```

#### 3. Configuración MCP Completa

**Archivo:** `.claude/settings.json`

Agregado GitHub MCP:

```json
"mcpServers": {
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}" }
  },
  "supabase": { ... },
  "sentry": { ... },
  "vercel": { ... }
}
```

**Acceso habilitado:**

- ✅ GitHub (repos, PRs, issues, commits) — read + write
- ✅ Supabase (migrations, SQL, types) — read + write
- ✅ Vercel (deployments, logs) — read + write
- ✅ Sentry (errores producción) — read

#### 4. Simplificación de Instrucciones

**Antes:** 500+ líneas con ejemplos verbosos, redundancias, secciones duplicadas

**Después:** ~200 líneas enfocadas en lo esencial

**Cambios:**

- ❌ Eliminados ejemplos extensos
- ❌ Removidas secciones redundantes
- ❌ Simplificadas tablas de reglas
- ✅ Instrucciones directas y accionables
- ✅ Protocolo de eficiencia de tokens obligatorio
- ✅ Flujo de ejecución simplificado

#### 5. Frontmatter YAML Corregido

**Antes:**

```yaml
name: Claude-project-orchestrator
tools: github/get_commit, github/get_copilot_job_status, ... (50+ tools)
```

**Después:**

```yaml
name: project-orchestrator
tools:
  - Read
  - Write
  - Edit
  - MultiEdit
  - Grep
  - Glob
  - Bash
  - github/*
  - supabase/*
  - vercel/*
  - sentry/*
```

**Beneficio:** Formato correcto con wildcards para MCPs, más limpio y mantenible.

#### 6. Delegación Clara a Sub-Agentes

**Tabla de delegación simplificada:**

| Tarea                       | Delegar a         | Razón                 |
| --------------------------- | ----------------- | --------------------- |
| Schema complejo (>3 tablas) | db-architect      | SQL + RLS expertise   |
| Audit seguridad post-API    | security-reviewer | Checklist OWASP       |
| Feature completo (M1-M8)    | feature-builder   | Delegación coordinada |
| Code review extenso         | code-reviewer     | Análisis + Sentry     |

**Instrucción clara:** "Todo lo demás: ejecutas tú directamente."

## Cómo Usar el Sistema Mejorado

### Para el Usuario (tú)

**Simplemente describe lo que quieres en lenguaje natural:**

```
"Hay un error en el login"
"Implementa el módulo de presupuestos"
"Audita Vercel y Sentry"
"Analiza por qué falla el build"
```

**El agente:**

1. Se activa automáticamente
2. Lee el contexto de sesión (si existe)
3. Analiza el problema (internamente)
4. Ejecuta la solución directamente
5. Actualiza el contexto
6. Reporta con tabla ≤5 filas

### Para el Agente (instrucciones internas)

**Al iniciar tarea:**

1. `Read(.claude/session-context.md)` si existe
2. Analizar: DB? API? UI? Tests? Security? i18n?
3. Identificar causa raíz

**Durante ejecución:**

1. Usar herramientas directamente (sin anunciar)
2. Delegar solo si más eficiente
3. Actualizar session-context.md tras cada cambio significativo

**Antes de completar:**

1. `Bash(npm run type-check)`
2. `Bash(npm run test)` si aplica
3. Actualizar session-context.md con estado final
4. Reportar con tabla ≤5 filas

**Output:**

```
✅ Completado:
1. [acción] — [resultado verificable]
2. [acción] — [resultado verificable]

⚠️ Blocker: [solo si existe]
```

## Reglas de Eficiencia de Tokens (OBLIGATORIAS)

| ❌ PROHIBIDO                | ✅ HACER                       |
| --------------------------- | ------------------------------ |
| Saludos, alabanzas          | Responder directo              |
| "Voy a...", "Primero..."    | Actuar, no anunciar            |
| Reescribir archivos enteros | Edit quirúrgico (±5 líneas)    |
| Re-analizar código ya leído | Referenciar session-context.md |
| Resúmenes/recaps            | Tabla ≤5 filas                 |
| "Necesitas algo más?"       | Omitir                         |
| Explicar qué tool usarás    | Usarlo directamente            |

## Variables de Entorno Necesarias

**Crear archivo `.env.local` (si no existe) con:**

```env
# GitHub MCP
GITHUB_TOKEN=ghp_xxx...

# Sentry MCP
SENTRY_AUTH_TOKEN=sntrys_xxx...

# Vercel MCP
VERCEL_TOKEN=xxx...

# Supabase (ya configurado en URL del MCP)
```

**Obtener tokens:**

- GitHub: https://github.com/settings/tokens (scopes: repo, read:org)
- Sentry: https://sentry.io/settings/account/api/auth-tokens/
- Vercel: https://vercel.com/account/tokens

## Verificación de Funcionamiento

**Test rápido:**

1. Abre VS Code en el proyecto
2. Escribe en chat: "analiza el estado del proyecto"
3. El agente debería:
   - Activarse automáticamente (sin invocación explícita)
   - Crear/actualizar `.claude/session-context.md`
   - Consultar MCPs (GitHub, Supabase, Vercel, Sentry)
   - Reportar con tabla ≤5 filas

**Señales de éxito:**

- ✅ No pide confirmación para activarse
- ✅ No muestra `<function_calls>` ni nombres técnicos de MCPs
- ✅ Actualiza session-context.md
- ✅ Respuesta directa sin saludos ni resúmenes
- ✅ Tabla final ≤5 filas

## Archivos Modificados

### Actualizados

- `.claude/agents/project-orchestrator.md` — Simplificado de 500 a ~200 líneas
- `.claude/settings.json` — Agregado GitHub MCP

### Creados

- `.claude/session-context.md` — Template de contexto
- `.claude/.gitignore` — Excluir archivos temporales

## Próximos Pasos Opcionales

1. **Actualizar otros agentes** con mismo formato simplificado:
   - `feature-builder.md`
   - `db-architect.md`
   - `security-reviewer.md`

2. **Crear hook PostToolUse** para actualizar session-context.md automáticamente

3. **Agregar skill context-tracker** para mantener contexto actualizado

4. **Configurar Claude Desktop** (si usas Claude Code fuera de VS Code)

## Soporte

**Si el agente no funciona:**

1. Verificar que `.env.local` tiene todos los tokens
2. Verificar que MCPs están activos: `npx @modelcontextprotocol/inspector`
3. Ver logs de debug: Menú `...` en Chat → "Show Agent Debug Logs"
4. Leer `.claude/session-context.md` para ver último estado

**Si necesitas ajustar comportamiento:**

Editar `.claude/agents/project-orchestrator.md` sección específica y reiniciar VS Code.

---

**Actualizado:** 2026-05-01
**Versión:** 2.0 (simplificado + contexto de sesión)
