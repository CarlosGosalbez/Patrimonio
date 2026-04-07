# 🎯 PATRIMIO — SESIÓN DE DESARROLLO CRÍTICA

**Fecha:** 2026-04-07  
**Fase:** 1.1 (Post-MVP Fixes & UX Refinement)  
**Modelo recomendado:** Claude Sonnet 4.6  
**Agente:** @project-orchestrator  
**Contexto:** Aplicación en producción (vercel.app) con bugs críticos y mejoras UX urgentes

---

## 📋 RESUMEN EJECUTIVO

Patrimio tiene **5 blockers críticos** que impiden adopción de usuarios reales:

1. **Creación de cuentas bancarias bloqueada** — flujo roto que impide cualquier actividad
2. **Importación Excel disfuncional** — mapeo de columnas incorrecto, parser no detecta formato ING
3. **Agregación de inversiones falla** — "Request failed" sin debugging
4. **UX móvil abrumadora** — menú de navegación litoral, dashboard no responsivo para iPhone
5. **Nombres de campos poco claros** — "compromisos" es demasiado técnico; formularios no adaptativos según tipo

**Objetivo de esta sesión:** Resolver los 5 blockers + mejorar UX móvil sin comprometer seguridad ni performance.

---

## 🔐 CREDENCIALES DE PRUEBA

```
Email:    carlosgosalbez91@gmail.com
Password: Caengogu;11862
Endpoint: https://patrimio.vercel.app/dashboard
Supabase Project: febokmcgjatrfdfuaeyk (eu-west-1)
DB Pool: aws-0-eu-west-1:6543
```

**Acceso permitido:** Revisar logs en Sentry, analizar Vercel Edge Logs, ejecutar queries contra Supabase con JWT del usuario de prueba.

---

## 🗂️ ESTRUCTURA DEL REPOSITORIO

- **Especificación técnica:** `/mnt/project/patrimio-technical-spec.md` (17 secciones, 3600+ líneas)
- **Agente orquestador:** `.claude/agents/project-orchestrator.md` (configurado)
- **Instrucciones CI:** `.github/copilot-instructions.md` (convenciones, anti-patterns)
- **Settings:** `.claude/settings.json` (permisos, env, hooks type-check automático)
- **Stack:** Next.js 14 (App Router) + TypeScript 5 + Tailwind v4 + shadcn/ui + Zustand + TanStack Query + Supabase Auth/DB

---

## 🐛 BLOCKER 1: CREACIÓN DE CUENTAS BANCARIAS IMPOSIBLE

### Síntoma

- Usuario autenticado navega a **Compromisos → Nuevo Compromiso**
- Intenta seleccionar tipo "Hipoteca" (requiere `account_id`)
- Dropdown de cuentas está vacío
- No hay botón "Crear cuenta nueva" visible
- Usuario bloqueado: no puede progresar

### Impacto

- **Severidad:** CRÍTICA
- Afecta: M4 (Compromisos), M2 (Transacciones), M5 (Inversiones)
- No se puede generar ningún dato de prueba

### Causas sospechadas a investigar

```
┌─ CAPA UI (React)
│  ├─ ¿AccountSelector component renderiza dropdown vacío?
│  ├─ ¿Hay llamada a useAccounts hook?
│  ├─ ¿Falta botón "Crear cuenta" o está oculto (display: none)?
│  └─ ¿Error no capturado en TanStack Query?
│
├─ CAPA STATE (Zustand/Query)
│  ├─ ¿useAccounts hook existe y retorna lista?
│  ├─ ¿Query key correcto?
│  └─ ¿Cache invalidada correctamente después de crear cuenta?
│
├─ CAPA API
│  ├─ ¿Route /api/accounts/list existe y es GET?
│  ├─ ¿Validación Zod correcta en POST /api/accounts?
│  ├─ ¿RLS permite SELECT y INSERT en tabla accounts?
│  └─ ¿Response estructura correcta?
│
└─ CAPA DB (PostgreSQL + RLS)
   ├─ ¿Tabla accounts existe con RLS obligatorio?
   ├─ ¿Política SELECT: auth.uid() = user_id?
   ├─ ¿Tabla tiene deleted_at para soft delete?
   └─ ¿Índice idx_accounts_user_active existe?
```

