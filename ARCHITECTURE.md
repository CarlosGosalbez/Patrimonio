# 📐 Arquitectura del Sistema - Patrimonio

## 🏗️ Visión General

Patrimonio es una aplicación web full-stack para gestión financiera personal, construida con arquitectura moderna y escalable.

---

## 🎯 Stack Tecnológico

### Frontend

| Tecnología     | Versión | Propósito               |
| -------------- | ------- | ----------------------- |
| React          | 18.3.1  | UI Library              |
| Next.js        | 15.1.6  | Framework SSR/SSG       |
| TypeScript     | 5.7.2   | Type Safety             |
| Tailwind CSS   | 4.0.0   | Styling                 |
| Radix UI       | 2.x     | Accessible Components   |
| React Query    | 5.62.15 | Server State Management |
| Lucide React   | 0.468.0 | Icons                   |
| Class Variance | 0.7.1   | Component Variants      |
| Recharts       | 2.15.0  | Data Visualization      |

### Backend & Infrastructure

| Tecnología | Versión | Propósito              |
| ---------- | ------- | ---------------------- |
| Supabase   | 2.48.1  | Backend as a Service   |
| PostgreSQL | 16+     | Database               |
| Deno       | Latest  | Edge Functions Runtime |
| Vercel     | Latest  | Hosting & Edge Network |
| Sentry     | 8.45.0  | Error Tracking         |

### Development & Testing

| Tecnología      | Versión | Propósito       |
| --------------- | ------- | --------------- |
| Vitest          | 2.1.8   | Unit Tests      |
| Playwright      | 1.49.1  | E2E Tests       |
| Testing Library | 16.1.0  | Component Tests |
| ESLint          | 9+      | Linting         |
| Prettier        | 3+      | Code Formatting |

---

## 📁 Estructura del Proyecto

```
Patrimonio/
│
├── .claude/                    # Claude Code configuration
│   ├── agents/                 # AI agents definitions
│   ├── commands/               # Custom commands
│   ├── hooks/                  # Lifecycle hooks
│   ├── rules/                  # Project rules
│   ├── skills/                 # Specialized skills
│   └── settings.json           # Claude settings
│
├── public/                     # Static assets
│   └── manifest.json           # PWA manifest
│
├── scripts/                    # Utility scripts
│   └── setup.sh                # Project setup
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── auth/               # Authentication pages
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── dashboard/          # Protected dashboard area
│   │   │   ├── accounts/
│   │   │   ├── portfolio/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx            # Landing page
│   │
│   ├── features/               # Feature-based modules
│   │   ├── accounts/           # Account management
│   │   │   └── components/
│   │   ├── dashboard/          # Dashboard widgets
│   │   │   └── components/
│   │   └── portfolio/          # Investment portfolio
│   │       └── components/
│   │
│   ├── shared/                 # Shared resources
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/             # Radix UI wrappers
│   │   │   └── providers.tsx   # React Query Provider
│   │   ├── hooks/              # Custom React hooks
│   │   │   └── use-toast.ts
│   │   └── lib/                # Utilities & helpers
│   │       ├── supabase/       # Supabase clients
│   │       └── utils.ts        # Helper functions
│   │
│   ├── types/                  # TypeScript definitions
│   │   └── database.ts         # Supabase types
│   │
│   └── tests/                  # Test configuration
│       └── setup.ts
│
├── supabase/
│   ├── functions/              # Edge Functions
│   │   ├── market-updater/     # Stock prices updater
│   │   └── import.json
│   └── seed.sql                # Development seed data
│
├── Configuration Files
├── .env.example
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── next.config.ts
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── sentry.*.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## 🔐 Arquitectura de Seguridad

### Row Level Security (RLS)

Todas las tablas implementan políticas RLS:

```sql
-- Ejemplo: transactions table
CREATE POLICY "users_own_transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Autenticación

- **Proveedor**: Supabase Auth
- **Método**: Email/Password (extensible a OAuth)
- **Session**: JWT tokens con refresh automático
- **Protección**: Middleware en todas las rutas `/dashboard/*`

### Validación de Datos

- **Cliente**: React Hook Form + Zod schemas
- **Servidor**: PostgreSQL constraints + RLS
- **API**: Input validation en Edge Functions

---

## 🗄️ Modelo de Datos

### Diagrama Entidad-Relación

```
┌──────────────┐
│ auth.users   │
│ (Supabase)   │
└──────┬───────┘
       │ 1:1
       ▼
┌──────────────┐
│   profiles   │ ← Perfil de usuario
├──────────────┤
│ - user_id    │
│ - full_name  │
│ - avatar_url │
└──────────────┘
       │ 1:N
       ▼
┌──────────────────────────────────────┐
│                                      │
▼                  ▼                   ▼
┌──────────────┐  ┌──────────────┐   ┌──────────────┐
│   accounts   │  │   mortgages  │   │stock_holdings│
├──────────────┤  ├──────────────┤   ├──────────────┤
│ - id         │  │ - id         │   │ - id         │
│ - user_id    │  │ - user_id    │   │ - user_id    │
│ - name       │  │ - amount     │   │ - account_id │
│ - type       │  │ - rate       │   │ - ticker     │
│ - balance    │  └──────────────┘   │ - shares     │
└──────┬───────┘                     └──────┬───────┘
       │ 1:N                                │ 1:N
       ▼                                    ▼
┌──────────────┐                    ┌──────────────┐
│ transactions │                    │stock_prices  │
├──────────────┤                    ├──────────────┤
│ - id         │                    │ - ticker     │
│ - account_id │                    │ - price      │
│ - amount     │                    │ - fetched_at │
│ - type       │                    └──────────────┘
│ - category   │
└──────────────┘                    ┌──────────────┐
                                    │  dividends   │
                                    ├──────────────┤
                                    │ - holding_id │
                                    │ - amount     │
                                    │ - pay_date   │
                                    └──────────────┘
```

