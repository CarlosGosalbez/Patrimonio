# Vercel Plugin - Integración con Vercel CLI

## Descripción

Plugin para integración con Vercel CLI en comandos de deployment.

## Comandos Disponibles

### Deploy

```bash
@patrimonio-orchestrator /deploy production
```

**Ejecuta:**

1. Pre-checks (tests, build)
2. `vercel --prod`
3. Post-deploy validations
4. Sentry release tracking

### Preview

```bash
@patrimonio-orchestrator /deploy preview
```

**Ejecuta:**

1. Pre-checks
2. `vercel`
3. Return preview URL

### Rollback

```bash
@patrimonio-orchestrator /deploy rollback [deployment-url]
```

**Ejecuta:**

1. `vercel rollback [deployment-url]`
2. Verify rollback
3. Notify team

## Environment Management

### List

```bash
@patrimonio-orchestrator /vercel env list
```

### Pull

```bash
@patrimonio-orchestrator /vercel env pull .env.local
```

### Push

```bash
@patrimonio-orchestrator /vercel env push VARIABLE_NAME
```

## Configuration

```json
{
  "plugin": "vercel",
  "version": "1.0",
  "commands": {
    "deploy": {
      "preChecks": ["test:unit", "build"],
      "postChecks": ["smoke-tests"],
      "notifications": true
    }
  },
  "environments": {
    "production": {
      "branch": "main",
      "domain": "patrimonio.vercel.app"
    },
    "preview": {
      "branches": ["feature/*", "fix/*"]
    }
  }
}
```

## Requirements

- Vercel CLI installed (`npm i -g vercel`)
- Authenticated (`vercel login`)
- Project linked (`vercel link`)

## Usage in Code

```typescript
// .claude/plugins/vercel/hooks.ts
export const preDeployHook = async () => {
  // Run tests
  await runTests();

  // Build
  await runBuild();

  // Type check
  await runTypeCheck();
};

export const postDeployHook = async (deploymentUrl: string) => {
  // Smoke tests
  await runSmokeTests(deploymentUrl);

  // Sentry release
  await createSentryRelease();

  // Notify
  await notifyTeam(deploymentUrl);
};
```

---

**Status:** Active  
**Maintainer:** @patrimonio-orchestrator  
**Version:** 1.0
