# Patrimonio - Reglas del Proyecto

## Stack Tecnológico Obligatorio

### Frontend

- **React 18.3+** - No usar class components
- **Next.js 15+** - App Router únicamente (no Pages Router)
- **TypeScript 5.5+** - Strict mode obligatorio
- **Tailwind CSS 4+** - No inline styles
- **Radix UI 2+** - Para componentes base accesibles

### Backend & Database

- **Supabase** - Auth + Database + Storage + Realtime
- **PostgreSQL 16+** - RLS obligatorio en tablas user-scoped
- **Edge Functions** - Deno runtime para APIs
- **Zod 3.23+** - Validación cliente + servidor

### State Management

- **React Query 5+** - Server state (NO Redux, NO Zustand)
- **React Context** - Solo para UI state global mínimo
- **URL State** - Usar searchParams para filtros

### Testing

- **Vitest 2+** - Unit + integration tests
- **Playwright 1.40+** - E2E tests
- **@testing-library/react** - Component testing

### Monitoring

- **Sentry 8+** - Error tracking + Performance
- **Vercel Analytics** - Web vitals

## Normas de Código

### TypeScript

```typescript
// ✅ GOOD
interface User {
  id: string;
  name: string;
  email: string;
}

export const getUser = async (id: string): Promise<User> => {
  // Implementation
};

// ❌ BAD
export const getUser = async (id: any): Promise<any> => {
  // Never use 'any'
};
```

### React Components

```typescript
// ✅ GOOD - Functional component con types
export const UserCard: FC<UserCardProps> = memo(({ user }) => {
  return (
    <Card aria-label={`User ${user.name}`}>
      <h2>{user.name}</h2>
    </Card>
  );
});

// ❌ BAD - Sin types, sin accessibility
export const UserCard = ({ user }) => {
  return (
    <div>
      <h2>{user.name}</h2>
    </div>
  );
};
```

### Database Queries

```typescript
// ✅ GOOD - RLS automático + tipos + error handling
export const getUserTransactions = async (userId: string) => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) {
    Sentry.captureException(error);
    throw error;
  }

  return TransactionSchema.array().parse(data);
};

// ❌ BAD - Sin RLS, sin error handling
export const getUserTransactions = async () => {
  const { data } = await supabase.from("transactions").select("*");
  return data;
};
```

## Estructura de Archivos

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── [feature]/
│       └── page.tsx
├── features/               # Feature modules
│   └── [feature]/
│       ├── components/     # Feature-specific components
│       ├── hooks/          # Feature-specific hooks
│       ├── services/       # API services
│       └── types/          # TypeScript types
├── shared/                 # Shared code
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Reusable hooks
│   ├── utils/              # Utility functions
│   └── types/              # Shared types
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

## Naming Conventions

### Files

- Components: `PascalCase.tsx` (UserCard.tsx)
- Hooks: `camelCase.ts` (useUser.ts)
- Utils: `camelCase.ts` (formatCurrency.ts)
- Types: `PascalCase.types.ts` (User.types.ts)
- Tests: `*.test.tsx` o `*.spec.ts`

### Code

- Components: `PascalCase` (UserCard)
- Functions: `camelCase` (getUserBalance)
- Constants: `UPPER_SNAKE_CASE` (API_BASE_URL)
- Types/Interfaces: `PascalCase` (User, UserCardProps)
- Database tables: `snake_case` (user_transactions)

## Seguridad

### Nunca Hardcodear

```typescript
// ❌ BAD
const API_KEY = "sk_live_abc123";

// ✅ GOOD
const API_KEY = process.env.FINNHUB_API_KEY;
```

### RLS Policies Obligatorias

```sql
-- ✅ GOOD - Cada tabla user-scoped tiene RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_transactions"
  ON transactions FOR ALL
  USING (auth.uid() = user_id);
```

### Input Sanitization

```typescript
// ✅ GOOD - Validar con Zod
const CreateTransactionSchema = z.object({
  amount: z.number().positive(),
  description: z.string().max(500),
});

export async function POST(req: Request) {
  const body = await req.json();
  const validated = CreateTransactionSchema.parse(body); // Throws si inválido
  // ...
}
```

## Accesibilidad (WCAG AAA)

### Obligatorio

- ✅ ARIA labels en elementos interactivos
- ✅ Keyboard navigation completa
- ✅ Color contrast 7:1
- ✅ Touch targets 44x44px mínimo
- ✅ Focus visible
- ✅ Error messages descriptivos

```typescript
// ✅ GOOD
<button
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  aria-label="Create new transaction"
  className="min-w-[44px] min-h-[44px] focus:ring-2"
>
  Create
</button>

// ❌ BAD
<div onClick={handleClick}>Create</div>
```

## Performance

### Bundle Size

- Total: <500KB gzipped
- Por ruta: <200KB

### Code Splitting

```typescript
// ✅ GOOD
const DashboardCharts = lazy(() => import('./DashboardCharts'));

<Suspense fallback={<Skeleton />}>
  <DashboardCharts />
</Suspense>
```

### Images

```typescript
// ✅ GOOD
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Patrimonio logo"
  width={200}
  height={100}
  priority
/>

// ❌ BAD
<img src="/logo.png" />
```

## Testing Coverage

### Mínimo Obligatorio

- Unit tests: >80% cobertura
- Integration tests: Flujos críticos
- E2E tests: User journeys principales

### Casos Obligatorios

- ✅ Happy path
- ✅ Error scenarios
- ✅ Edge cases
- ✅ Loading states
- ✅ Empty states

## Git Workflow

### Commits

```
feat: Add transaction filters
fix: Resolve portfolio calculation bug
docs: Update API documentation
refactor: Simplify balance calculation
test: Add E2E tests for auth flow
```

### Branches

- `main` - Production
- `feature/[name]` - Nueva funcionalidad
- `fix/[name]` - Bug fix
- `release/[version]` - Release preparation

## Environment Variables

### Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Sentry
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# APIs
FINNHUB_API_KEY=
ALPHA_VANTAGE_API_KEY=
```

---

**Última actualización:** 2026-05-02  
**Cumplimiento:** Obligatorio para todo el equipo