### Plan de investigación (ejecutar en orden)

1. **READ** `app/(app)/compromisos/page.tsx` — componente de lista
2. **READ** `app/(app)/compromisos/new/page.tsx` — formulario nuevo
3. **READ** `components/accounts/AccountSelector.tsx` — selector dropdown
4. **SEARCH** `useAccounts` en codebase
5. **READ** `app/api/accounts/` — rutas existentes
6. **QUERY** Supabase: `SELECT COUNT(*) FROM accounts WHERE user_id = '{test-user-id}'`
7. **CHECK** RLS policies en tabla accounts: `SELECT policy_name FROM pg_policies WHERE tablename = 'accounts'`
8. **READ** `supabase/migrations/` — buscar `CREATE TABLE accounts` y `POLICY accounts`
9. **CHECK** Sentry — buscar errores en últimas 24h relacionados con accounts

---

## 🐛 BLOCKER 2: IMPORTACIÓN EXCEL MAPEO INCORRECTO

### Síntoma

- Usuario sube extracto bancario **ING** (formato Excel con columnas específicas)
- Archivo tiene: `F. VALOR | CATEGORÍA | SUBCATEGORÍA | DESCRIPCIÓN | COMENTARIO | IMPORTE (€) | SALDO (€)`
- Parser de patrimio muestra: `Fecha | Descripción | Importe | Abonos | Cargos | Fecha valor | Tipo | Notas | ID externo`
- Mapa incorrecto → importación falla o asigna mal valores

### Impacto

- **Severidad:** CRÍTICA
- M3 (Importación) completamente bloqueada
- Sin importación, sin datos históricos para análisis

### Causas sospechadas a investigar

```
┌─ CAPA PARSER (SheetJS)
│  ├─ ¿Lectura de headers (row 0)?
│  ├─ ¿Detección automática de separadores/locales?
│  ├─ ¿Encoding UTF-8 correcto (especial para ñ, €)?
│  └─ ¿Manejo de fechas en formato DD/MM/YYYY?
│
├─ CAPA DETECTOR (IA + Heurísticas)
│  ├─ ¿Algoritmo detecta "IMPORTE" como Importe (case-insensitive)?
│  ├─ ¿Detecta moneda €?
│  ├─ ¿Distingue columnas Abonos/Cargos vs Importe único?
│  ├─ ¿Mapeo específico para bancos españoles (ING/BBVA/CaixaBank)?
│  └─ ¿Heurísticas en lib/import/detectors.ts?
│
├─ CAPA UI (Preview)
│  ├─ ¿ComponentePreviewImport renderiza tabla?
│  ├─ ¿Permite drag-drop para reasignar columnas?
│  ├─ ¿Feedback visual de detección correcta?
│  └─ ¿Botón "Detectar columnas" invoca IA o heurísticas?
│
└─ CAPA API
   ├─ ¿POST /api/import/detect-columns existe?
   ├─ ¿POST /api/import/preview existe?
   ├─ ¿Validación antes de procesar?
   └─ ¿Error handling si detección falla?
```

### Plan de investigación

1. **READ** `components/import/FileUploader.tsx` — componente inicial
2. **READ** `components/import/ColumnMapper.tsx` — mapeo de columnas
3. **READ** `lib/import/parsers.ts` — lógica SheetJS
4. **SEARCH** `detectColumns`, `autoMapColumns` en codebase
5. **READ** `lib/import/detectors.ts` — heurísticas de detección (crear si no existe)
6. **READ** `app/api/import/detect-columns` — endpoint de detección
7. **TEST** en navegador: subir excel ING sample, inspeccionar JSON de detección en Network tab
8. **CHECK** Sentry — buscar errores en `import/*` últimas 24h
9. **REVIEW** Spec sección 7.4 — requerimientos de importación ING específicos

