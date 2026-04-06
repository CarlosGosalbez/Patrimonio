# SECURITY — Patrimio

**Última auditoría:** 2026-04-06  
**Estado:** ✅ 0 vulnerabilidades activas

---

## Estado actual de dependencias

```bash
npm audit → found 0 vulnerabilities
```

---

## Historial de vulnerabilidades resueltas

### 2026-04-06 — 9 HIGH → 0

| CVE / Advisory                                                           | Paquete afectado                                  | Severidad | Estado      | Resolución                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------- | --------- | ----------- | -------------------------------------------- |
| [GHSA-5j98-mcp5-4vw2](https://github.com/advisories/GHSA-5j98-mcp5-4vw2) | `glob ≤10.4.5`                                    | HIGH      | ✅ Resuelto | `overrides.glob = "10.5.0"` en package.json  |
| [GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq) | `serialize-javascript ≤7.0.4`                     | HIGH      | ✅ Resuelto | `overrides.serialize-javascript = "7.0.5"`   |
| [GHSA-qj8w-gfj5-8c6v](https://github.com/advisories/GHSA-qj8w-gfj5-8c6v) | `serialize-javascript ≤7.0.4`                     | HIGH      | ✅ Resuelto | `overrides.serialize-javascript = "7.0.5"`   |
| [GHSA-9g9p-9gw9-jx7f](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f) | `next 9.5.0–15.5.13` (Image Optimizer DoS)        | HIGH      | ✅ Resuelto | Migración a `next@15.5.14`                   |
| [GHSA-h25m-26qc-wcjf](https://github.com/advisories/GHSA-h25m-26qc-wcjf) | `next 9.5.0–15.5.13` (RSC deserialization DoS)    | HIGH      | ✅ Resuelto | Migración a `next@15.5.14` + Zod `.strict()` |
| [GHSA-ggv3-7p47-pfv8](https://github.com/advisories/GHSA-ggv3-7p47-pfv8) | `next 9.5.0–15.5.13` (HTTP smuggling rewrites)    | HIGH      | ✅ Resuelto | Migración a `next@15.5.14`                   |
| [GHSA-3x4c-7xq6-9pq8](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8) | `next 9.5.0–15.5.13` (disk cache DoS)             | HIGH      | ✅ Resuelto | Migración a `next@15.5.14`                   |
| Indirecta `@next/eslint-plugin-next`                                     | `glob` via `eslint-config-next`                   | HIGH      | ✅ Resuelto | `eslint-config-next@15.5.14`                 |
| Indirecta `workbox-build / workbox-webpack-plugin`                       | `serialize-javascript` via `@ducanh2912/next-pwa` | HIGH      | ✅ Resuelto | Override a `7.0.5`                           |

### Método de resolución

Las vulnerabilidades se resolvieron en dos pasos:

1. **`npm overrides`** en `package.json` — fuerza versiones seguras de dependencias transitivas:

   ```json
   "overrides": {
     "serialize-javascript": "7.0.5",
     "glob": "10.5.0"
   }
   ```

2. **Migración Next.js 14.2.35 → 15.5.14** — la primera versión fuera del rango CVE en la rama 15.x:

   ```bash
   npm install next@15.5.14 eslint-config-next@15.5.14
   ```

   - Compatible con React 18 (sin necesidad de migrar a React 19)
   - Sin breaking changes en las 20 páginas del proyecto (ninguna usa `params`/`searchParams` como props síncronos)

---

## Política de seguridad de dependencias

### Proceso de auditoría

```bash
# Ejecutar semanalmente (o en cada PR con cambios de dependencias)
npm audit

# Revisar breaking changes antes de upgrading major versions
npm outdated
```

### Criterios de acción inmediata

| Criticidad        | Plazo máximo | Acción                         |
| ----------------- | ------------ | ------------------------------ |
| CRITICAL          | 24 horas     | Patch urgente + notify equipo  |
| HIGH (producción) | 72 horas     | Patch o mitigación documentada |
| HIGH (dev-only)   | 1 semana     | Evaluar: override o update     |
| MODERATE          | 2 semanas    | Sprint siguiente               |
| LOW               | 1 mes        | Backlog                        |

### Clasificación dev-only vs producción

Las siguientes dependencias son **solo en build/desarrollo** y sus vulnerabilidades **no afectan el runtime de producción**:

- `eslint-config-next`, `@next/eslint-plugin-next` — solo en CI/lint
- `workbox-build`, `workbox-webpack-plugin` — solo en build de PWA
- `@rollup/plugin-terser` — solo en bundling

> Aún así se parchean en este proyecto por limpieza y para no enmascarar alertas reales.

---

## Reglas de seguridad de código (no negociables)

> Aplicadas automáticamente vía `.github/instructions/security.instructions.md` y `.claude/rules/security.md`

| Regla                                   | Implementación                                                            |
| --------------------------------------- | ------------------------------------------------------------------------- |
| RLS en toda tabla Supabase              | `ALTER TABLE x ENABLE ROW LEVEL SECURITY` + policy `auth.uid() = user_id` |
| Importes monetarios como INTEGER        | `850.75€ → 85075` — nunca FLOAT/DECIMAL                                   |
| Zod `.strict()` en todos los API routes | Previene mass assignment (OWASP A8)                                       |
| `service_role` solo en Edge Functions   | Nunca en código cliente                                                   |
| Soft deletes                            | `deleted_at TIMESTAMPTZ` — nunca DELETE físico                            |
| UUID v4 como PK                         | `gen_random_uuid()` — nunca SERIAL/BIGSERIAL                              |
| `user_id` siempre del JWT               | Nunca del body del request                                                |
| Sanitización DOMPurify                  | `safeString()` / `safeName()` en `lib/validation/safe-zod.ts`             |
| Prompt injection check                  | `hasPromptInjection()` antes de pasar texto al LLM                        |
| Login via Server Action                 | `lib/actions/auth.ts` — cookies establecidas servidor antes del redirect  |

---

## Problema crítico resuelto: race condition en login

**Fecha:** 2026-04-06  
**Causa raíz:** `signInWithPassword()` client-side + `router.push()` inmediato causaba que el middleware no viera las cookies actualizadas → redirect a `/login` → bucle.

**Solución implementada:** Server Action en `lib/actions/auth.ts`:

```text
LoginForm.tsx  →  loginAction() [Server Action]  →  supabase.auth.signInWithPassword()
                                                  →  cookies establecidas en servidor
                                                  →  redirect('/dashboard') [server-side]
```

El middleware siempre encuentra las cookies actualizadas porque el redirect ocurre **después** de que el servidor establece las cookies en la respuesta HTTP.

---

## Contacto de seguridad

Para reportar vulnerabilidades: abrir issue privado en el repositorio o contactar al equipo directamente.

---

## Próxima revisión programada

**Fecha:** 2026-05-06 (mensual)  
**Comando:** `npm audit && npm outdated`
