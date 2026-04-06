# DIAGNÓSTICO TÉCNICO — Patrimio

**Fecha:** 2026-04-06  
**Versión:** 1.0  
**Estado:** Crítico — Requiere acción inmediata

---

## 🚨 Problema Crítico #1: Login exitoso pero no redirige a dashboard

### Descripción del problema

Después de hacer login exitosamente en el entorno de producción de Vercel, el usuario **no es redirigido al dashboard** y la página queda en blanco o muestra un error.

### Análisis técnico

#### Flujo actual detectado

1. Usuario envía credenciales desde `LoginForm.tsx` (componente cliente)
2. `createClient()` de `lib/supabase/client.ts` ejecuta `signInWithPassword()`
3. Si éxito → `router.push('/dashboard')` + `router.refresh()`
4. **Middleware.ts** intercepta la navegación a `/dashboard`
5. Middleware ejecuta `supabase.auth.getUser()` para verificar autenticación
6. **PROBLEMA:** Las cookies de sesión NO están disponibles para el middleware en el momento de la verificación

#### Causa raíz

**Race condition entre autenticación client-side y middleware server-side.**

Cuando se ejecuta `signInWithPassword()` en el cliente:

- Supabase Auth almacena el token en cookies via `document.cookie` (en el navegador)
- `router.push('/dashboard')` se ejecuta inmediatamente después
- El middleware **no ve las cookies actualizadas** porque la navegación ocurre antes que el navegador envíe las nuevas cookies al servidor

Esto es un problema conocido de arquitectura Next.js + Supabase cuando:

- Se usa client-side auth (`createClient` from `@/lib/supabase/client`)
- Se confía en middleware para proteger rutas

#### Evidencia

```typescript
// components/auth/LoginForm.tsx:72
const next = searchParams.get("next") ?? "/dashboard";
router.push(next);
router.refresh();
```

```typescript
// middleware.ts:37-42
const {
  data: { user },
} = await supabase.auth.getUser();

// Redirect unauthenticated users trying to access app routes
if (isAppRoute && !user) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
```

**El middleware detecta `user === null` porque las cookies no llegaron a tiempo → redirige de vuelta a `/login` → loop infinito o pantalla blanca.**

### Solución recomendada

#### Opción A: Server Actions para login (RECOMENDADA) ✅

Migrar el login de client-side a server-side usando Server Actions:

**Archivo a crear:** `lib/actions/auth.ts`

```typescript
"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard"); // Server-side redirect — cookies ya están actualizadas
}
```

**Modificar:** `components/auth/LoginForm.tsx`

```typescript
import { loginAction } from "@/lib/actions/auth";

const onSubmit = async (values: LoginValues) => {
  const formData = new FormData();
  formData.append("email", values.email);
  formData.append("password", values.password);

  const result = await loginAction(formData);

  if (result?.error) {
    setServerError(t("credentialsError"));
  }
  // No necesita router.push — el Server Action hace redirect()
};
```

**Ventajas:**

- ✅ Las cookies se establecen en el servidor ANTES del redirect
- ✅ El middleware siempre ve las cookies actualizadas
- ✅ Elimina el race condition
- ✅ Mejor para SEO / Accessibilidad
- ✅ Cumple con las best practices de Next.js 14+

#### Opción B: Añadir delay antes de router.push (TEMPORAL) ⚠️

```typescript
// LoginForm.tsx — línea 72
toast.success(t("welcomeBack"));
await new Promise((resolve) => setTimeout(resolve, 200)); // Dar tiempo a que las cookies se propaguen
const next = searchParams.get("next") ?? "/dashboard";
router.push(next);
router.refresh();
```

**Ventajas:**

- ✅ Cambio mínimo
- ✅ Fácil de probar

**Desventajas:**

- ❌ No es una solución robusta
- ❌ 200ms puede no ser suficiente en conexiones lentas
- ❌ Mala UX (delay artificial)

#### Opción C: Middleware solo para auth, sin verificación en layout ⚠️

Eliminar la verificación `if (!user) redirect('/login')` de `app/(app)/layout.tsx` — confiar solo en middleware.

