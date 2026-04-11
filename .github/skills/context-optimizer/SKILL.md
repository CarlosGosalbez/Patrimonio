---
name: context-optimizer
description: "Audita, limpia y actualiza todos los archivos de contexto de IA de un proyecto (copilot-instructions.md, AGENTS.md, CLAUDE.md, *.instructions.md, SKILL.md, *.agent.md, .claude/rules). Elimina contenido obsoleto que desperdicia tokens, corrige referencias a modelos/APIs deprecadas, y verifica la coherencia entre archivos. Usar cuando el contexto del proyecto huela a desactualizado, cuando haya duplicación entre archivos, o como tarea periódica de mantenimiento."
user-invocable: true
argument-hint: "[ruta del proyecto o 'actual' para el workspace abierto]"
---

# Context Optimizer — Auditoría y Limpieza de Contexto de IA

## ¿Cuándo invocar esta skill?

- Modelos de IA referenciados ya no coinciden con los actuales del proyecto
- Instrucciones contradictorias entre archivos (AGENTS.md vs copilot-instructions.md)
- Fases del proyecto marcadas como "próximamente" ya están completadas
- Paths de archivos en instrucciones que ya no existen en el repo
- Duplicación masiva entre archivos: el mismo bloque de reglas en 3 sitios distintos
- La sesión de Copilot tarda mucho en responder → contexto inflado
- Antes de hacer `git tag vX.X` de una release importante

---

## FASE 1 — Inventario de todos los archivos de contexto

Ejecutar este inventario completo antes de cualquier edición. Listar todos los archivos encontrados:

### Archivos siempre-activos (se inyectan en CADA request):

```
.github/copilot-instructions.md   ← máx recomendado: ~150 líneas
AGENTS.md (raíz y subcarpetas)    ← nearest wins en subcarpetas
CLAUDE.md                         ← Copilot + Claude Code
```

### Archivos condicionales (se cargan por patrón de ruta o relevancia):

```
.github/instructions/*.instructions.md   ← applyTo glob en frontmatter
.claude/rules/*.md                       ← paths array en frontmatter
```

### Skills (carga progresiva — solo descripción al inicio):

```
.github/skills/*/SKILL.md
.claude/skills/*/SKILL.md
~/.copilot/skills/*/SKILL.md
```

### Agentes (carga bajo demanda):

```
.github/agents/*.agent.md
.claude/agents/*.md
```

### Prompts reutilizables:

```
.github/prompts/*.prompt.md
```

**Herramienta a usar:** `file_search` con patrón `**/*.{md,instructions.md}` y `list_dir` en cada carpeta de configuración.

---

## FASE 2 — Matriz de auditoría de stale content

Para cada archivo del inventario, verificar los siguientes indicadores:

### 2.1 Referencias a modelos de IA obsoletos

Buscar con `grep_search`:

```
pattern: "claude-3|claude-opus-3|gpt-4o|gpt-3.5|gemini-1.0|sonnet-3"
```

| Encontrado                 | Reemplazar por                           | Fuente de verdad                                |
| -------------------------- | ---------------------------------------- | ----------------------------------------------- |
| `claude-3-opus`            | `claude-opus-4` o el actual del proyecto | Anthropic changelog                             |
| `claude-3-5-sonnet`        | `claude-sonnet-4-5` o el actual          | Anthropic changelog                             |
| `claude-sonnet-4` (sin -5) | `claude-sonnet-4-5` o el actual          | Verificar en `package.json` `@ai-sdk/anthropic` |
| `gpt-4o-mini`              | Verificar si el proyecto usa Anthropic   | Remover si es incorrecto                        |

**Fuente de verdad primaria:** `package.json` versión de `@ai-sdk/anthropic`, `ai`, o SDK equivalente.

### 2.2 Dependencias/APIs deprecadas

Buscar con `grep_search`:

```
pattern: "auth-helpers-nextjs|@supabase/auth-helpers|next/head|getServerSideProps|getStaticProps|useRouter.*next/router"
```