---

## 🐛 BLOCKER 3: "NUEVO POSICIÓN" INVESTMENT FALLA

### Síntoma

- Usuario en pantalla **Inversiones**
- Click en botón "Nuevo posición" (debería ser "Nueva inversión")
- Aparece: `Request failed` (error genérico, sin detalles)
- Modal no abre o cierra inmediatamente

### Impacto

- **Severidad:** ALTA
- M5 (Inversiones) no funcional
- Usuario no puede registrar holdings

### Causas sospechadas

```
Posibilidades:
├─ Request 500 en API — bug en backend
├─ Request 401 — JWT expirado o inválido
├─ Validación Zod falla silenciosamente
├─ Network error (CORS, timeout)
├─ Componente no maneja error response
└─ Sentry captura pero mensaje es genérico
```

### Plan de investigación

1. **OPEN** DevTools → Network tab en patrimio.vercel.app
2. **CLICK** "Nuevo posición"
3. **INSPECT** request fallido — verificar:
   - Endpoint exacto
   - Status code
   - Response body
   - Headers (Authorization)
4. **READ** `app/api/investments/create` o similar
5. **CHECK** Sentry — filtrar por User = test user, últimas 2 horas
6. **READ** componente que invoca el request (`components/investments/NewPositionModal.tsx` o similar)
7. **RUN** Query en Supabase: verificar que `investments` tabla existe y RLS está habilitado

---

## 🐛 BLOCKER 4: UX MÓVIL ABRUMADORA

### Síntoma

- Dashboard no responsivo en iPhone
- Menú de navegación lateral ocupa demasiado espacio
- Nombres largos en botones de menú
- Widgets del dashboard apilados ineficientemente
- Texto pequeño, touch targets < 44px

### Impacto

- **Severidad:** MEDIA (funciona pero no es usable en móvil)
- Afecta: experiencia general, adopción de usuarios iPhone

### Requisitos de cambio

```
MENÚ NAVEGACIÓN:
├─ Cambiar de nombres largos a iconos solo (con tooltips en hover/long-press)
├─ Estructura:
│  ├─ Dashboard (casa)
│  ├─ Transacciones (billete)
│  ├─ Compromisos (calendario)
│  ├─ Inversiones (gráfico)
│  ├─ Reportes (documento)
│  └─ Configuración (engranaje)
├─ Ancho máximo: 60px en mobile
└─ Touch targets: 44×44px mínimo

DASHBOARD:
├─ Grid responsivo: 1 col (mobile) → 2 cols (tablet) → 3 cols (desktop)
├─ Hero card: siempre full width
├─ Widgets reordenables sin editar
├─ Ocultar si espacio < 320px wide
└─ Safe area insets (notch iPhone)

FORMULARIOS:
├─ Full width en mobile
├─ Input font-size ≥ 16px (previene zoom auto-trigger en iOS)
├─ inputMode correcto (decimal para importes)
└─ Labels siempre visibles
```

### Plan de acción

1. **READ** `app/(app)/layout.tsx` — layout principal con sidebar
2. **READ** `components/layout/Sidebar.tsx` — menú navegación
3. **EDIT** Sidebar para mostrar solo iconos en mobile (hidden text, visible icons)
4. **READ** `app/(app)/dashboard/page.tsx`
5. **REFACTOR** dashboard grid: Tailwind grid-cols-1 md:grid-cols-2 lg:grid-cols-3
6. **ADD** safe area insets: `env(safe-area-inset-*)`
7. **VERIFY** shadcn/ui button size (touch targets 44px)
8. **TEST** en Safari iPhone simulado (Playwright o real device)

---

## 🐛 BLOCKER 5: CAMPOS DE FORMULARIO NO ADAPTATIVOS + NOMBRES TÉCNICOS

### Síntoma

- Usuario crea nuevo "Compromiso" (nombre poco claro)
- Selecciona tipo: "Hipoteca", "Alquiler", "Suscripción", etc.
- Formulario muestra TODOS los campos posibles, siempre
- No hay validación según tipo
- Campos no relevantes confunden al usuario
- Nombre "Compromisos" no es claro (¿Qué son compromisos?)