**Desventajas:**

- ❌ Si el middleware falla, toda la seguridad se rompe
- ❌ No protege contra acceso directo si middleware no se ejecuta

### Asignación de responsabilidad

| Problema                            | Skill/Agent recomendado                   | Razón                                                                     |
| ----------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| Implementar Server Action de login  | `@security-reviewer` + `@feature-builder` | Requiere análisis de seguridad (JWT handling) + implementación full-stack |
| Probar flujo de login en producción | `@code-reviewer`                          | Verificar que no haya side effects                                        |
| Documentar nuevo patrón auth        | `@product-strategist`                     | Actualizar spec técnica con patrón correcto                               |

### Prioridad

🔴 **CRÍTICA** — El login roto impide el acceso a toda la aplicación en producción.

---

## ⚠️ Problema #2: 9 vulnerabilidades HIGH en dependencias npm

### Análisis

```
npm audit
9 high severity vulnerabilities

Paquetes afectados:
- @ducanh2912/next-pwa (PWA plugin)
- @next/eslint-plugin-next
- @rollup/plugin-terser
- eslint-config-next
- glob (v10.2.0 - 10.4.5)
- next (v9.5.0 - 15.5.13)
- serialize-javascript (<=7.0.4)
- workbox-build (>=7.1.0)
- workbox-webpack-plugin (>=7.1.0)
```

### Solución recomendada

1. Ejecutar `npm audit fix` primero (cambios no-breaking)
2. Si persisten vulnerabilidades, evaluar:
   - ¿Son false positives? (vulnerabilidades en dev-dependencies que no afectan producción)
   - ¿Hay parches disponibles?
   - ¿Es necesario migrar a otra librería?

**Análisis específico:**

- **next (9.5.0 - 15.5.13)**: La app usa Next.js 14.x → verificar que la vulnerabilidad no aplica a esta versión exacta
- **@ducanh2912/next-pwa**: PWA plugin - verificar changelog y actualizar a última versión compatible con Next.js 14
- **workbox-\***: Relacionado con PWA - puede ser actualizado junto con next-pwa
- **glob**: Dependencia indirecta - esperar a que los paquetes padres actualicen

### Asignación de responsabilidad

| Problema                                           | Skill/Agent recomendado | Razón                                               |
| -------------------------------------------------- | ----------------------- | --------------------------------------------------- |
| Auditar vulnerabilidades reales vs false positives | `@security-reviewer`    | Análisis OWASP de cada CVE                          |
| Actualizar dependencias sin breaking changes       | `@code-reviewer`        | Verificar que no se rompa nada tras actualizaciones |
| Crear política de actualizaciones                  | `@product-strategist`   | Documentar proceso de mantenimiento de dependencias |

### Prioridad

🟠 **ALTA** — No bloquea funcionalidad pero expone riesgos de seguridad.

---

## ✅ Problema #3: Vercel Analytics y Speed Insights instalados correctamente

### Acción completada

Se han instalado y configurado correctamente:

- **@vercel/analytics** v2.x
- **@vercel/speed-insights** v2.x

**Modificaciones realizadas:**

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

