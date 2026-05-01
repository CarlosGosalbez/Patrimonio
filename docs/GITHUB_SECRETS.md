# GitHub Actions — Variables y Secretos

**Última actualización:** 2026-05-01

Este documento lista todas las variables de entorno y secretos requeridos para los workflows de GitHub Actions en el proyecto Patrimio.

## 📍 Dónde configurarlos

**GitHub Repository Settings:**

- Variables: `Settings → Secrets and variables → Actions → Variables`
- Secrets: `Settings → Secrets and variables → Actions → Secrets → New repository secret`

---

## ✅ Variables (Repository Variables)

Variables públicas que se pueden ver en los logs de GitHub Actions. Usar `vars.VARIABLE_NAME` en workflows.

| Variable                        | Valor de ejemplo                              | Dónde obtenerlo                                                        | Usado en             |
| ------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- | -------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://febokmcgjatrfdfuaeyk.supabase.co`    | Supabase → Project Settings → API → Project URL                        | CI, Production, Test |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...`             | Supabase → Project Settings → API → Project API keys → `anon` `public` | CI, Production, Test |
| `NEXT_PUBLIC_APP_URL`           | `https://patrimio.vercel.app`                 | Tu dominio de producción en Vercel                                     | CI, Production, Test |
| `NEXT_PUBLIC_SENTRY_DSN`        | `https://abc123@o123.ingest.de.sentry.io/456` | Sentry → Project Settings → Client Keys (DSN)                          | CI, Production       |
| `SENTRY_ORG`                    | `patrimonioapp`                               | Sentry → Organization Settings → General → Organization Slug           | CI, Production, Test |
| `SENTRY_PROJECT`                | `patrimonio`                                  | Sentry → Project Settings → General → Project Slug                     | CI, Production, Test |

---

## 🔒 Secretos (Repository Secrets)

Valores sensibles que NUNCA aparecen en logs. Usar `secrets.SECRET_NAME` en workflows.

| Secreto               | Valor de ejemplo                   | Dónde obtenerlo                                                                                       | Usado en             |
| --------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------- |
| `SENTRY_AUTH_TOKEN`   | `sntrys_abc123...`                 | Sentry → Settings → Account → Auth Tokens → Create New Token (scopes: `project:releases`, `org:read`) | CI, Production, Test |
| `SNYK_TOKEN`          | `abc123-def456-...`                | Snyk.io → Account Settings → General → Auth Token                                                     | CI (opcional)        |
| `VERCEL_TOKEN`        | `abc123...`                        | Vercel → Account Settings → Tokens → Create Token                                                     | Production           |
| `VERCEL_ORG_ID`       | `team_62myD9SWeKOhO8HS6knKRSF0`    | Vercel → Team Settings → General → Team ID (o `vercel.json` → `orgId`)                                | Production           |
| `VERCEL_PROJECT_ID`   | `prj_GXLSFIS3WdjpkYsFFSdYcPG4jJ8N` | Vercel → Project Settings → General → Project ID (o `vercel.json` → `projectId`)                      | Production           |
| `SMOKE_TEST_EMAIL`    | `test@patrimio.app`                | Email de cuenta de prueba creada manualmente en producción                                            | Production           |
| `SMOKE_TEST_PASSWORD` | `SecureP@ss123!`                   | Contraseña de la cuenta de prueba                                                                     | Production           |

### ⚠️ Secretos NO usados en GitHub Actions

Estos secretos viven en **otros lugares**, NO en GitHub Actions:

| Secreto                     | Dónde configurarlo                                                                    | Por qué no en GitHub Actions                                       |
| --------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `SUPABASE_SERVICE_ROLE_KEY` | **Vercel** → Project Settings → Environment Variables (solo `Production` y `Preview`) | Solo se usa en runtime del servidor (API routes), nunca en build   |
| `ALPHA_VANTAGE_API_KEY`     | **Supabase** → Edge Functions → Secrets                                               | Solo usada por Edge Function `market-updater`, no por Next.js      |
| `FMP_API_KEY`               | **Supabase** → Edge Functions → Secrets                                               | Solo usada por Edge Function `market-updater`, no por Next.js      |
| `RESEND_API_KEY`            | **Vercel** → Project Settings → Environment Variables                                 | Solo se usa en runtime del servidor (envío de emails), no en build |
| `VAPID_PRIVATE_KEY`         | **Supabase** → Edge Functions → Secrets                                               | Push notifications desde Edge Function, no desde Next.js           |
| `CRON_SECRET`               | **Supabase** → Edge Functions → Secrets                                               | Autenticación del cron job de market-updater                       |

