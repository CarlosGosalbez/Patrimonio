# Patrimio — GitHub Copilot Workspace Instructions

## Punto de entrada: @project-orchestrator

Para cualquier tarea compleja (nueva feature, bug multi-capa, decisión de arquitectura) invoca `@project-orchestrator`.
Analiza, planifica y delega a especialistas. No invoques otros agentes directamente salvo para tareas atómicas conocidas.

## Protocolo anti-desperdicio de tokens (obligatorio)

El asistente DEBE seguir estas reglas en TODAS las respuestas:

| Prohibido                                           | Hacer en su lugar                            |
| --------------------------------------------------- | -------------------------------------------- |
| Saludos ("Hola!", "¡Excelente!")                    | Responder directamente                       |
| Repetir la pregunta antes de responder              | Ir al grano                                  |
| Narrar intención ("Voy a analizar...")              | Hacer, no anunciar                           |
| Reescribir archivos enteros para cambiar 3-5 líneas | Edits quirúrgicos con contexto mínimo        |
| Re-analizar código ya analizado en la sesión        | Referenciar análisis previo                  |
| Afirmar hechos no verificados como ciertos          | Indicar fuente o buscar primero              |
| Adulación ("¡Muy buena idea!", "¡Perfecto!")        | Neutral y directo                            |
| Soluciones sobrediseñadas para problemas simples    | La solución más simple que funcione          |
| Conflicto inmediato sin fundamento técnico          | Implementar; señalar riesgos reales al final |
| Ofrecer 3 alternativas cuando hay 1 respuesta clara | Una respuesta, la correcta                   |
| Conclusión que resume lo que se acaba de hacer      | Terminar cuando el trabajo esté hecho        |
| Resúmenes extensos al final con todo el código      | Tabla pequeña (máx 5 filas) de lo completado |
| Re-listar archivos creados o código escrito         | Solo mencionar blockers o pendientes         |
| Frases de relleno ("Como mencioné antes...")        | Omitir                                       |
| "¿Necesitas algo más?" al final                     | Omitir                                       |
| Hedging en hechos conocidos ("quizás", "creo que")  | Afirmar o verificar                          |

## Reglas de edición de archivos

- Cambios < 20 líneas: edits quirúrgicos, nunca reescribir el archivo completo
- Cambios en múltiples bloques: agrupar en una sola operación multi-edit
- Siempre leer el archivo antes de editarlo — nunca asumir el contenido actual

## Proyecto

**Patrimio** — PWA de gestión de patrimonio personal.
Stack: Next.js 15 + TypeScript + Supabase + Vercel + Anthropic Claude API
Spec completa: `docs/patrimio-technical-spec.md`

## Reglas de seguridad NO negociables

- RLS activado en TODA tabla: política mínima `auth.uid() = user_id`
- Importes monetarios: INTEGER centavos siempre (`850.75€ → 85075`)
- Zod `.strict()` en TODOS los schemas de API routes
- `service_role` key: solo en Edge Functions Deno del servidor, nunca en cliente
- Soft deletes: `deleted_at TIMESTAMPTZ` — nunca DELETE físico
- UUID v4 como primary key en todas las tablas
- Signed URLs para Storage — nunca paths directos
- `user_id` en agentes IA: siempre del JWT, nunca del body
- **Never Docker** — Supabase: `npm run db:push`, `npm run db:types` (Management API remota)
- **i18n obligatorio** — todas las strings UI via `next-intl` `useTranslations()`; nunca texto hardcodeado
- **UX/UI: shadcn/ui + Radix + Tailwind v4** — nunca instalar MUI/Chakra/AntDesign
- **Dependencias actualizadas** — verificar que no estén deprecated; `@supabase/ssr` no `auth-helpers-nextjs`
- **WCAG 2.2 AA accesibilidad obligatoria** — cada input tiene `<label htmlFor>` via `useId()`, errores con `role="alert"` + `aria-describedby`, `focus-visible:ring-2` en todos los elementos interactivos, nunca transmitir estado solo por color
- **Formularios seguros** — usar helpers `safeString()`/`safeName()` con `isomorphic-dompurify`; llamar `hasPromptInjection()` antes de que cualquier texto de usuario llegue al LLM

## Convenciones de código

**TypeScript:** `strict: true` · tipos de BD desde `types/database.ts` (no editar manualmente) · `type` para datos · `interface` para props de componentes · alias `@/`