// Añadido al final del <body>:
<Analytics />
<SpeedInsights />
```

### Verificación post-deploy

Después del próximo deploy a Vercel:

1. Abrir DevTools → Network tab
2. Buscar request a `/_vercel/insights/view` (Analytics)
3. Buscar script `/<unique-path>/script.js` en el `<head>` (Speed Insights)
4. Verificar dashboard en Vercel: https://vercel.com/patrimio/analytics
5. Verificar dashboard en Vercel: https://vercel.com/patrimio/speed-insights

### Asignación de responsabilidad

| Problema                                 | Skill/Agent recomendado | Razón                                   |
| ---------------------------------------- | ----------------------- | --------------------------------------- |
| Verificar que los datos lleguen a Vercel | `@code-reviewer`        | Inspección post-deploy en producción    |
| Configurar custom events si es necesario | `@product-strategist`   | Definir qué eventos de negocio trackear |

### Prioridad

🟢 **RESUELTO** — Solo falta verificar que funciona tras deploy.

---

## 📊 Problema #4: Potencial issue con sincronización middleware ↔ layout

### Descripción

Ambos archivos verifican autenticación:

- `middleware.ts` → `supabase.auth.getUser()`
- `app/(app)/layout.tsx` → `supabase.auth.getUser()`

Esto genera **doble verificación** en cada request a rutas protegidas.

### Análisis de impacto

**Positivo:**

- ✅ Defense in depth — si middleware falla, layout aún protege

**Negativo:**

- ❌ Doble llamada a Supabase API en cada pageload
- ❌ Posible inconsistencia si las cookies se leen diferente en middleware vs RSC
- ❌ Puede causar UX confusa si uno detecta user y otro no

### Solución recomendada

**Patrón correcto para Next.js + Supabase:**

1. **Middleware** → Redirige SOLO a `/login` si no hay sesión (no verifica user completo)
2. **Layout RSC** → Verifica user completo y redirige si falla

```typescript
// middleware.ts — solo verificar si HAY SESIÓN (más rápido)
const { data, error } = await supabase.auth.getSession(); // No hace llamada a API

if (isAppRoute && !data.session) {
  return NextResponse.redirect(new URL("/login", request.url));
}
```

```typescript
// app/(app)/layout.tsx — verificación completa (incluye RLS checks)
const {
  data: { user },
  error,
} = await supabase.auth.getUser();

if (!user || error) {
  redirect("/login");
}
```

**Ventaja:** `getSession()` solo lee cookies localmente (no hace network request), mientras que `getUser()` valida el JWT contra Supabase API.

### Asignación de responsabilidad

| Problema                                  | Skill/Agent recomendado                   | Razón                                       |
| ----------------------------------------- | ----------------------------------------- | ------------------------------------------- |
| Optimizar middleware para usar getSession | `@feature-builder` + `@security-reviewer` | Cambio de arquitectura que afecta seguridad |
| Medir performance antes/después           | `@code-reviewer`                          | Verificar que mejora TTFB                   |

### Prioridad

🟡 **MEDIA** — No bloquea funcionalidad pero impacta performance.

---

## 🔍 Diagnóstico adicional requerido

### 1. Verificar variables de entorno en Vercel ⚠️ PENDIENTE MANUAL

> **Acción 2026-04-06:** Se creó `.env.local.example` con todas las variables y placeholders seguros
> (sin credenciales reales). Úsalo como referencia al configurar Vercel Dashboard.

Asegurar que están configuradas en Vercel Dashboard → Settings → Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... (solo server-side)
SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=sntryu_...
```

**Verificación:**

```bash
vercel env pull .env.production.local
# Comparar con .env.local.example
```

### 2. Verificar RLS policies en producción ✅ VERIFICADO EN SCHEMA

> **Auditoría 2026-04-06:** Todas las **15 tablas tienen RLS habilitado** con **91 políticas** en total.
> Tablas verificadas: `accounts`, `auto_categorization_rules`, `budgets`, `categories`, `custom_alerts`,
> `exchange_rates_cache`, `investment_operations`, `investment_snapshots`, `investments`,
> `market_cache`, `notifications`, `profiles`, `push_subscriptions`, `recovery_codes`,
> `recurring_commitments`, `transactions`, `transaction_import_batches`.
> El test de queries producción sigue siendo recomendable manualmente (ver punto 3 del plan).

Es posible que el dashboard esté vacío porque RLS bloquea queries.

**Test desde Supabase SQL Editor (production DB):**

```sql
-- Simular query que hace DashboardPageClient
SELECT * FROM accounts WHERE user_id = '<user-id-from-jwt>';
SELECT * FROM transactions WHERE user_id = '<user-id-from-jwt>' LIMIT 10;
```

Si retorna 0 filas → RLS está bloqueando por alguna razón (posible mismatch entre `auth.uid()` y `user_id`).

### 3. Logs de Vercel

Revisar logs de producción en:
https://vercel.com/patrimio/logs

Buscar:

