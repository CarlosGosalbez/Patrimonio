# Testing Guide — Patrimio

## Comandos rápidos

```bash
# Unit tests (Vitest)
npm run test                # Watch mode
npm run test:coverage       # Con reporte de cobertura → coverage/index.html

# E2E (Playwright)
npm run test:e2e            # Todos los specs (Desktop Chrome + iPhone 14)
npx playwright test tests/e2e/security-penetration.spec.ts   # Solo security
npx playwright test tests/e2e/transactions.spec.ts           # Solo transacciones
npx playwright show-report  # Ver último reporte HTML
```

## Estructura del proyecto de tests

```test
tests/
├── unit/
│   ├── alerts/               # Schemas de alertas
│   ├── budgets/              # Schemas de presupuestos
│   ├── commitments/          # Schemas de compromisos
│   ├── financial/            # Formatters, cálculos monetarios
│   ├── hooks/                # useDashboard, useBudgets, useInvestments, useCustomAlerts
│   ├── http/                 # Cliente HTTP
│   ├── investments/          # Schemas de inversiones
│   ├── lib/
│   │   ├── ai/               # Agentes IA (correlation, anomaly detection)
│   │   ├── financial/        # P&L, precio medio ponderado, conversión divisa
│   │   └── market/           # Cron market-updater route
│   ├── security/             # Schemas seguros, API routes
│   ├── transactions/         # Formatters, schemas, hooks
│   ├── validation/           # Helpers safe-zod (safeString, safeName)
│   ├── formatters.test.ts    # lib/financial/formatters.ts
│   ├── imports-matching.test.ts
│   ├── imports-parser.test.ts
│   ├── phase5-financials.test.ts  # Analytics, presupuestos
│   ├── phase6-investments.test.ts # Cálculos de inversiones
│   ├── phase7-reports.test.ts
│   └── preferences.test.ts
└── e2e/
    ├── auth.spec.ts              # Login, registro, recuperación
    ├── auth-security.spec.ts     # SQL injection, XSS en auth
    ├── budgets.spec.ts           # M6 — Presupuestos
    ├── commitments.spec.ts       # M4 — Compromisos
    ├── custom-alerts.spec.ts     # M10 — Alertas personalizadas
    ├── dashboard.spec.ts         # M1 — Dashboard
    ├── imports.spec.ts           # M3 — Importación CSV/Excel
    ├── investments.spec.ts       # M5 — Inversiones
    ├── reports.spec.ts           # M7 — Informes
    ├── security-penetration.spec.ts  # OWASP Top 10
    ├── transactions.spec.ts      # M2 — Transacciones
    └── fixtures/
        └── santander-sample.csv
```

## Cobertura por módulo

| Módulo                          | Tests | Cobertura |
| ------------------------------- | ----- | --------- |
| lib/financial/formatters.ts     | Unit  | Alta      |
| lib/investments/calculations.ts | Unit  | Alta      |
| lib/analytics/calculations.ts   | Unit  | Alta      |
| lib/imports/correlation.ts      | Unit  | Alta      |
| lib/budgets/utils.ts            | Unit  | Media     |
| hooks/usePhaseThree.ts          | Unit  | Media     |
| hooks/usePhaseFive.ts           | Unit  | Media     |
| hooks/usePhaseSix.ts            | Unit  | Media     |
| app/api/cron/market-updater     | Unit  | Alta      |
| Flujos auth (M0)                | E2E   | Alta      |
| Transacciones (M2)              | E2E   | Media     |
| Importación (M3)                | E2E   | Media     |
| Compromisos (M4)                | E2E   | Media     |
| Presupuestos (M6)               | E2E   | Media     |
| Inversiones (M5)                | E2E   | Media     |
| Informes (M7)                   | E2E   | Media     |
| Dashboard (M1)                  | E2E   | Media     |
| Alertas (M10)                   | E2E   | Media     |

## Reporte de cobertura (`npm run test:coverage`)