| Patrón obsoleto                 | Reemplazar por                      |
| ------------------------------- | ----------------------------------- |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr`                     |
| `next/head`                     | `metadata` export en layout.tsx     |
| `getServerSideProps`            | RSC async components                |
| `useRouter` from `next/router`  | `useRouter` from `next/navigation`  |
| `ai/react` useChat (ai v3)      | Verificar versión instalada de `ai` |

### 2.3 Paths de archivos rotos

Para cada path mencionado en instrucciones (ej. `lib/financial/formatters.ts`, `hooks/useTransactions.ts`):

- Usar `file_search` para verificar que el archivo existe
- Si no existe: marcar para eliminar la referencia o actualizar el path

### 2.4 Fases/features marcadas como "próximamente" ya completadas

Buscar:

```
pattern: "TODO|PENDING|próximamente|upcoming|Phase \d+ —.*\(pendiente\)|WIP"
isRegexp: true
```

Para cada hit: verificar si la feature ya existe en el codebase. Si existe → eliminar la nota de pendiente.

### 2.5 Duplicación entre archivos

Comparar secciones entre:

- `copilot-instructions.md` vs `AGENTS.md` vs `CLAUDE.md`
- Regla que aparece en `copilot-instructions.md` Y en `security.instructions.md`

**Principio:** Una regla vive en UN solo lugar. Los otros archivos la referencian o delegan.

- Reglas de seguridad → `security.instructions.md` (applyTo: `app/api/**`)
- Reglas de DB → `database.instructions.md` (applyTo: `supabase/**`)
- Stack y comandos → `copilot-instructions.md` o `AGENTS.md` (solo en uno)

### 2.6 Versiones de frameworks incorrectas

Buscar en context files: `Next.js 14`, `React 18`, `Tailwind v3`, `TypeScript 4`. Verificar contra `package.json`.

---

## FASE 3 — Análisis de footprint de tokens

Estimar el coste de contexto actual:

| Archivo                    | Coste habitual | Umbral alerta |
| -------------------------- | -------------- | ------------- |
| `copilot-instructions.md`  | siempre activo | > 200 líneas  |
| `AGENTS.md` (raíz)         | siempre activo | > 300 líneas  |
| `CLAUDE.md`                | siempre activo | > 150 líneas  |
| `*.instructions.md` (cada) | condicional    | > 150 líneas  |
| `SKILL.md` (body)          | bajo demanda   | > 200 líneas  |
| `*.agent.md` (cada)        | bajo demanda   | > 200 líneas  |

**Señales de inflación:**

- `copilot-instructions.md` + `AGENTS.md` + `CLAUDE.md` juntos > 600 líneas = crítico
- Un `*.instructions.md` con `applyTo: "**"` (aplica siempre) > 100 líneas = revisar
- Una skill con `disable-model-invocation: false` (auto-load) > 150 líneas = revisar

**Técnicas de reducción:**

1. **Eliminar comentarios HTML explicativos** — el LLM no los necesita, solo el humano
2. **Colapsar tablas redundantes** — si una tabla repite lo que ya dice el texto arriba, eliminar la tabla
3. **Reemplazar listas largas de anti-patterns por la regla positiva** — en vez de 10 ❌, 1 regla ✅
4. **Mover reglas de dominio a instructions condicionales** — sacar de copilot-instructions.md lo que solo aplica a `supabase/**`
5. **Usar referencias entre archivos** — `See security.instructions.md for API route rules` en vez de duplicar

---

## FASE 4 — Protocolo de remediación

### Orden de edición (respetar dependencias):

```
1. Actualizar package.json si hay depedencias obsoletas → npm install
2. Editar instrucciones que referencian las dependencias actualizadas
3. Actualizar nombres de modelo en TODOS los archivos de una vez (multi_replace)
4. Eliminar secciones duplicadas (mantener en el archivo más específico)
5. Actualizar paths rotos o eliminar referencias a archivos inexistentes
6. Refactorizar archivos inflados (> umbrales de fase 3)
7. Actualizar frontmatter de skills/instructions si applyTo es incorrecto
```

### Reglas de edición quirúrgica:

- Cambios < 20 líneas: `replace_string_in_file` con 3+ líneas de contexto
- Cambios en múltiples archivos: `multi_replace_string_in_file` en una sola operación
- NUNCA reescribir un archivo completo si solo cambian 5 líneas
- Leer siempre el archivo completo antes de editar

### Cuándo NO editar:

- `types/database.ts` — siempre regenerar con `npm run db:types`
- Archivos generados automáticamente (`next-env.d.ts`, `.next/types/**`)
- Archivos bajo `.github/workflows/` salvo que sean el objetivo explícito

---

## FASE 5 — Verificación post-limpieza

```bash
# 1. No hay errores de tipos después de cambios en instrucciones que afectaron código
npm run type-check

# 2. No hay referencias a modelos viejos que se colaron
grep -r "claude-3\|gpt-4o\|auth-helpers-nextjs" .github/ .claude/ AGENTS.md CLAUDE.md

# 3. Todos los paths referenciados en instrucciones existen
# (Hacer manualmente con file_search para cada path crítico mencionado)
```

### Checklist final:

- [ ] Ningún archivo siempre-activo supera el umbral de líneas de Fase 3
- [ ] El nombre de modelo de IA es idéntico en todos los archivos: `claude-sonnet-4-5` (o el actual)
- [ ] Cero referencias a `auth-helpers-nextjs`, `next/head`, y otras APIs deprecadas
- [ ] Cada regla existe en UN solo archivo (verificar duplicados entre copilot-instructions, AGENTS.md, CLAUDE.md)
- [ ] Los `applyTo` de todos los `.instructions.md` son correctos y específicos (no usar `**` si no es necesario)
- [ ] Las skills con `user-invocable: true` tienen `description` específica (≥ 50 chars, ≤ 1024)
- [ ] No hay bloques `<!-- comentario HTML -->` innecesarios en instrucciones
- [ ] Paths de files en instrucciones verificados con `file_search`

---

## Guía de portabilidad — Aplicar a cualquier proyecto

Para usar esta skill en un proyecto que NO es Patrimio:

### Paso 1 — Detectar el stack

```
file_search: package.json, Gemfile, pyproject.toml, go.mod
```

Identificar: lenguaje, framework principal, ORM/DB, proveedor de IA, plataforma de deploy.

### Paso 2 — Inventariar archivos de contexto (igual que Fase 1)

No todos los proyectos tienen todos los archivos. Proceder solo con los que existan.

### Paso 3 — Adaptar la Matriz de stale content (Fase 2)

Reemplazar los patrones específicos de Patrimio por los del proyecto objetivo:

- Depedencias obsoletas: buscar en `package.json` versiones pinned viejas vs latest
- Modelos de IA: extraer de `package.json` o archivos de configuración del provider
- Frameworks: extraer versiones de `package.json` / lockfile

### Paso 4 — Umbrales de token adaptados por tipo de proyecto

| Tipo de proyecto         | copilot-instructions.md | AGENTS.md | Criterio extra                               |
| ------------------------ | ----------------------- | --------- | -------------------------------------------- |
| Startup/SaaS pequeño     | ≤ 150 líneas            | ≤ 200     | Sin CLAUDE.md si no usan Claude Code         |
| Monorepo enterprise      | ≤ 100 líneas (raíz)     | ≤ 150/pkg | Usar nested AGENTS.md por paquete            |
| Proyecto personal/hobby  | ≤ 80 líneas             | Opcional  | Un solo archivo es suficiente                |
| Librería/SDK open-source | ≤ 120 líneas            | ≤ 150     | Enfocado en API contracts y breaking changes |

### Paso 5 — Resultado esperado

Tras la auditoría, documentar en un comentario o commit:

```
context: audit [fecha]
- Removed: [N] duplicate rules, [N] stale model refs, [N] broken paths
- Reduced: copilot-instructions.md [antes]→[después] lines
- Updated: model names, deprecated API references
- Tokens saved (est): ~[N] tokens per request
```

---

## Patrones de referencia cruzada (evitar duplicación)

En vez de repetir las mismas reglas en varios archivos, usar este patrón:

### En `copilot-instructions.md` (solo el índice):

```markdown
Security rules → automatically loaded from `.github/instructions/security.instructions.md` (applyTo: app/api/**)
DB rules → automatically loaded from `.github/instructions/database.instructions.md` (applyTo: supabase/**)
Financial rules → automatically loaded from `.github/instructions/financial-logic.instructions.md`
```

### En `AGENTS.md` (delegación explícita):

```markdown
For security review of any new API route: invoke `security-reviewer` agent.
For DB schema changes: invoke `db-architect` agent. Full schema rules in `.github/instructions/database.instructions.md`.
```

### En `CLAUDE.md` (máxima brevedad):

```markdown
> Full spec: docs/[project]-technical-spec.md — read before architectural changes.
> Domain rules auto-load via .claude/rules/ when touching matching files.
```

**Regla de oro:** Si el mismo bloque de texto aparece en 2 o más archivos de contexto → extraer al más específico y eliminar del resto.