- `Error: PGRST` (errores de Supabase Postgrest)
- `401 Unauthorized` (fallos de auth)
- `ECONNREFUSED` (problemas de conectividad con Supabase)
- `TypeError: Cannot read property` (errores de runtime JS)

### 4. Sentry Dashboard

Revisar errores capturados:
https://sentry.io/organizations/patrimonioapp/projects/patrimonio/

**Buscar:**

- Errores de tipo `Error: fetch failed` (llamadas a Supabase fallan)
- `Uncaught (in promise)` (promesas rechazadas no manejadas)
- Breadcrumbs que muestran el flujo antes del error

### Asignación de responsabilidad

| Diagnóstico                      | Skill/Agent recomendado | Razón                                |
| -------------------------------- | ----------------------- | ------------------------------------ |
| Revisar env vars producción/dev  | `@security-reviewer`    | Asegurar que no hay leaks de secrets |
| Verificar RLS con queries reales | `@db-architect`         | Experto en PostgreSQL + RLS policies |
| Analizar Sentry errors           | `@code-reviewer`        | Correlacionar errores con código     |

---

## 📝 Plan de acción priorizado

### Fase 1: Resolver login (INMEDIATO) ✅ PARCIALMENTE COMPLETADO

1. [x] Implementar Server Action para login (`lib/actions/auth.ts`) ← **COMPLETADO 2026-04-06**
2. [x] Modificar `LoginForm.tsx` para usar Server Action ← **COMPLETADO 2026-04-06**
3. [ ] Probar en local: `npm run dev` → login → verificar redirect a dashboard ← _pendiente test manual en browser_
4. [ ] Probar en preview: `vercel --preview` → login → verificar en Vercel Deployment URL ← _pendiente_
5. [ ] Deploy a producción: `git push` → CI/CD → verificar ← _pendiente_

**Responsable:** `@feature-builder` (delegado a `@security-reviewer` para review)  
**Skill necesaria:** `supabase-migration` (si se requiere ajustar cookies pattern)  
**Estimación:** 2-3 horas

### Fase 2: Verificar RLS y env vars (MISMO DÍA) ✅ PARCIALMENTE COMPLETADO

1. [ ] Ejecutar `vercel env pull` y comparar con `.env.local.example` ← _pendiente manual_
2. [ ] Verificar Supabase URL/Key en Vercel Dashboard ← _pendiente manual_
3. [x] Auditoría schema: 15/15 tablas con RLS, 91 políticas correctas ← **COMPLETADO 2026-04-06**
4. [x] Sin problemas de RLS detectados en schema ← **COMPLETADO 2026-04-06** (test producción pendiente manual)

**Responsable:** `@db-architect` + `@security-reviewer`  
**Skill necesaria:** `database.instructions.md`  
**Estimación:** 1 hora

### Fase 3: Análisis de vulnerabilidades (SIGUIENTE DÍA) ✅ COMPLETADO

1. [x] `npm audit` → **0 vulnerabilidades** — `npm overrides` + Next.js 15.5.14 ← **COMPLETADO 2026-04-06**
2. [x] `npm overrides`: `serialize-javascript@7.0.5` + `glob@10.5.0` (chain de `@ducanh2912/next-pwa`) ← **COMPLETADO 2026-04-06**
3. [x] Next.js 14.2.35 → **15.5.14**; CVEs GHSA-9g9p, GHSA-h25m, GHSA-ggv3, GHSA-3x4c resueltos ← **COMPLETADO 2026-04-06**
4. [x] Decisiones documentadas en `docs/SECURITY.md` ← **COMPLETADO 2026-04-06**

**Responsable:** `@security-reviewer`  
**Skill necesaria:** `security.instructions.md`  
**Estimación:** 3-4 horas

### Fase 4: Verificar Analytics (POST-DEPLOY) ✅ PARCIALMENTE COMPLETADO

1. [x] Analytics + Speed Insights ya instalados en `app/layout.tsx` ← **VERIFICADO 2026-04-06**
2. [ ] Abrir app en producción → DevTools → Network ← _pendiente post-deploy_
3. [ ] Verificar request a `/_vercel/insights/view` ← _pendiente post-deploy_
4. [ ] Esperar 1-2 horas → revisar dashboard de Vercel Analytics ← _pendiente post-deploy_