El informe HTML se genera en `coverage/index.html`.

La cobertura mínima exigida (thresholds en `vitest.config.ts`):

- **Lines:** 80%
- **Functions:** 80%
- **Branches:** 75%

Si la cobertura cae por debajo, los tests fallan con un mensaje claro.

## Cómo añadir un nuevo test

### Unit test (Vitest)

1. Crear archivo en `tests/unit/[dominio]/nombre.test.ts`
2. Usar el patrón `describe` + `it`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { miFunction } from "@/lib/mi-modulo";

describe("miFunction", () => {
  it("hace X correctamente", () => {
    expect(miFunction(input)).toBe(expectedOutput);
  });
});
```

1. Si necesitas **Supabase:** mock con `vi.stubGlobal("fetch", vi.fn()...)` o:

```typescript
vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: vi.fn().mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}));
```

1. Si necesitas **Anthropic AI SDK:**

```typescript
vi.mock("ai", () => ({
  streamText: vi.fn().mockResolvedValue({
    toDataStreamResponse: () =>
      new Response('0:"ok"\n', { headers: { "Content-Type": "text/event-stream" } }),
  }),
}));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: () => "mock-model" }));
```

1. Ejecutar `npm run test:coverage` y verificar cobertura ≥ 80%.

### E2E test (Playwright)

1. Crear archivo en `tests/e2e/nombre.spec.ts`
2. Patrón básico con variables de entorno:

```typescript
import { expect, test, type Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "test@patrimio.app";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "TestPatrimio!2026";

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/correo|email/i).fill(TEST_EMAIL);
  await page.getByLabel(/contraseña|password/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15_000 });
}
```

1. Cubrir siempre: auth guard (sin auth → 401), happy path autenticado, validación de formulario.
2. Plataformas: Desktop Chrome + iPhone 14 (configuradas en `playwright.config.ts`).

## Tests de seguridad (OWASP Top 10)

Todos en `tests/e2e/security-penetration.spec.ts`. Ejecutar específicamente:

```bash
npx playwright test tests/e2e/security-penetration.spec.ts
```

Qué cubren:

- **A01 Broken Access Control**: IDOR en todos los recursos principales
- **A02 Cryptographic Failures**: JWT tokens, cookies HttpOnly
- **A03 Injection**: SQL injection, XSS en todos los formularios
- **A04 Insecure Design**: CSRF, mass assignment (Zod `.strict()`)
- **A07 Auth Failures**: Brute force, session management
- **A08 Path Traversal**: Rutas con `../`

## Variables de entorno para E2E

```bash
# .env.local (nunca commitear)
PLAYWRIGHT_TEST_BASE_URL=https://patrimio.vercel.app  # o http://localhost:3000
TEST_USER_EMAIL=test@patrimio.app
TEST_USER_PASSWORD=TestPatrimio!2026

# Para CI (GitHub Secrets/Vars)
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## CI/CD

Los tests se ejecutan automáticamente en:

- **`ci.yml`**: Push a `main` + PRs → unit tests con coverage
- **`test-and-report.yml`**: Todos los branches → coverage + E2E security + gate 80%

Si la cobertura cae por debajo del **80%**, el job `coverage-gate` falla.

## Mocking best practices

| Qué mockear               | Cómo                                                              |
| ------------------------- | ----------------------------------------------------------------- |
| Supabase client (server)  | `vi.mock("@/lib/supabase/server", ...)`                           |
| Supabase client (browser) | `vi.mock("@/lib/supabase/client", ...)`                           |
| fetch global              | `vi.stubGlobal("fetch", vi.fn()...)`                              |
| Anthropic/AI SDK          | `vi.mock("ai", ...)` + `vi.mock("@ai-sdk/anthropic", ...)`        |
| Variables de entorno      | `process.env.VAR = "value"` + restore en `afterEach`              |
| Fechas                    | `vi.useFakeTimers()` + `vi.setSystemTime(new Date("2026-01-01"))` |