---

## 📋 Checklist de configuración

### Paso 1: Variables públicas (6 variables)

```bash
# Verifica que estén configuradas
gh variable list
```

Deberías ver:

- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ NEXT_PUBLIC_APP_URL
- ✅ NEXT_PUBLIC_SENTRY_DSN
- ✅ SENTRY_ORG
- ✅ SENTRY_PROJECT

### Paso 2: Secretos críticos (7 secretos)

```bash
# Verifica que estén configurados (solo muestra nombres, no valores)
gh secret list
```

Deberías ver:

- ✅ SENTRY_AUTH_TOKEN
- ✅ VERCEL_TOKEN
- ✅ VERCEL_ORG_ID
- ✅ VERCEL_PROJECT_ID
- ✅ SMOKE_TEST_EMAIL
- ✅ SMOKE_TEST_PASSWORD
- ⚠️ SNYK_TOKEN (opcional — workflow usa `if: env.SNYK_TOKEN != ''`)

### Paso 3: Secretos en Vercel

Vercel → Tu proyecto → Settings → Environment Variables:

| Variable                        | Production | Preview | Development |
| ------------------------------- | ---------- | ------- | ----------- |
| `SUPABASE_SERVICE_ROLE_KEY`     | ✅         | ✅      | ❌          |
| `RESEND_API_KEY`                | ✅         | ✅      | ❌          |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅         | ✅      | ✅          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅         | ✅      | ✅          |
| `NEXT_PUBLIC_APP_URL`           | ✅         | ✅      | ✅          |
| `NEXT_PUBLIC_SENTRY_DSN`        | ✅         | ✅      | ❌          |

### Paso 4: Secretos en Supabase Edge Functions

Supabase → Project → Edge Functions → Secrets:

```bash
# Establecer secretos con Supabase CLI
npx supabase secrets set ALPHA_VANTAGE_API_KEY="tu-key-aqui" --project-ref febokmcgjatrfdfuaeyk
npx supabase secrets set FMP_API_KEY="tu-key-aqui" --project-ref febokmcgjatrfdfuaeyk
npx supabase secrets set VAPID_PRIVATE_KEY="tu-key-aqui" --project-ref febokmcgjatrfdfuaeyk
npx supabase secrets set CRON_SECRET="tu-secret-aqui" --project-ref febokmcgjatrfdfuaeyk
```

---

## 🔍 Verificación rápida

### Comando para verificar variables en workflows

```bash
# Ver todas las referencias a secrets/vars en workflows
grep -r "secrets\.\|vars\." .github/workflows/
```

### Validar que un secret existe antes de usarlo en workflow

```yaml
# Ejemplo: Snyk scan solo si el token está configurado
- name: Snyk security scan
  if: env.SNYK_TOKEN != ''
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## ⚠️ Errores comunes

| Error                                                    | Causa                                             | Solución                                                            |
| -------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| `Context access might be invalid: VARIABLE_NAME`         | Lint warning de GitHub Actions (no es bloqueante) | Usar `if: env.VARIABLE_NAME != ''` antes de usar el secreto         |
| `Error: Input required and not supplied: token`          | Secret no configurado en GitHub                   | Añadir el secret en Settings → Secrets and variables → Actions      |
| Build falla con "NEXT_PUBLIC_SUPABASE_URL is undefined"  | Variable no configurada como `vars.` en workflow  | Añadir en `env:` del job con `${{ vars.NEXT_PUBLIC_SUPABASE_URL }}` |
| Runtime error "SUPABASE_SERVICE_ROLE_KEY is undefined"   | Secret no está en Vercel                          | Añadir en Vercel Project Settings → Environment Variables           |
| Edge Function error "ALPHA_VANTAGE_API_KEY is undefined" | Secret no está en Supabase                        | Usar `npx supabase secrets set` para configurarlo                   |

---

## 📚 Referencias

- [GitHub Actions: Variables](https://docs.github.com/en/actions/learn-github-actions/variables)
- [GitHub Actions: Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel: Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Supabase: Edge Function Secrets](https://supabase.com/docs/guides/functions/secrets)