### Impacto

- **Severidad:** MEDIA-ALTA
- Afecta: M4 (flujo de usuario)
- UX confusa

### Requisitos de cambio

```
RENOMBRADO:
  "Compromisos" → "Pagos recurrentes" o "Suscripciones y gastos fijos"

FORM ADAPTATIVO por tipo:

HIPOTECA:
├─ Obligatorio: Nombre, Importe, Inicio, Fin, Cuenta
├─ Opcional: Notas, Descripción
├─ Oculto: tolerance_days, service_name, cancelled_at
└─ Campo especial: "Año vencimiento hipoteca", "Tipo: Fijo/Variable"

ALQUILER PAGADO:
├─ Obligatorio: Nombre, Importe, Inicio, Fin, Cuenta
├─ Campo especial: "Día del mes" (p.ej. 1, 5, etc.)
└─ Oculto: tolerance_days, service_name

ALQUILER COBRADO (Income):
├─ Obligatorio: Nombre, Importe, Inicio, Fin
├─ Campo especial: tolerance_days (default 3) — para alertar si no llega
├─ Visible: "Días tolerancia para alertar impago"
└─ Oculto: cancelled_at

SUSCRIPCIÓN:
├─ Obligatorio: Nombre, Importe, Inicio, Cuenta, Nombre del servicio
├─ Opcional: Fin (si activa)
├─ Campo especial: service_name (aparece en extracto: "NETFLIX", "SPOTIFY")
├─ Visible: "Cancelada en" (fecha) — para detectar cobros inesperados
├─ Oculto: tolerance_days

OTRO/PERSONALIZADO:
└─ Todos los campos visibles, pero con secciones colapsables

VALIDACIÓN:
├─ Si tipo = Income: no pedir account_id
├─ Si fin_date < start_date: error
├─ Si frequency = custom: pedir custom_days
└─ No permitir importe <= 0
```

### Plan de acción

1. **READ** `app/(app)/compromisos/new/page.tsx`
2. **READ** `components/compromisos/CommitmentForm.tsx`
3. **RENAME** página (considera cambiar ruta si necesario)
4. **IMPLEMENT** formulario con `useState(selectedType)`
5. **CONDITIONALLY RENDER** campos según tipo (if tipo === 'mortgage' then show X, Y, Z)
6. **ADD** validación en schema Zod con `.refine()` condicionales
7. **UPDATE** i18n (messages/es.json) con nuevos nombres
8. **TEST** cada tipo de formulario

---

## 📊 MATRIZ DE IMPACTO POR BLOCKER

| Blocker                    | DB  | API | UI  | State | Security | i18n | Tests |
| -------------------------- | --- | --- | --- | ----- | -------- | ---- | ----- |
| 1. Crear cuentas           | ✅  | ❌  | ❌  | ❌    | ❌       | ✅   | ❌    |
| 2. Importación Excel       | ✅  | ❌  | ❌  | ❌    | ⚠️       | ❌   | ❌    |
| 3. Inversiones Request err | ✅  | ❌  | ❌  | ❌    | ❌       | ❌   | ❌    |
| 4. UX móvil                | —   | —   | ✅  | —     | —        | ✅   | ❌    |
| 5. Formularios adaptativos | —   | ⚠️  | ✅  | ✅    | ⚠️       | ✅   | ❌    |

---

## ✅ CHECKLIST DE EJECUCIÓN

Para cada blocker que resuelvas, marca:

