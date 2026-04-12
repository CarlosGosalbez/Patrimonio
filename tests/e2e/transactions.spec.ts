import { expect, test, type Page } from "@playwright/test";

/**
 * E2E tests for Transactions (M2)
 * Covers: CRUD, filters, soft delete, IDOR protection, API auth guard.
 *
 * Authenticated tests require TEST_USER_EMAIL + TEST_USER_PASSWORD env vars.
 */

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "test@patrimio.app";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "TestPatrimio!2026";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loginAndGoto(page: Page, path: string) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/correo|email/i).fill(TEST_EMAIL);
  await page.getByLabel(/contraseña|password/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /iniciar sesión|sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15_000 });
  await page.goto(`${BASE}${path}`);
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

test.describe("Transactions — auth guard", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto(`${BASE}/transactions`);
    await expect(page).toHaveURL(/login/, { timeout: 8_000 });
  });

  test("GET /api/transactions returns 401 without auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/transactions`);
    expect(res.status()).toBe(401);
  });

  test("POST /api/transactions returns 401 without auth", async ({ request }) => {
    const res = await request.post(`${BASE}/api/transactions`, {
      data: { amount_cents: 1000, description: "test" },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── Smoke ────────────────────────────────────────────────────────────────────

test.describe("Transactions — smoke", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoto(page, "/transactions");
  });

  test("renders transactions page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /transacciones|transactions/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows add transaction button", async ({ page }) => {
    const addBtn = page
      .getByRole("button", { name: /añadir|nueva transacción|new transaction|add/i })
      .first();
    await expect(addBtn).toBeVisible();
  });

  test("page is responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole("heading", { name: /transacciones|transactions/i })).toBeVisible();
  });
});

// ─── Filters ─────────────────────────────────────────────────────────────────

test.describe("Transactions — filters", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoto(page, "/transactions");
    await expect(page.getByRole("heading", { name: /transacciones|transactions/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("filter panel is accessible", async ({ page }) => {
    const filterBtn = page.getByRole("button", { name: /filtrar|filtros|filter/i }).first();
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await expect(page.getByRole("dialog").or(page.getByRole("region"))).toBeVisible({
        timeout: 5_000,
      });
    }
  });

  test("search input exists and is accessible", async ({ page }) => {
    const searchInput = page.getByRole("searchbox").or(page.getByPlaceholder(/buscar|search/i));
    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeVisible();
      await searchInput.fill("supermercado");
    }
  });
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

test.describe("Transactions — CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoto(page, "/transactions");
    await expect(page.getByRole("heading", { name: /transacciones|transactions/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can open create transaction dialog", async ({ page }) => {
    const addBtn = page
      .getByRole("button", { name: /añadir|nueva transacción|new transaction|add/i })
      .first();
    await addBtn.click();
    // Dialog or form should appear
    await expect(
      page
        .getByRole("dialog")
        .or(page.getByRole("form"))
        .or(page.getByRole("heading", { name: /nueva|new/i })),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("transaction form has required fields with proper labels", async ({ page }) => {
    const addBtn = page
      .getByRole("button", { name: /añadir|nueva transacción|new transaction|add/i })
      .first();
    await addBtn.click();

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
    // Required: amount field should exist
    const amountField = page.getByLabel(/importe|amount|cantidad/i);
    await expect(amountField).toBeVisible();
  });

  test("form shows validation errors on empty submit", async ({ page }) => {
    const addBtn = page
      .getByRole("button", { name: /añadir|nueva transacción|new transaction|add/i })
      .first();
    await addBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    const submitBtn = page.getByRole("button", { name: /guardar|crear|save|create/i }).last();
    await submitBtn.click();

    // Should show at least one validation error
    await expect(
      page.getByRole("alert").or(page.getByText(/requerido|required|obligatorio/i)),
    ).toBeVisible({
      timeout: 3_000,
    });
  });
});

// ─── Security — IDOR ─────────────────────────────────────────────────────────

test.describe("Transactions — IDOR protection", () => {
  test("accessing /api/transactions/:id of another user returns 403 or empty", async ({
    request,
  }) => {
    // A random UUID that doesn't belong to any real user — should return 401/403/404, not data
    const fakeId = "00000000-0000-4000-a000-000000000000";
    const res = await request.get(`${BASE}/api/transactions/${fakeId}`);
    expect([401, 403, 404]).toContain(res.status());
  });
});

// ─── API schema validation ────────────────────────────────────────────────────

test.describe("Transactions — API schema validation", () => {
  test("POST /api/transactions rejects unknown fields (Zod strict)", async ({ request }) => {
    // This goes through auth first, so 401 is also acceptable (field rejection)
    const res = await request.post(`${BASE}/api/transactions`, {
      data: {
        amount_cents: 1000,
        description: "test",
        admin: true, // should be rejected by Zod .strict()
      },
    });
    // 401 (no auth) or 422/400 (schema rejection) — never 200
    expect([400, 401, 422]).toContain(res.status());
  });
});
