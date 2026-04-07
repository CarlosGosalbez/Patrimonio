## Descripción

<!-- Qué hace este PR y por qué es necesario -->

## Tipo de cambio

- [ ] Bug fix
- [ ] Nueva feature
- [ ] Migración de BD
- [ ] Mejora de rendimiento / seguridad
- [ ] Refactor
- [ ] Docs / config

## Módulo(s) afectado(s)

<!-- M0 Auth / M1 Dashboard / M2 Transacciones / M3 Import / M4 Compromisos / M5 Inversiones / M6 Presupuestos / M7 Informes / M8 Ajustes -->

## Checklist

### General

- [ ] `npm run type-check` pasa sin errores
- [ ] `npm run lint` pasa sin warnings
- [ ] `npm run test` pasa

### Base de datos (si aplica)

- [ ] Nueva migración en `supabase/migrations/` con formato `YYYYMMDDHHMMSS_nombre.sql`
- [ ] Todas las tablas nuevas tienen `ENABLE ROW LEVEL SECURITY` y `FORCE ROW LEVEL SECURITY`
- [ ] Políticas RLS usan `(select auth.uid())` — no `auth.uid()` directo
- [ ] `npm run db:types` ejecutado tras la migración

### API routes (si aplica)

- [ ] Autenticación via `supabase.auth.getUser()` antes de cualquier lógica
- [ ] Validación con Zod `.strict()` en el input
- [ ] `user_id` siempre del JWT, nunca del body

### UI (si aplica)

- [ ] Mobile-first, touch targets ≥ 44px
- [ ] Strings en `messages/es.json` + `messages/en.json` (no hardcodeadas)
- [ ] Importes monetarios via `lib/financial/formatters.ts`

### Seguridad (si aplica)

- [ ] Sin `service_role` key en código cliente
- [ ] Sin `dangerouslySetInnerHTML` sin DOMPurify
- [ ] `hasPromptInjection()` antes de enviar texto de usuario al LLM
