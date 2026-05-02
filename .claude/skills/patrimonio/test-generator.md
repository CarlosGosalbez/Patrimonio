# 🧪 Skill: Test Generator

Tests con >80% coverage usando Vitest y Playwright.

## Stack

Vitest 2.1+ · Testing Library 16+ · Playwright 1.40+ · MSW 2+

## Coverage

- Unit: >80% líneas/branches
- Integration: flujos críticos
- E2E: user journeys
- Mocks profesionales

## Output Generado

```
src/features/[feature]/
└── __tests__/
    ├── unit/
    │   ├── [component].test.tsx       # Component tests
    │   ├── [service].test.ts          # Service tests
    │   └── [utils].test.ts            # Utils tests
    ├── integration/
    │   └── [feature].integration.test.tsx
    └── e2e/
        └── [feature].spec.ts          # Playwright E2E
```

## Unit Tests (Vitest)

### Component Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionForm } from '../TransactionForm';

describe('TransactionForm', () => {
  it('renders all form fields', () => {
    render(<TransactionForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<TransactionForm onSubmit={vi.fn()} />);

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const onSubmit = vi.fn();
    render(<TransactionForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/amount/i), '100');
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'food');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 100, category: 'food' })
      );
    });
  });

  it('handles errors gracefully', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('API Error'));
    render(<TransactionForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/amount/i), '100');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### Service Test

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { transactionsService } from "../transactions.service";
import { createClient } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client");

describe("transactionsService", () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    is: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    single: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("should fetch all transactions", async () => {
      const mockData = [
        { id: "1", amount: 100, type: "income" },
        { id: "2", amount: -50, type: "expense" },
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await transactionsService.getAll();

      expect(result).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith("transactions");
      expect(mockSupabase.is).toHaveBeenCalledWith("deleted_at", null);
    });

    it("should handle errors", async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: new Error("Database error"),
      });

      await expect(transactionsService.getAll()).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("create", () => {
    it("should create transaction", async () => {
      const newTransaction = { amount: 100, type: "income" as const };
      const createdTransaction = { id: "1", ...newTransaction };

      mockSupabase.insert.mockResolvedValueOnce({
        data: createdTransaction,
        error: null,
      });

      const result = await transactionsService.create(newTransaction);

      expect(result).toEqual(createdTransaction);
      expect(mockSupabase.insert).toHaveBeenCalledWith(newTransaction);
    });
  });
});
```

### Hook Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTransactions, useCreateTransaction } from '../transactions.hooks';
import { transactionsService } from '../transactions.service';

vi.mock('../transactions.service');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useTransactions', () => {
  it('should fetch transactions', async () => {
    const mockTransactions = [{ id: '1', amount: 100 }];
    vi.mocked(transactionsService.getAll).mockResolvedValueOnce(mockTransactions);

    const { result } = renderHook(() => useTransactions(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTransactions);
  });

  it('should handle errors', async () => {
    vi.mocked(transactionsService.getAll).mockRejectedValueOnce(
      new Error('API Error')
    );

    const { result } = renderHook(() => useTransactions(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe('useCreateTransaction', () => {
  it('should create transaction', async () => {
    const newTransaction = { amount: 100, type: 'income' as const };
    const createdTransaction = { id: '1', ...newTransaction };

    vi.mocked(transactionsService.create).mockResolvedValueOnce(createdTransaction);

    const { result } = renderHook(() => useCreateTransaction(), {
      wrapper: createWrapper()
    });

    result.current.mutate(newTransaction);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(createdTransaction);
  });
});
```

## Integration Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { TransactionsPage } from '../TransactionsPage';

const server = setupServer(
  http.get('/api/transactions', () => {
    return HttpResponse.json([
      { id: '1', amount: 100, type: 'income' }
    ]);
  }),

  http.post('/api/transactions', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '2', ...body });
  })
);

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('TransactionsPage Integration', () => {
  it('should load and display transactions', async () => {
    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });
  });

  it('should create transaction end-to-end', async () => {
    render(<TransactionsPage />);

    const createBtn = screen.getByRole('button', { name: /new transaction/i });
    await userEvent.click(createBtn);

    await userEvent.type(screen.getByLabelText(/amount/i), '50');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });
  });
});
```

## E2E Tests (Playwright)

```typescript
import { test, expect } from "@playwright/test";

test.describe("Transactions Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should create new transaction", async ({ page }) => {
    await page.goto("/transactions");

    // Click create button
    await page.click('button:has-text("New Transaction")');

    // Fill form
    await page.fill('[name="amount"]', "100");
    await page.selectOption('[name="category"]', "food");
    await page.fill('[name="description"]', "Grocery shopping");

    // Submit
    await page.click('button:has-text("Save")');

    // Verify success
    await expect(page.locator("text=Transaction created")).toBeVisible();
    await expect(page.locator("text=$100.00")).toBeVisible();
  });

  test("should edit transaction", async ({ page }) => {
    await page.goto("/transactions");

    // Click first transaction edit button
    await page.click(
      '[data-testid="transaction-item"]:first-child button:has-text("Edit")',
    );

    // Update amount
    await page.fill('[name="amount"]', "150");
    await page.click('button:has-text("Save")');

    // Verify update
    await expect(page.locator("text=$150.00")).toBeVisible();
  });

  test("should delete transaction", async ({ page }) => {
    await page.goto("/transactions");

    const initialCount = await page
      .locator('[data-testid="transaction-item"]')
      .count();

    // Click delete on first transaction
    await page.click(
      '[data-testid="transaction-item"]:first-child button:has-text("Delete")',
    );

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Verify deletion
    const newCount = await page
      .locator('[data-testid="transaction-item"]')
      .count();
    expect(newCount).toBe(initialCount - 1);
  });

  test("should filter transactions", async ({ page }) => {
    await page.goto("/transactions");

    // Apply filter
    await page.selectOption('[name="type"]', "income");

    // Verify only income transactions visible
    const transactions = page.locator('[data-testid="transaction-item"]');
    const count = await transactions.count();

    for (let i = 0; i < count; i++) {
      const type = await transactions.nth(i).getAttribute("data-type");
      expect(type).toBe("income");
    }
  });

  test("should be accessible", async ({ page }) => {
    await page.goto("/transactions");

    // Keyboard navigation
    await page.keyboard.press("Tab");
    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(focusedElement).toBeTruthy();

    // ARIA labels
    const createBtn = page.locator('button:has-text("New Transaction")');
    const ariaLabel = await createBtn.getAttribute("aria-label");
    expect(ariaLabel).toBeTruthy();
  });
});
```

## Test Configuration

### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      exclude: [
        "node_modules/",
        "src/tests/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData/",
        "**/*.test.{ts,tsx}",
      ],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### playwright.config.ts

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

## Coverage Report

```bash
# Ejecutar tests con coverage
npm run test:coverage

# Ver reporte HTML
open coverage/index.html
```

## Mejores Prácticas

- ✅ Tests descriptivos (it('should...'))
- ✅ AAA pattern (Arrange, Act, Assert)
- ✅ Mocks aislados por test
- ✅ Coverage >80% en funcionalidad crítica
- ✅ E2E para flujos críticos
- ✅ Accessibilidad automated tests

---

**Versión:** 1.0  
**Actualizado:** 2026-05-02  
**Maintainer:** @patrimonio-orchestrator