### Tablas Principales

1. **profiles** - Información de usuario extendida
2. **accounts** - Cuentas bancarias e inversión
3. **transactions** - Movimientos financieros
4. **mortgages** - Hipotecas activas
5. **stock_holdings** - Posiciones en bolsa
6. **stock_prices** - Cache de precios
7. **dividends** - Dividendos (proyectados y recibidos)
8. **import_history** - Historial de imports Excel

---

## 🔄 Flujo de Datos

### Client → Server → Database

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. User Action
       ▼
┌─────────────────────────────┐
│    React Component          │
│  (Client Component)         │
└──────┬──────────────────────┘
       │ 2. React Query Mutation
       ▼
┌─────────────────────────────┐
│  Supabase Client            │
│  (@supabase/supabase-js)    │
└──────┬──────────────────────┘
       │ 3. HTTP Request + JWT
       ▼
┌─────────────────────────────┐
│  Supabase API               │
│  (RESTful + GraphQL)        │
└──────┬──────────────────────┘
       │ 4. Query + RLS Check
       ▼
┌─────────────────────────────┐
│  PostgreSQL 16+             │
│  (With RLS policies)        │
└─────────────────────────────┘
```

### Server → Client Rendering

```
Next.js App Router:

┌────────────────────────────┐
│  Server Components (RSC)   │  ← Fetch en server
│  - layout.tsx              │
│  - page.tsx                │
└────────┬───────────────────┘
         │ Initial HTML
         ▼
┌────────────────────────────┐
│  Client Components         │  ← React Query
│  "use client"              │
│  - Interactive widgets     │
└────────────────────────────┘
```

---

## 🎨 Sistema de Diseño

### Tokens de Color

Definidos en `globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --primary: 221 83% 53%;
  --success: 142 76% 36%;
  --destructive: 0 84% 60%;
  /* ... */
}
```

### Componentes Base (Radix UI)

- Button (variants: default, destructive, outline, ghost)
- Card
- Dialog
- Input
- Label
- Tabs
- Toast/Toaster

### Responsive Breakpoints

```
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
```

### Accesibilidad

- ✅ WCAG AAA target
- ✅ Color contrast 7:1
- ✅ Keyboard navigation
- ✅ ARIA labels
- ✅ Touch targets ≥44px
- ✅ Screen reader support

---

## 🚀 Deployment Architecture

### Vercel Edge Network

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────┐
│  Vercel Edge Network        │
│  - CDN                      │
│  - Edge Functions           │
│  - Image Optimization       │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Next.js Server (Vercel)    │
│  - SSR                      │
│  - API Routes               │
└──────┬──────────────────────┘
       │
       ├──────────┬────────────┐
       │          │            │
       ▼          ▼            ▼
┌──────────┐ ┌────────┐ ┌──────────┐
│ Supabase │ │ Sentry │ │ Finnhub  │
│ Database │ │ Monitor│ │ API      │
└──────────┘ └────────┘ └──────────┘
```

### CI/CD Pipeline

```
GitHub Push
    ↓
Vercel Auto-Deploy
    ↓
Build & Type Check
    ↓
Run Tests
    ↓
Deploy to Staging/Production
    ↓
Sentry Release Tracking
```

---

## 📊 Estrategia de Caching

### React Query

```typescript
{
  staleTime: 60_000,        // 1 minuto
  gcTime: 300_000,          // 5 minutos
  refetchOnWindowFocus: true,
  refetchOnMount: false,
}
```

### Supabase Realtime

- Subscripciones a cambios en `transactions`
- Invalidación automática de cache

### Next.js

- Static Generation para páginas públicas
- ISR (Incremental Static Regeneration) para dashboard

---

## 🔍 Monitoreo & Observabilidad

### Sentry Integration

- **Frontend**: Error boundary + breadcrumbs
- **Backend**: Edge Functions errors
- **Performance**: Web Vitals tracking
- **Session Replay**: User interactions (privacy-safe)

### Métricas Clave

- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1
- Error Rate < 1%
- Uptime > 99.9%

---

## 🧪 Estrategia de Testing

### Pirámide de Tests

```
        /\
       /  \
      / E2E \          ← 10% (Playwright)
     /──────\
    /   INT  \         ← 20% (Vitest + RTL)
   /──────────\
  /    UNIT    \       ← 70% (Vitest)
 /──────────────\
```

### Coverage Target

- **Unit**: >80% líneas críticas
- **Integration**: Flujos principales
- **E2E**: User journeys completos

---

## 🔮 Escalabilidad

### Horizontal Scaling

- ✅ Stateless Next.js servers
- ✅ Supabase auto-scaling
- ✅ Vercel Edge Functions (serverless)

### Optimizaciones

- Code splitting por ruta
- Image optimization (next/image)
- Dynamic imports para componentes pesados
- Database indexes en queries frecuentes

### Performance Budget

- Bundle size: <500KB (gzipped)
- Route size: <200KB
- API response: <500ms (p95)

---

## 📚 Referencias Técnicas

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Guides](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query)
- [Radix UI Primitives](https://www.radix-ui.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Última actualización:** 2026-05-03  
**Versión arquitectura:** 1.0.0
