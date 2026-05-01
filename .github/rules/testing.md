---
paths:
  - "tests/**"
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "playwright.config.ts"
  - "vitest.config.ts"
---

# Testing Rules — Patrimio

## Unit Tests (Vitest) — mandatory coverage

| What to test           | Minimum                                          |
| ---------------------- | ------------------------------------------------ |
| `lib/financial/`       | 100% — every formatter and calculator function   |
| Zod schemas            | 100% — valid inputs + every invalid edge case    |
| AI agent tool handlers | Mock Anthropic; verify `user_id` filtering       |
| Supabase queries       | Typed stubs; verify `.eq('user_id', ...)` called |
| RLS bypass attempts    | Must return 401                                  |

## Mock patterns

```typescript
// Mock Anthropic — never call real API in tests
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: () => "mock-model" }));
vi.mock("ai", () => ({
  streamText: vi.fn().mockResolvedValue({ toDataStreamResponse: () => new Response() }),
  tool: vi.fn((config) => config),
}));

// Mock Supabase — verify RLS-critical calls
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(), // assert .eq('user_id', user.id) was called
  is: vi.fn().mockReturnThis(), // assert .is('deleted_at', null) was called
  data: [],
  error: null,
};
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    from: mockSupabase.from,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-uid" } } }),
    },
  }),
}));
```

## E2E Tests (Playwright) — required device matrix

```typescript
// playwright.config.ts
projects: [
  { name: "chromium", use: { channel: "chrome" } },
  { name: "safari-iphone", use: { ...devices["iPhone 14"] } },
  { name: "safari-ipad", use: { ...devices["iPad Pro 11"] } },
];
```

## E2E scenarios (minimum viable)

1. **Auth flow**: register → email verify → login → 2FA TOTP → logout
2. **Transaction CRUD**: create → list → edit → soft delete (verify `deleted_at` set)
3. **Budget creation**: create budget → add transaction → verify progress bar updates
4. **RLS gate**: unauthenticated request to any `/api/*` → must return 401
5. **CSV import**: upload Santander CSV → preview → confirm import → verify transaction count
6. **PWA offline**: enable offline → navigate to cached route → verify data displayed

## Financial calculation test template

```typescript
import { describe, it, expect } from "vitest";
import { formatCurrency, eurosToCents } from "@/lib/financial/formatters";

describe("formatCurrency", () => {
  it.each([
    [85075, "850,75 €"],
    [-5000, "-50,00 €"],
    [0, "0,00 €"],
    [1, "0,01 €"],
  ])('converts %i cents to "%s"', (cents, expected) => {
    expect(formatCurrency(cents)).toBe(expected);
  });
});
```