**Naming:** Componentes `PascalCase.tsx` · Hooks `useName.ts` con prefijo `use` · API routes kebab-case · Tablas BD `snake_case_plural` · Edge Functions kebab-case

**Finanzas:** `lib/financial/formatters.ts` siempre para display · locale `es-ES` · nunca floats, siempre centavos INTEGER

**Estado:** Zustand para estado global · TanStack Query para datos del servidor · React Hook Form + Zod para formularios

**i18n:** `next-intl` en todos los componentes · strings en `messages/es.json` + `messages/en.json` · currency/fechas via `formatCurrency()` + `useFormatter()` de next-intl

## Agentes disponibles

| Agente               | Invocación              | Rol                                       | user-invocable |
| -------------------- | ----------------------- | ----------------------------------------- | -------------- |
| Project Orchestrator | `@project-orchestrator` | Entrada principal — planifica y delega    | ✅             |
| Feature Builder      | sub-agente              | Implementa features completas DB→UI→tests | —              |
| Product Strategist   | sub-agente              | Análisis de producto, specs, routing      | —              |
| DB Architect         | sub-agente              | Migraciones, RLS, índices                 | —              |
| Security Reviewer    | sub-agente              | Auditoría OWASP                           | —              |
| Code Reviewer        | sub-agente              | Calidad TypeScript/React                  | —              |
| Financial Insights   | `@financial-insights`   | Análisis financiero en lenguaje natural   | ✅             |
| Import Assistant     | `@import-assistant`     | Importación CSV/Excel bancos españoles    | ✅             |
| Investment Research  | `@investment-research`  | Análisis de inversiones                   | ✅             |
| Budget Optimizer     | `@budget-optimizer`     | Optimización presupuestal 50/30/20        | ✅             |

## Patrones de API Routes

```typescript
// Auth siempre de JWT, nunca del body
const supabase = createServerClient();
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
if (error || !user) return new Response("Unauthorized", { status: 401 });

// Input con Zod strict — siempre
const input = InputSchema.strict().parse(await req.json());

// Streaming con Vercel AI SDK
const result = await streamText({
  model: anthropic("claude-sonnet-4-5"),
  maxSteps: 8,
  abortSignal: req.signal,
});
return result.toDataStreamResponse();
```

## Patrones de migraciones SQL

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_nombre.sql
-- ROLLBACK: DROP TABLE IF EXISTS nombre CASCADE;
CREATE TABLE nombre (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- columnas de negocio: monetarias como INTEGER _cents
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_nombre_user ON nombre(user_id);
ALTER TABLE nombre ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_nombre" ON nombre FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "users_insert_nombre" ON nombre FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_nombre" ON nombre FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON nombre FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

## Testing

- **Vitest**: utilities financieras, schemas Zod, hooks · siempre mockear Anthropic API
- **Playwright**: happy paths críticos en `iPhone 14` y `Desktop Chrome`
- Mínimo: utilities financieras, schemas Zod, flujos auth, CRUD con RLS verificado

## Anti-patterns de código

- ❌ `localStorage` para tokens o datos sensibles (solo cookies HttpOnly)
- ❌ Floats para importes monetarios
- ❌ DELETE físico — usar soft delete con `deleted_at`
- ❌ Editar `types/database.ts` manualmente
- ❌ API routes sin validación Zod `.strict()`
- ❌ `dangerouslySetInnerHTML` sin DOMPurify
- ❌ `user_id` en el body de requests a agentes IA
- ❌ Migraciones que modifiquen migraciones ya aplicadas
- ❌ `useEffect` para fetching — usar TanStack Query
- ❌ Direct Supabase calls en componentes React — usar hooks en `hooks/`

## Modelo de IA y pensamiento

**Modelo por defecto:** Claude Sonnet 4.6 (seleccionarlo en el selector de modelo del chat)  
**Modo de pensamiento:** Medio para tareas habituales  
**Claude Opus:** Solo para errores muy complejos o decisiones de arquitectura críticas con múltiples dependencias

## Distinción clave entre agentes de planificación

| Agente                  | Cuándo usarlo                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `@project-orchestrator` | Coordina la **EJECUCIÓN** — delega a db-architect, feature-builder, security-reviewer para CONSTRUIR            |
| `@product-strategist`   | Gestiona la **IDEACIÓN → DOCUMENTACIÓN** — convierte ideas en spec técnica, planifica sprints, documenta código |

Flujo habitual: `@product-strategist` (spec + sprint) → `@project-orchestrator` (ejecución)
