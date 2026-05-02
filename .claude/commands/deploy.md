# 📤 Command: /deploy

Deploy a Vercel con Sentry release tracking

## Uso

```bash
/deploy [environment]
```

## Argumentos

- `development` - Deploy a development environment
- `preview` - Deploy a preview/staging environment (default para feature branches)
- `production` - Deploy a producción (solo desde main/release branches)

## Descripción

Ejecuta deployment completo a Vercel con tracking automático en Sentry, smoke tests y notificaciones.

## Flujo de Ejecución

1. Pre-deploy validations
2. Create Sentry release
3. Upload sourcemaps
4. Deploy to Vercel
5. Wait for deployment
6. Smoke tests
7. Finalize Sentry release
8. Send notification

## Paso 1: Pre-Deploy Validations

### Branch Protection (Producción)

```bash
# Solo permitido desde:
- main
- release/*

# Bloqueado:
- feature/*
- fix/*
- hotfix/* (requiere override manual)
```

### Environment Variables Check

```bash
# Verificar que existen:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SENTRY_DSN
SENTRY_AUTH_TOKEN

# Error si falta alguna
```

### Git Status

```bash
# Verificar:
- No uncommitted changes
- Branch up-to-date with origin
- Tag existe (para production)
```

## Paso 2: Create Sentry Release

```bash
# Generar release ID basado en commit
RELEASE_ID=$(git rev-parse --short HEAD)
RELEASE_VERSION="v$(cat package.json | jq -r .version)-${RELEASE_ID}"

# Crear release en Sentry
sentry-cli releases new $RELEASE_VERSION \
  --org patrimonio \
  --project patrimonio-web

# Asociar commits
sentry-cli releases set-commits $RELEASE_VERSION --auto
```

### Release Metadata

```json
{
  "version": "v1.2.3-abc1234",
  "commits": [
    {
      "id": "abc1234",
      "message": "Add transaction filters",
      "author": "Developer Name"
    }
  ],
  "dateCreated": "2026-05-02T10:00:00Z",
  "projects": ["patrimonio-web"],
  "ref": "main"
}
```

## Paso 3: Upload Sourcemaps

```bash
# Build con sourcemaps
SENTRY_RELEASE=$RELEASE_VERSION npm run build

# Upload sourcemaps a Sentry
sentry-cli sourcemaps upload \
  --org patrimonio \
  --project patrimonio-web \
  --release $RELEASE_VERSION \
  .next/
```

**Tamaño típico:** 10-20 MB comprimido

## Paso 4: Deploy to Vercel

### Development

```bash
vercel deploy \
  --target development \
  --env SENTRY_RELEASE=$RELEASE_VERSION
```

### Preview (Staging)

```bash
vercel deploy \
  --env SENTRY_RELEASE=$RELEASE_VERSION
```

### Production

```bash
vercel deploy --prod \
  --env SENTRY_RELEASE=$RELEASE_VERSION
```

### Build Configuration

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "nodeVersion": "20.x",
  "regions": ["iad1"],
  "functions": {
    "app/api/**": {
      "maxDuration": 10
    }
  }
}
```

## Paso 5: Wait for Deployment

```bash
# Esperar hasta que deployment esté ready
vercel inspect $DEPLOYMENT_URL --wait

# Timeout: 5 minutos
```

### Estados Posibles

- `QUEUED` - En cola
- `BUILDING` - Compilando
- `DEPLOYING` - Desplegando
- `READY` - ✅ Exitoso
- `ERROR` - ❌ Falló
- `CANCELED` - Cancelado

## Paso 6: Smoke Tests

Ejecuta tests automáticos en la URL deployada:

### Health Check

```bash
curl -f $DEPLOYMENT_URL/api/health
# Expected: 200 OK
```

### Authentication Flow

```bash
# Test login endpoint
curl -X POST $DEPLOYMENT_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Expected: 200 OK con token
```

### Database Connection

```bash
curl -f $DEPLOYMENT_URL/api/status
# Expected: { "database": "connected", "status": "ok" }
```

### Sentry Integration

```bash
# Trigger test error
curl $DEPLOYMENT_URL/api/sentry-test

# Verificar en Sentry que se capturó
```

### Lighthouse CI (Solo Production)

```bash
lhci autorun --collect.url=$DEPLOYMENT_URL
```

**Thresholds:**

- Performance: >90
- Accessibility: >95
- Best Practices: >90
- SEO: >90

## Paso 7: Finalize Sentry Release

```bash
# Marcar release como deployed
sentry-cli releases finalize $RELEASE_VERSION \
  --org patrimonio \
  --project patrimonio-web

# Asociar deploy al environment
sentry-cli releases deploys $RELEASE_VERSION new \
  --env $ENVIRONMENT \
  --url $DEPLOYMENT_URL