- [ ] **DB:** Migraciones, RLS, índices verificados en Supabase
- [ ] **API:** Endpoints existen, validación Zod `.strict()`, JWT auth, error handling
- [ ] **UI:** Componente creado/actualizado, responsive (mobile first), accesibilidad (WCAG 2.2 AA)
- [ ] **State:** Hooks (useQuery/useMutation de TanStack Query), Zustand si estado global
- [ ] **Security:** OWASP checklist (XSS, CSRF, IDOR, injection), DOMPurify si user input
- [ ] **i18n:** Strings en messages/es.json y messages/en.json, sin hardcoding
- [ ] **Tests:** Unit test (Vitest) + E2E scenario (Playwright iPhone)
- [ ] **Types:** `npx supabase gen types typescript > types/database.ts` si schema cambió
- [ ] **Build:** `npm run build` ✅ · `npm run type-check` ✅ · CI green ✅

---

## 🛠️ HERRAMIENTAS Y ACCESO

### Supabase Console

- **URL:** https://app.supabase.com/project/febokmcgjatrfdfuaeyk
- **Acceso:** via GitHub SSO
- **Permitido:** SELECT queries, revisar RLS, ver logs, crear test data
- **Prohibido:** Modificar schema directamente (siempre via migrations)

### Vercel Dashboard

- **URL:** https://vercel.com/carlosgosalbez/patrimio
- **Acceso:** GitHub SSO
- **Permitido:** Ver logs, edge function logs, redeployed, env vars
- **Prohibido:** No editar env vars (solo read-only)

### Sentry

- **URL:** https://sentry.io/patrimio (o similar)
- **Acceso:** Configured en Vercel
- **Permitido:** Ver errores, filtrar por usuario, ver stack traces, performance

### Local Development

```bash
# Instalar dependencias
npm install

# Correr dev server con hot reload
npm run dev

# Type checking
npm run type-check

# Unit tests
npm run test

# E2E tests (iPhone simulado)
npm run test:e2e -- --project=webkit

# Build producción
npm run build

# Supabase local (si quieres local dev)
npx supabase start
npx supabase link --project-ref febokmcgjatrfdfuaeyk
npx supabase db push
```

---

## 📝 NOTAS CRÍTICAS DE IMPLEMENTACIÓN

### Logo no se carga correctamente

- Verificar ruta en `public/` o storage de Supabase
- Si es desde Storage: usar `signed URL` o hacer público el bucket
- Si es `/public/logo.png`: revisar que exista exactamente
- Investigar en Network tab del navegador

### Código limpio y profesional

- **Nunca hardcodear:** URLs, keys, secretos, nombres de usuario
- Usar variables de entorno en Vercel `.env.local` (ya configuradas)
- Importar desde `process.env.NEXT_PUBLIC_*` o server-side `process.env.*`
- Ver `.env.example` para referencia (si existe)

### Security first

- Validación siempre con Zod `.strict()` en API routes
- `user_id` siempre del JWT (`auth.uid()`), nunca del body
- RLS obligatorio en toda tabla nueva
- Soft deletes con `deleted_at`, nunca DELETE físico
- DOMPurify si renderizar HTML (ej. notas de usuario)

### i18n (next-intl)

- Todas las strings UI → `messages/es.json` y `messages/en.json`
- Componentes usan `useTranslations()` del hook
- Nunca texto hardcodeado en componentes React
- Plurales, variables interpoladas via i18n

### Testing

- Unit tests: `tests/unit/` — Vitest + React Testing Library
- E2E tests: `tests/e2e/` — Playwright (webkit para Safari iOS)
- Mínimo: 1 unit test + 1 E2E por feature
- Mocks de APIs externas (Anthropic, market data) siempre

### Performance

- LCP < 2.5s (Web Vitals)
- Lazy load componentes pesados (Charts, large lists)
- TanStack Query con staleTime estratégico
- Service Worker caché estratégico (Cache-First para static, Network-First para data)

---

## 📄 REFERENCIAS DENTRO DEL PROYECTO

- **Spec técnica:** `/mnt/project/patrimio-technical-spec.md` (secciones 7.2, 7.3, 7.4, 7.5, 7.6)
- **Agente orquestador:** `.claude/agents/project-orchestrator.md`
- **Instrucciones Copilot:** `.github/copilot-instructions.md` (anti-patterns, security)
- **Settings:** `.claude/settings.json` (permisos, hooks)
