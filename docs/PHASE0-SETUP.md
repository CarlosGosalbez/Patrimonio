# Patrimio — Phase 0 Setup Guide

## 🎯 Estado actual: PHASE 0 casi completada

### ✅ Completado

1. **Proyecto Next.js 14 inicializado**
   - TypeScript 5 + Tailwind CSS
   - App Router configurado
   - ESLint + Prettier + Husky

2. **Dependencias instaladas**
   - '@supabase/ssr' + '@supabase/supabase-js'
   - 'zod' + 'react-hook-form'
   - 'zustand' + '@tanstack/react-query'
   - 'ai' + '@ai-sdk/anthropic'
   - 'recharts' + 'date-fns'
   - Vitest + Playwright

3. **Archivos de configuración**
   - ✅ \lib/supabase/client.ts\
   - ✅ \lib/supabase/server.ts\
   - ✅ \lib/supabase/middleware.ts\
   - ✅ \lib/financial/formatters.ts\
   - ✅ \middleware.ts\ (auth middleware)
   - ✅ \	ypes/database.ts\ (placeholder)

4. **18 migraciones SQL creadas** (\supabase/migrations/\)
   - ENUMs (investment_type, operation_type, frequency_type, etc.)
   - Tablas: profiles, accounts, categories, transactions, recurring_commitments
   - Tablas de inversiones: investments, investment_operations, investment_snapshots
   - Otras: budgets, auto_categorization_rules, custom_alerts, market_cache, notifications
   - Materialized views: monthly_account_balance, monthly_category_spending
   - RPC functions: get_net_worth, project_cash_flow, recalculate_avg_purchase_price
   - Seeds: 25+ system categories
   - Function: create_default_custom_alerts

5. **CI/CD**
   - ✅ GitHub Actions workflow (\.github/workflows/ci.yml\)
   - ✅ \ercel.json\ configurado

6. **Build verificado**
   - ✅ \
pm run type-check\ — pasa
   - ✅ \
pm run build\ — exitoso

---

## 🚧 Pasos pendientes para completar Phase 0

### 1. Aplicar migraciones a la base de datos

**Opción A: Desarrollo local con Docker** (recomendado para pruebas)

\\\ash
# Asegúrate de que Docker Desktop esté ejecutándose
npx supabase start

# Las migraciones se aplican automáticamente al iniciar
# Si necesitas aplicarlas manualmente:
npx supabase db reset
\\\

**Opción B: Proyecto remoto de Supabase**

\\\ash
# 1. Login en Supabase CLI
npx supabase login

# 2. Vincular con proyecto remoto
npx supabase link --project-ref febokmcgjatrfdfuaeyk

# 3. Aplicar migraciones
npx supabase db push
\\\

### 2. Generar types de TypeScript desde la base de datos

Después de aplicar las migraciones:

\\\ash
# Para desarrollo local
npx supabase gen types typescript --local > types/database.ts

# Para proyecto remoto (después de link)
npx supabase gen types typescript --linked > types/database.ts
\\\

### 3. Configurar deployment en Vercel

1. Ve a [vercel.com](https://vercel.com) y conecta tu repositorio
2. Configura las variables de entorno en Vercel Dashboard:
   - \NEXT_PUBLIC_SUPABASE_URL\
   - \NEXT_PUBLIC_SUPABASE_ANON_KEY\
   - \NEXT_PUBLIC_APP_URL\
   (Ver valores en \.env.example\)

3. Deploy automático en cada push a \main\

### 4. Verificar RLS (Row Level Security)

**Test manual en Supabase Dashboard:**

1. Ve a SQL Editor en Supabase Dashboard
2. Ejecuta:
\\\sql
-- Crear usuario de prueba 1
INSERT INTO auth.users (id, email)
VALUES ('11111111-1111-1111-1111-111111111111', 'user1@test.com');

-- Crear usuario de prueba 2  
INSERT INTO auth.users (id, email)
VALUES ('22222222-2222-2222-2222-222222222222', 'user2@test.com');

-- Insertar transacciones de cada usuario
INSERT INTO transactions (user_id, account_id, amount_cents, description, is_income)
VALUES
  ('11111111-1111-1111-1111-111111111111', gen_random_uuid(), 10000, 'User 1 transaction', false),
  ('22222222-2222-2222-2222-222222222222', gen_random_uuid(), 20000, 'User 2 transaction', false);

-- VERIFICAR que cada usuario solo ve sus transacciones
SET request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
SELECT * FROM transactions; -- Debe devolver solo 1 fila

SET request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
SELECT * FROM transactions; -- Debe devolver solo 1 fila diferente
\\\

### 5. Ejecutar tests (opcional pero recomendado)

\\\ash
# Unit tests
npm run test

# E2E tests (requiere servidor Next.js ejecutándose)
npm run test:e2e
\\\

---

## 📋 Checklist final de Phase 0

Antes de pasar a Phase 1, verifica:

- [ ] Migraciones aplicadas sin errores (\
px supabase db push\)
- [ ] \	ypes/database.ts\ generado y sin errores de tipo
- [ ] \
pm run build\ — exitoso
- [ ] CI en GitHub Actions — verde
- [ ] Proyecto deployed en Vercel
- [ ] Variables de entorno configuradas en Vercel Dashboard
- [ ] RLS bloqueando acceso cross-user (test manual verificado)

---

## 🛠️ Comandos útiles

\\\ash
# Desarrollo local
npm run dev                # Iniciar dev server en http://localhost:3000  
npm run type-check         # Verificar tipos
npm run lint               # Verificar ESLint
npm run format             # Formatear código con Prettier

# Supabase local
npx supabase start         # Iniciar stack Supabase local (requiere Docker)
npx supabase status        # Ver URLs y credenciales locales
npx supabase stop          # Detener stack local
npx supabase db reset      # Resetear DB local y reaplicar migraciones

# Supabase remoto
npx supabase link          # Vincular con proyecto remoto
npx supabase db push       # Aplicar migraciones
npx supabase db pull       # Obtener migraciones del remoto
npx supabase gen types typescript --linked > types/database.ts

# Testing
npm run test               # Vitest unit tests
npm run test:e2e           # Playwright E2E tests
\\\

---

## 📚 Documentación adicional

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Deployment](https://vercel.com/docs)
- [Patrimio Technical Spec](./docs/patrimio-technical-spec.md)
- [Phase Plan](./docs/PHASES.md)

---

## 🐛 Troubleshooting

### Error: "Docker not running" al ejecutar \
px supabase start\
**Solución:** Asegúrate de que Docker Desktop esté ejecutándose.

### Error: "Access token not provided" al ejecutar \
px supabase link\
**Solución:** Ejecuta \
px supabase login\ primero.

### Error de compilación en \	ypes/database.ts\
**Solución:** Regenera el archivo después de aplicar migraciones:
\\\ash
npx supabase gen types typescript --local > types/database.ts
\\\

### Build fallando por variables de entorno
**Solución:** Crea \.env.local\ a partir de \.env.example\ y completa los valores.