```

## Paso 8: Send Notification

### Slack (si configurado)

```json
{
  "text": "🚀 Deploy Exitoso",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Patrimonio* deployed to *production*"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Version:*\nv1.2.3-abc1234"
        },
        {
          "type": "mrkdwn",
          "text": "*URL:*\nhttps://patrimonio.vercel.app"
        },
        {
          "type": "mrkdwn",
          "text": "*Lighthouse:*\n95/100"
        },
        {
          "type": "mrkdwn",
          "text": "*Sentry:*\n[View Release](https://sentry.io/releases/v1.2.3)"
        }
      ]
    }
  ]
}
```

### Email (opcional)

```
Subject: Deploy Exitoso - Patrimonio v1.2.3

Version: v1.2.3-abc1234
Environment: production
URL: https://patrimonio.vercel.app
Deployed at: 2026-05-02 10:30:00 UTC
Build time: 2m 15s
Lighthouse: 95/100

Changes:
- Add transaction filters
- Fix portfolio calculation bug
- Improve mobile responsiveness

View deployment: https://vercel.com/patrimonio/deployments/abc1234
View Sentry release: https://sentry.io/releases/v1.2.3
```

## Output Exitoso

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 DEPLOY EXITOSO

Environment:   production
URL:           https://patrimonio.vercel.app
Version:       v1.2.3-abc1234
Branch:        main
Commit:        abc1234 (Add transaction filters)
Build Time:    2m 15s
Bundle Size:   450 KB gzipped

✓ Sentry Release:   Created & finalized
✓ Sourcemaps:       Uploaded (15 MB)
✓ Health Check:     PASSED
✓ Auth Flow:        PASSED
✓ Database:         PASSED
✓ Lighthouse:       95/100

Sentry: https://sentry.io/releases/v1.2.3-abc1234
Vercel: https://vercel.com/patrimonio/deployments/abc1234

Next steps:
- Monitor Sentry for errors
- Check Vercel Analytics
- Notify stakeholders
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Rollback Automático

Si smoke tests fallan:

```bash
# Rollback automático a deployment anterior
vercel rollback patrimonio --yes

# Notificar en Sentry
sentry-cli releases delete $RELEASE_VERSION

# Slack notification
"❌ Deploy failed - Rolled back to previous version"
```

## Configuración en package.json

```json
{
  "scripts": {
    "deploy:dev": "vercel --target development",
    "deploy:preview": "vercel",
    "deploy:prod": "vercel --prod",
    "deploy:with-sentry": "npm run build && sentry-cli releases files upload && vercel --prod"
  }
}
```

## Environment-Specific Settings

### Development

- **URL Pattern:** `patrimonio-dev-*.vercel.app`
- **Database:** Supabase development
- **Sentry:** Filtros relaxed
- **Analytics:** Deshabilitado
- **Cache:** Deshabilitado

### Preview (Staging)

- **URL Pattern:** `patrimonio-git-*-team.vercel.app`
- **Database:** Supabase staging
- **Sentry:** Errores tracked
- **Analytics:** Habilitado
- **Cache:** Habilitado (short TTL)

### Production

- **URL:** `patrimonio.vercel.app`
- **Database:** Supabase production
- **Sentry:** Full tracking + Session Replay
- **Analytics:** Completo + RUM
- **Cache:** Optimizado (long TTL)

## Vercel Build Configuration

```javascript
// vercel.json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SENTRY_RELEASE": "@sentry-release"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## Monitoreo Post-Deploy

### Primeros 5 minutos

- Errores en Sentry
- Métricas de performance
- User sessions activas

### Primera hora

- Error rate vs baseline
- Performance regression
- Crashfree sessions

### Primeras 24 horas

- Full analytics
- User feedback
- Error trends

## Troubleshooting

### "Build failed: Module not found"

```bash
# Limpiar cache de Vercel
vercel --force

# O limpiar en dashboard
```

### "Smoke tests failed"

```bash
# Ver logs detallados
vercel logs patrimonio --follow

# Debug local
npm run build && npm start
```

### "Sentry sourcemaps not uploading"

```bash
# Verificar auth token
sentry-cli info

# Re-upload manual
sentry-cli releases files $RELEASE_VERSION upload-sourcemaps .next/
```

## Checklist Pre-Deploy Production

- [ ] Tests pasan localmente (unit + E2E)
- [ ] Branch: `main` o `release/*`
- [ ] No uncommitted changes
- [ ] Versión bumpeada en package.json
- [ ] CHANGELOG.md actualizado
- [ ] Database migrations aplicadas en producción
- [ ] Variables de entorno verificadas en Vercel
- [ ] Stakeholders notificados
- [ ] Rollback plan definido

---

**Versión:** 1.0  
**Actualizado:** 2026-05-02  
**Tiempo estimado:** 5-7 minutos  
**Maintainer:** @patrimonio-orchestrator
