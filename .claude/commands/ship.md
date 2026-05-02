# 🚀 Command: /ship

Build + Lint + Test + Deploy todo en uno

## Uso

```bash
/ship [environment]
```

## Argumentos

- `development` - Deploy a entorno de desarrollo
- `staging` - Deploy a entorno de staging/preview
- `production` - Deploy a producción (requiere confirmación)

## Descripción

Ejecuta el pipeline completo de CI/CD en orden:

1. **Type Check** - Verificación de tipos TypeScript
2. **Lint** - ESLint con auto-fix
3. **Unit Tests** - Vitest con coverage >80%
4. **E2E Tests** - Playwright en headless mode
5. **Build** - Next.js production build
6. **Deploy** - Vercel deployment con Sentry tracking

## Flujo de Ejecución

```
┌─────────────────┐
│  Type Check     │
│  (tsc --noEmit) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lint + Fix     │
│  (eslint --fix) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Unit Tests     │
│  (vitest run)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  E2E Tests      │
│  (playwright)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build          │
│  (next build)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deploy         │
│  (vercel)       │
└─────────────────┘
```

## Comandos Ejecutados

### 1. Type Check

```bash
npm run type-check
# Ejecuta: tsc --noEmit --project tsconfig.json
```

**Valida:**

- Strict mode compliance
- No errores de tipos
- Imports correctos
- Path aliases válidos

### 2. Lint + Fix

```bash
npm run lint -- --fix
# Ejecuta: next lint --fix
```

**Verifica:**

- ESLint rules
- Prettier formatting
- React hooks rules
- TypeScript best practices
- Accesibilidad (jsx-a11y)

### 3. Unit Tests

```bash
npm run test:unit -- --coverage
# Ejecuta: vitest run --coverage
```

**Requisitos:**

- Coverage >80% líneas
- Coverage >75% branches
- Todos los tests pasan
- No tests skipped

### 4. E2E Tests

```bash
npm run test:e2e
# Ejecuta: playwright test
```

**Valida:**

- Flujos críticos (login, transacciones, portfolio)
- Cross-browser (Chromium, Firefox, WebKit)
- Mobile viewport
- Accesibilidad automated checks

### 5. Build

```bash
npm run build
# Ejecuta: next build
```

**Verifica:**

- No build errors
- Bundle size <500KB gzipped
- Lighthouse >90
- No duplicados en bundle

### 6. Deploy

```bash
npm run deploy:${environment}
# Ejecuta: vercel --prod (o --preview)
```

**Acciones:**

1. Crea Sentry release
2. Upload sourcemaps a Sentry
3. Deploy a Vercel
4. Smoke tests en URL deployada
5. Envía notificación

## Outputs

### Exitoso ✅

```
✅ Type check passed
✅ Lint passed (auto-fixed 3 issues)
✅ Unit tests passed (coverage: 85%)
✅ E2E tests passed (12/12)
✅ Build completed (bundle: 450KB)
✅ Deployed to production

URL: https://patrimonio.vercel.app
Sentry Release: v1.2.3
Lighthouse: 95/100
```

### Con Errores ❌

```
❌ Type check failed: 3 errors
  - src/features/transactions/types.ts:15
  - src/shared/utils/format.ts:42

Pipeline stopped. Fix errors and run /ship again.
```

## Configuración en package.json

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "next lint",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "build": "next build",
    "deploy:development": "vercel --target development",
    "deploy:staging": "vercel --target preview",
    "deploy:production": "vercel --prod",
    "ship:dev": "npm run type-check && npm run lint -- --fix && npm run test:unit && npm run build && npm run deploy:development",
    "ship:staging": "npm run type-check && npm run lint -- --fix && npm run test:unit && npm run test:e2e && npm run build && npm run deploy:staging",
    "ship:prod": "npm run type-check && npm run lint -- --fix && npm run test:unit && npm run test:e2e && npm run build && npm run deploy:production"
  }
}
```

## Seguridad

### Producción

- ❗ Requiere confirmación manual
- ❗ Ejecuta TODOS los tests (unit + E2E)
- ❗ Verifica variables de entorno
- ❗ Crea backup automático

### Staging

- ⚠️ Ejecuta tests unit + E2E
- ⚠️ Deploy a preview URL
- ⚠️ No afecta producción

### Development

- ℹ️ Solo tests unitarios
- ℹ️ Deploy rápido
- ℹ️ Sin confirmación

## Casos de Uso

### Deploy Rápido a Dev

```bash
@patrimonio-orchestrator /ship development
```

### Deploy a Staging (Feature Branch)

```bash
@patrimonio-orchestrator /ship staging
```

### Deploy a Producción (Release)

```bash
@patrimonio-orchestrator /ship production
# Requiere confirmación:
# "Deploy to PRODUCTION? Type 'yes' to confirm:"
```

## Rollback

Si el deploy falla o hay problemas:

```bash
# Vercel rollback automático
vercel rollback patrimonio --yes

# O desde Vercel Dashboard:
# https://vercel.com/proyecto-patrimonio/deployments
```

## Monitoreo Post-Deploy

Automáticamente se activa:

1. **Sentry Release Tracking**
   - Trackea errores de esta release
   - Compara con release anterior
   - Alertas si error rate >5%

2. **Vercel Analytics**
   - Performance metrics
   - Real User Monitoring
   - Core Web Vitals

3. **Lighthouse CI**
   - Score automático post-deploy
   - Regression detection

## Troubleshooting

### "Build failed: Out of memory"

```bash
# Incrementar memoria de Node
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

### "E2E tests timeout"

```bash
# Aumentar timeout en playwright.config.ts
timeout: 60000 // 60 segundos
```

### "Vercel deployment failed"

```bash
# Verificar logs
vercel logs patrimonio --follow

# Re-deploy forzado
vercel --force
```

## Integración con Sentry

```typescript
// sentry.config.ts
export const sentryConfig = {
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.VERCEL_ENV,
  dist: process.env.VERCEL_GIT_COMMIT_REF,
};

// Sentry release creado automáticamente en deploy
```

## Checklist Pre-Deploy Producción

Antes de ejecutar `/ship production`, verificar:

- [ ] Branch: `main` o `release/*`
- [ ] Tests locales pasan 100%
- [ ] No hay `console.log` en código
- [ ] Variables de entorno configuradas en Vercel
- [ ] Sentry DSN configurado
- [ ] Database migrations aplicadas
- [ ] Changelog actualizado
- [ ] Versión bumpeada en package.json

---

**Versión:** 1.0  
**Actualizado:** 2026-05-02  
**Maintainer:** @patrimonio-orchestrator
