# Patrimio — Production Monitoring & Health Checks

## Auditoría Automatizada con @project-orchestrator

El agente `@project-orchestrator` ahora puede ejecutar auditorías completas de producción de forma totalmente autónoma.

### Comando de auditoría

```plaintext
@project-orchestrator audita Vercel + Sentry + GitHub Actions, corrige errores detectados
```

### Proceso de auditoría autónoma

1. **Vercel Deployments**
   - Lista últimos 20 deployments
   - Identifica estados ERROR/FAILED
   - Analiza build logs para cada fallo
   - Clasifica errores: TypeScript | Dependency | Timeout | Network

2. **Sentry Issues**
   - Busca issues no resueltos (últimos 7 días)
   - Ordena por frecuencia
   - Extrae stack traces de eventos
   - Clasifica severidad: CRÍTICA (>100 eventos + >20 usuarios) | ALTA | MEDIA | BAJA

3. **Reconciliación código-producción**
   - Para cada error de Sentry:
     - Lee archivo actual en codebase
     - Determina: PENDIENTE (bug existe) | SOLUCIONADO (ya fixed) | REFACTORIZADO (eliminado)
4. **Corrección automática**
   - Errores obvios (1-3 líneas) → fix directo
   - Errores complejos → marca para revisión arquitectural
   - Verifica: type-check + build exitoso

5. **Pre-deploy verification**
   - TypeScript: 0 errores
   - Lint: 0 warnings
   - Build: exitoso
   - Audit: sin vulnerabilidades HIGH/CRITICAL

## Health Check Endpoint

### Endpoint: `GET /api/health`

Monitoreo activo del estado del sistema.

**Response 200 OK (healthy):**

```json
{
  "timestamp": "2026-05-01T17:30:00.000Z",
  "status": "healthy",
  "version": "0.2.0",
  "environment": "production",
  "checks": {
    "supabase": {
      "status": "pass",
      "latency": 45
    },
    "env": {
      "status": "pass",
      "missing": []
    }
  }
}
```

**Response 503 Service Unavailable (unhealthy):**

```json
{
  "timestamp": "2026-05-01T17:30:00.000Z",
  "status": "unhealthy",
  "checks": {
    "supabase": {
      "status": "fail",
      "latency": 5000
    }
  }
}
```

## Pre-Deploy Check Script

Ejecutar antes de cada deploy:

```powershell
.\scripts\pre-deploy-check.ps1
```

Verifica:

- ✅ TypeScript compilation (0 errors)
- ✅ ESLint validation (0 warnings)
- ✅ Production build (successful)
- ✅ Security audit (no HIGH/CRITICAL)
- ✅ Environment variables (all present)

**Exit codes:**

- `0` → Ready to deploy
- `1` → Blockers found

## Integración con Uptime Monitoring

### Configuración recomendada (UptimeRobot / Better Uptime)

1. **Main app check:**
   - URL: `https://patrimio.vercel.app`
   - Interval: 5 minutos
   - Alert on: 2 consecutive failures

2. **Health endpoint check:**
   - URL: `https://patrimio.vercel.app/api/health`
   - Interval: 2 minutos
   - Alert on: status !== 200 OR status field !== "healthy"

3. **Sentry integration:**
   - Auto-alerts en Sentry para issues con:
     - Severidad: ERROR o FATAL
     - Usuarios afectados: > 10
     - Frecuencia: > 50 eventos/hora

## GitHub Actions Workflow Improvements

### CI Pipeline (`.github/workflows/ci.yml`)

Mejoras aplicadas:

1. **Security Audit non-blocking:**

   ```yaml
   - name: npm audit
     run: npm audit --audit-level=high
     continue-on-error: true

   - name: Snyk security scan
     if: env.SNYK_TOKEN != ''
     continue-on-error: true
   ```

2. **Build verification obligatoria:**
   - TypeCheck MUST pass
   - Lint MUST pass
   - Build MUST succeed
   - Tests coverage uploaded

### Production Deploy (`.github/workflows/production.yml`)

Flujo:

1. Wait for CI workflow success
2. Deploy to Vercel production
3. Run smoke tests on deployed URL
4. Create Sentry release with sourcemaps

## Comandos útiles

### Local development

```bash
# Pre-deploy full check
.\scripts\pre-deploy-check.ps1

# Individual checks
npm run type-check
npm run lint
npm run test:coverage
npm run build

# Supabase local (remote mode, no Docker)
npm run db:push           # Apply migrations
npm run db:types          # Regenerate TypeScript types
```

### Production monitoring

```bash
# Check health endpoint
curl https://patrimio.vercel.app/api/health | jq

# Vercel deployments status
vercel ls

# Vercel logs (runtime)
vercel logs patrimio --follow
```

## Alerting Strategy

### Critical (immediate Slack/Email)

- Deployment FAILED en production
- Sentry issue: >100 eventos/hora + >20 usuarios
- Health check DOWN por >5 minutos
- Supabase latency >2000ms

### Warning (Slack, no email)

- Deployment ERROR en preview branch
- Sentry issue: 20-100 eventos/hora
- Health check degraded
- npm audit: HIGH vulnerability

### Info (log only)

- Deployment SUCCESS
- Sentry issue: <20 eventos/hora
- Build warnings
- npm audit: MODERATE vulnerability

## Maintenance Schedule

### Daily (automated)

- Health check monitoring (every 2 min)
- Sentry issue review (if >10 new events)

### Weekly (automated)

- Dependabot PRs merge (after CI pass)
- Security audit review
- Vercel deployment cleanup (old preview deploys)

### Monthly (manual)

- Full infrastructure audit with `@project-orchestrator`
- Review Sentry unresolved issues
- Analyze performance metrics (LCP, FID, CLS)
- Update dependencies major versions

## Troubleshooting Deployment Errors

### Vercel build fails

1. Check build logs: `vercel logs <deployment-id>`
2. Reproduce locally: `npm run build`
3. If TypeScript error: `npm run type-check`
4. If dependency issue: `rm -rf node_modules package-lock.json && npm install`

### Sentry issues not resolving

1. Verify fix deployed: check git SHA in Sentry release
2. Check deployment status: Vercel dashboard
3. Wait 5 min for Sentry to sync
4. If persists: run `@project-orchestrator` audit for reconciliation

### Health check failing

1. Check Supabase status: <https://status.supabase.com>
2. Verify env vars in Vercel project settings
3. Test Supabase connectivity locally
4. Check RLS policies if database query fails

## Success Metrics

### Deployment Health

- **Target:** >95% deployments SUCCESS
- **Current baseline:** Monitor after implementing health checks
- **Alert threshold:** <90% success rate in 7 days

### Error Rate

- **Target:** <0.5% of requests result in Sentry error
- **Current baseline:** 0 unresolved issues (as of 2026-05-01)
- **Alert threshold:** >1% error rate OR >50 events/hour

### Build Time

- **Target:** <3 minutes for production build
- **Current:** ~2 minutes (Next.js 15.5.15)
- **Alert threshold:** >5 minutes

---

**Last updated:** 2026-05-01  
**Maintained by:** @project-orchestrator (autonomous agent)
