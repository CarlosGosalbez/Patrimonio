# ⚙️ Command: /setup

Setup inicial del proyecto (FASE 1)

## Uso

```bash
/setup
```

## Descripción

Configura el entorno de desarrollo completo desde cero, ejecutando todas las tareas necesarias para tener una primera ejecución exitosa del proyecto Patrimonio.

## Flujo de Ejecución

```
┌───────────────────┐
│ Verify System     │
│ Requirements      │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Install           │
│ Dependencies      │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Create Folder     │
│ Structure         │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Setup Supabase    │
│ Local             │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Setup Sentry      │
│ Project           │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Configure         │
│ Environment       │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Setup Vercel      │
│ CLI               │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Run First         │
│ Dev Server        │
└───────────────────┘
```

## Paso 1: Verificar System Requirements

### Node.js

```bash
node --version
# Requerido: v20.0.0 o superior
```

### npm

```bash
npm --version
# Requerido: v10.0.0 o superior
```

### Git

```bash
git --version
# Requerido: v2.40 o superior
```

### Docker (para Supabase local)

```bash
docker --version
# Requerido: v24.0 o superior
```

Si falta algún requisito, se mostrará instrucciones de instalación.

## Paso 2: Instalar Dependencies

```bash
npm install
```

### Dependencies Principales

#### Runtime

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "next": "^15.0.0",
  "typescript": "^5.5.4",
  "@supabase/supabase-js": "^2.48.0",
  "@tanstack/react-query": "^5.56.0",
  "zod": "^3.23.8",
  "@sentry/nextjs": "^8.33.0",
  "recharts": "^2.12.7",
  "@radix-ui/react-dialog": "^1.1.0",
  "@radix-ui/react-dropdown-menu": "^2.1.0",
  "tailwindcss": "^4.0.0"
}
```

#### DevDependencies

```json
{
  "vitest": "^2.1.0",
  "@playwright/test": "^1.40.0",
  "@testing-library/react": "^16.0.0",
  "eslint": "^9.12.0",
  "eslint-config-next": "^15.0.0",
  "prettier": "^3.3.3",
  "@types/react": "^18.3.0",
  "@types/node": "^20.16.0"
}
```

**Tiempo estimado:** 2-3 minutos

## Paso 3: Crear Estructura de Carpetas

```bash
mkdir -p src/app
mkdir -p src/features/{auth,transactions,portfolio,dashboard}
mkdir -p src/shared/{components,hooks,utils,types}
mkdir -p src/tests/{unit,integration,e2e}
mkdir -p supabase/{migrations,functions}
mkdir -p public/{images,icons}
```

### Estructura Resultante

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── auth/
│   ├── dashboard/
│   ├── transactions/
│   └── portfolio/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── transactions/
│   ├── portfolio/
│   └── dashboard/
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── hooks/
│   ├── utils/
│   └── types/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

## Paso 4: Setup Supabase Local

```bash
# Instalar Supabase CLI
npm install -g supabase

# Inicializar proyecto local
supabase init

# Iniciar servicios locales (PostgreSQL, Auth, Storage, Realtime)
supabase start
```

### Servicios Levantados

```
✓ API URL: http://localhost:54321
✓ GraphQL URL: http://localhost:54321/graphql/v1
✓ DB URL: postgresql://postgres:postgres@localhost:54322/postgres
✓ Studio URL: http://localhost:54323
✓ Inbucket URL: http://localhost:54324
✓ JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
✓ anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
✓ service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Crear Primera Migration

```sql
-- supabase/migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

Aplicar migration:

```bash
supabase db reset
```

## Paso 5: Setup Sentry Project

```bash
# Instalar Sentry wizard
npx @sentry/wizard@latest -i nextjs
```

### Configuración Interactiva

1. **Login to Sentry** - Usar token o browser auth
2. **Select Organization** - patrimonio
3. **Select/Create Project** - patrimonio-web
4. **Configure DSN** - Automático

### Archivos Creados

- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `.sentryclirc`

### Verificación

```typescript
// Test Sentry
import * as Sentry from "@sentry/nextjs";

Sentry.captureMessage("Setup test successful!");
```

## Paso 6: Configurar Environment Variables

```bash
# Crear .env.local
cp .env.example .env.local
```

### .env.local

```bash
# Supabase (local)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
SENTRY_ORG=patrimonio
SENTRY_PROJECT=patrimonio-web

# APIs (obtener claves)
FINNHUB_API_KEY=xxx
ALPHA_VANTAGE_API_KEY=xxx

# Next.js
NODE_ENV=development
```

### Obtener API Keys

1. **Finnhub**: https://finnhub.io/register (Free tier: 60 calls/min)
2. **Alpha Vantage**: https://www.alphavantage.co/support/#api-key (Free tier: 25 calls/day)

## Paso 7: Setup Vercel CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Link proyecto
vercel link
```

### Configuración Interactiva

```
? Set up and deploy "~/proyecto-patrimonio"? [Y/n] y
? Which scope do you want to deploy to? [Your Name]
? Link to existing project? [y/N] n
? What's your project's name? patrimonio
? In which directory is your code located? ./
```

### Variables en Vercel

```bash
# Configurar variables de producción
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SENTRY_DSN production
# ... etc
```

## Paso 8: Primera Ejecución

```bash
# Iniciar dev server
npm run dev
```

### Verificaciones Automáticas

```
✓ TypeScript check passed
✓ Supabase connection successful
✓ Sentry initialized
✓ Environment variables loaded

Ready on http://localhost:3000
```

### Páginas Disponibles

- `/` - Landing page
- `/auth/login` - Login
- `/auth/signup` - Signup
- `/dashboard` - Dashboard (requiere auth)

## Paso 9: Ejecutar Tests Iniciales

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e
```

Esperado: Tests de ejemplo pasan ✅

## Output Final

```
✅ System requirements verified
✅ Dependencies installed (350 packages)
✅ Folder structure created
✅ Supabase local running
✅ Sentry project configured
✅ Environment variables loaded
✅ Vercel CLI configured
✅ Dev server running on http://localhost:3000
✅ Initial tests passing (5/5)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 SETUP COMPLETO

Next steps:
1. Visita http://localhost:3000
2. Crea tu primera cuenta
3. Explora el dashboard

Para crear tu primera feature:
@patrimonio-orchestrator Crea CRUD de transacciones
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Troubleshooting

### "Docker not running"

```bash
# macOS
open -a Docker

# Windows
Start-Service docker

# Linux
sudo systemctl start docker
```

### "Supabase start failed"

```bash
# Reset completo
supabase stop
docker system prune -a
supabase start
```

### "npm install failed"

```bash
# Limpiar cache
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### "Port 3000 already in use"

```bash
# Cambiar puerto
PORT=3001 npm run dev
```

## Checklist Post-Setup

- [ ] Node 20+ instalado
- [ ] Dependencies instaladas sin errores
- [ ] Supabase local corriendo
- [ ] Sentry proyecto creado
- [ ] Variables de entorno configuradas
- [ ] Vercel CLI configurado
- [ ] Dev server arranca sin errores
- [ ] Tests iniciales pasan
- [ ] Login funciona (local)
- [ ] Sentry captura errores de prueba

---

**Versión:** 1.0  
**Actualizado:** 2026-05-02  
**Tiempo estimado:** 15-20 minutos  
**Maintainer:** @patrimonio-orchestrator