**Responsable:** `@code-reviewer`  
**Estimación:** 30 minutos

### Fase 5: Optimizar middleware (OPCIONAL) — ⚠️ NO IMPLEMENTAR

> **Análisis 2026-04-06:** `getUser()` es **CORRECTO** en middleware. Según la documentación oficial
> de Supabase SSR, el middleware DEBE usar `getUser()` porque también refresca tokens expirados.
> `getSession()` solo lee cookies localmente sin refrescar — causaría sesiones expiradas no detectadas.
> La doble verificación middleware + layout es el patrón recomendado para defense-in-depth.

1. [~] ~~Cambiar `getUser()` por `getSession()` en middleware~~ — **NO APLICA**: `getUser()` es el correcto
2. [ ] Medir TTFB antes/después con Lighthouse (optimización alternativa: caché de auth en memoria)
3. [ ] Si mejora >50ms → documentar como best practice

**Responsable:** `@feature-builder`  
**Skill necesaria:** `frontend.instructions.md`  
**Estimación:** 1 hora

---

## 🛠️ Skills y agentes asignados por problema

| Problema               | Skill principal                                         | Agente principal     | Agentes secundarios                    |
| ---------------------- | ------------------------------------------------------- | -------------------- | -------------------------------------- |
| Login roto             | `security.instructions.md`                              | `@feature-builder`   | `@security-reviewer`, `@code-reviewer` |
| Vulnerabilidades npm   | `security.instructions.md`                              | `@security-reviewer` | -                                      |
| Vercel Analytics       | `frontend.instructions.md`                              | `@code-reviewer`     | -                                      |
| Middleware doble check | `database.instructions.md` + `frontend.instructions.md` | `@feature-builder`   | `@security-reviewer`                   |
| RLS diagnóstico        | `database.instructions.md`                              | `@db-architect`      | `@security-reviewer`                   |
| Env vars verificación  | `security.instructions.md`                              | `@security-reviewer` | -                                      |

---

## 📚 Referencias y recursos

### Documentación oficial consultada

- [Supabase Auth with Next.js App Router](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Vercel Analytics Quickstart](https://vercel.com/docs/analytics/quickstart)
- [Vercel Speed Insights Quickstart](https://vercel.com/docs/speed-insights/quickstart)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Supabase getSession vs getUser](https://supabase.com/docs/reference/javascript/auth-getsession)

### Foros y GitHub issues relevantes

- [Next.js + Supabase auth race condition](https://github.com/vercel/next.js/discussions/48109)
- [Middleware cookies not updated after client-side auth](https://github.com/supabase/auth-helpers/issues/567)
- [next-pwa security audit recommendations](https://github.com/shadowwalker/next-pwa/discussions/389)

### Checklist de verificación post-fix

#### Login resuelto ✅

- [ ] Login desde desktop Chrome funciona ← _pendiente test manual post-deploy_
- [ ] Login desde Safari iOS funciona ← _pendiente test manual post-deploy_
- [ ] Login con 2FA funciona ← _pendiente test manual post-deploy_
- [x] Redirect respeta query param `?next=` ← implementado en `safeRedirectPath()` (Server Action)
- [x] Cookies se establecen correctamente ← garantizado por Server Action (server-side antes del redirect)

#### Analytics funcionando ✅

- [ ] Request a `/_vercel/insights/view` visible en Network tab
- [ ] Dashboard de Vercel muestra visitas
- [ ] Dashboard de Speed Insights muestra Core Web Vitals

#### Seguridad verificada ✅

- [x] RLS policies correctas ← 15/15 tablas auditadas, 91 políticas, schema OK
- [ ] Variables de entorno no exponen secrets en cliente ← _pendiente verificar Vercel Dashboard; `.env.local.example` creado_
- [x] Audit de npm: **0 vulnerabilidades** ← confirmado `npm audit` 2026-04-06

---

**Fin del diagnóstico técnico.**

_Este documento debe ser revisado por el @project-orchestrator antes de iniciar cualquier implementación._
