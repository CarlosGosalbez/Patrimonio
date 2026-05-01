/**
 * Testing utilities para simplificar tests en Patrimio
 * Helpers comunes para Vitest y Playwright
 */

import { vi } from "vitest";
import type { User } from "@supabase/supabase-js";

/**
 * Mock de usuario autenticado para tests
 */
export const mockUser: User = {
  id: "test-user-id-123",
  email: "test@patrimio.app",
  email_confirmed_at: new Date().toISOString(),
  phone: "",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: {},
};

/**
 * Mock de Supabase client para tests
 */
export function mockSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token", user: mockUser } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

/**
 * Mock de Anthropic/Claude API para tests
 */
export function mockAnthropicResponse(content: string) {
  return {
    id: "msg_test123",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: content }],
    model: "claude-sonnet-4-5",
    stop_reason: "end_turn",
    usage: { input_tokens: 10, output_tokens: 20 },
  };
}

/**
 * Wait helper para tests asíncronos
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock de TanStack Query client para tests
 */
export function createMockQueryClient() {
  const { QueryClient } = require("@tanstack/react-query");
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

/**
 * Mock de transacción para tests
 */
export function mockTransaction(overrides?: Partial<any>) {
  return {
    id: "tx-test-123",
    user_id: mockUser.id,
    account_id: "acc-test-123",
    amount_cents: 10000, // 100.00€
    is_income: false,
    description: "Test transaction",
    transaction_date: "2026-05-01",
    category_id: "cat-test-123",
    currency: "EUR",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

/**
 * Mock de cuenta para tests
 */
export function mockAccount(overrides?: Partial<any>) {
  return {
    id: "acc-test-123",
    user_id: mockUser.id,
    name: "Test Account",
    account_type: "checking",
    currency: "EUR",
    initial_balance_cents: 0,
    icon: "wallet",
    color: "#1E40AF",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

/**
 * Helpers para Playwright E2E
 */
export const playwrightHelpers = {
  /**
   * Login helper para E2E tests
   */
  login: async (page: any, email: string = "test@patrimio.app", password: string = "Test1234!") => {
    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  },

  /**
   * Esperar a que un toast aparezca
   */
  waitForToast: async (page: any, text: string) => {
    await page.waitForSelector(`text=${text}`);
  },

  /**
   * Fill form helper
   */
  fillForm: async (page: any, fields: Record<string, string>) => {
    for (const [name, value] of Object.entries(fields)) {
      await page.fill(`[name="${name}"]`, value);
    }
  },
};
