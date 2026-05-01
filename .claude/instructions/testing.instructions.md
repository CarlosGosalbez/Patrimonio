---
description: "Use when writing tests, setting up test files, mocking Supabase or Anthropic APIs, creating Playwright E2E scenarios, or verifying RLS policies. Covers Vitest unit tests and Playwright E2E for Safari/iPhone."
name: "Testing Guidelines"
applyTo: "tests/**"
---

# Testing Guidelines — Patrimio

## Test Pyramid

```
       E2E (5%)   ← Playwright, critical user journeys, Safari/iPhone
   Integration (20%)  ← API routes, auth flows, DB with RLS
  Unit Tests (75%)    ← Components, utilities, Zod schemas, agents
```

## Unit Tests — Vitest

### Setup

```typescript
// vitest.config.ts (already configured)
// Run: npm run test (or npm run test:watch)
```

### Financial Utilities

All functions in `lib/financial/` must have 100% branch coverage:

```typescript
// tests/unit/financial/formatters.test.ts
import { describe, it, expect } from "vitest";
import { formatCurrency, parseCurrencyInput } from "@/lib/financial/formatters";

describe("formatCurrency", () => {
  it("formats positive cents to EUR string", () => {
    expect(formatCurrency(85075, "EUR")).toBe("850,75 €");
  });
  it("formats zero", () => {
    expect(formatCurrency(0, "EUR")).toBe("0,00 €");
  });
  it("formats negative (loss)", () => {
    expect(formatCurrency(-5000, "EUR")).toBe("-50,00 €");
  });
});
```

### Zod Schema Tests

```typescript
// tests/unit/schemas/transaction.test.ts
import { CreateTransactionSchema } from "@/lib/schemas/transaction";

describe("CreateTransactionSchema", () => {
  it("rejects unknown fields (.strict())", () => {
    expect(() =>
      CreateTransactionSchema.parse({
        amount_cents: 1000,
        description: "test",
        malicious_field: "<script>", // Must be rejected
      }),
    ).toThrow();
  });

  it("rejects negative amounts", () => {
    expect(() => CreateTransactionSchema.parse({ amount_cents: -100 })).toThrow();
  });
});
```

### Mocking Supabase

```typescript
// tests/unit/setup.ts or inline
import { vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-uuid", email: "test@example.com" } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}));
```

### Mocking Anthropic API

```typescript
// ALWAYS mock in agent tests — never call real API in tests
import { vi } from "vitest";

vi.mock("ai", () => ({
  streamText: vi.fn().mockResolvedValue({
    toDataStreamResponse: () =>
      new Response(
        '0:"Análisis completado"\n', // Data stream format
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  }),
  tool: vi.fn().mockImplementation((config) => config),
}));
```

## Integration Tests

### RLS Verification Tests

Critical: test that one user cannot access another user's data:

```typescript
// tests/integration/rls/transactions.test.ts
describe('RLS: transactions', () => {
  it('user A cannot read user B transactions', async () => {
    // Create transaction for userA
    const { data: tx } = await supabaseUserA.from('transactions').insert({...});

    // Attempt to fetch as userB — should return empty, not error
    const { data, error } = await supabaseUserB
      .from('transactions')
      .select('*')
      .eq('id', tx.id);

    expect(error).toBeNull();  // RLS returns empty, not 403
    expect(data).toHaveLength(0);  // No data leaked
  });
});
```

### API Route Integration Tests

```typescript
// tests/integration/api/transactions.test.ts
describe("POST /api/transactions", () => {
  it("returns 401 without auth token", async () => {
    const res = await fetch("/api/transactions", {
      method: "POST",
      body: JSON.stringify({ amount_cents: 1000 }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects request with unknown fields (Zod strict)", async () => {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ amount_cents: 1000, malicious: "data" }),
    });
    expect(res.status).toBe(400);
  });
});
```

## E2E Tests — Playwright

### Device Configuration

```typescript
// playwright.config.ts — required device projects
projects: [
  {
    name: 'safari-iphone',
    use: {
      ...devices['iPhone 14'],
      // Safari on iPhone 14
    },
  },
  {
    name: 'safari-ipad',
    use: {
      ...devices['iPad Pro 11'],
    },
  },
  {
    name: 'chromium',
    use: { channel: 'chrome' },
  },
],
```

### Critical E2E Scenarios

```typescript
// tests/e2e/happy-path.spec.ts
test('registro → onboarding → primera transacción → dashboard', async ({ page }) => {
  await page.goto('/register');
  // ... complete flow
  await expect(page.getByTestId('dashboard-networth')).toBeVisible();
});

// tests/e2e/2fa.spec.ts
test('activar 2FA → logout → login con TOTP', async ({ page }) => { ... });

// tests/e2e/import.spec.ts
test('importar extracto CSV → mapear → confirmar', async ({ page }) => {
  // Drag & drop CSV file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('./tests/fixtures/santander-sample.csv');
  // ... verify import preview
});

// tests/e2e/offline.spec.ts
test('usar app offline y sincronizar al volver a online', async ({ page, context }) => {
  await context.setOffline(true);
  // Dashboard should show cached data
  await expect(page.getByTestId('offline-indicator')).toBeVisible();
  await context.setOffline(false);
  // Should sync pending writes
});
```

### Test Data / Fixtures

Place test fixture files in `tests/fixtures/`:

- `santander-sample.csv` — Santander bank export sample
- `bbva-sample.xlsx` — BBVA Excel export sample
- `portfolio-sample.json` — Test portfolio data

Use a dedicated test Supabase project for E2E (never run against production).

## Mock de Supabase en tests unitarios

```typescript
// tests/utils/supabase-mock.ts
import { vi } from "vitest";

export const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id" } },
      error: null,
    }),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => mockSupabase,
}));
```

## Matriz de dispositivos para Playwright

| Proyecto         | Dispositivo    | Resolución | Prioridad               |
| ---------------- | -------------- | ---------- | ----------------------- |
| `mobile`         | iPhone 14      | 390×844    | Alta — entrada primaria |
| `tablet`         | iPad Pro 11    | 834×1194   | Media                   |
| `desktop`        | Desktop Chrome | 1280×800   | Alta                    |
| `safari-desktop` | Desktop Safari | 1280×800   | Media                   |

```typescript
// playwright.config.ts
projects: [
  { name: 'mobile', use: { ...devices['iPhone 14'] } },
  { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
],
```

## Verificación de RLS en tests de integración

```typescript
// Crear dos usuarios y verificar aislamiento
it('should not expose data between users', async () => {
  const user1 = await createTestUser();
  const user2 = await createTestUser();

  // Crear transacción con user1
  await supabase.auth.signInWithPassword(user1);
  await supabase.from('transactions').insert({ ... });

  // Verificar que user2 NO la ve
  await supabase.auth.signInWithPassword(user2);
  const { data } = await supabase.from('transactions').select();
  expect(data).toHaveLength(0);
});
```
