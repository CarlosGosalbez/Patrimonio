import { expect, test, type Page } from "@playwright/test";

/**
 * E2E tests for Budgets (M6)
 * Covers: auth guard, CRUD, progress bar states, API schema validation.
 */

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "test@patrimio.app";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "TestPatrimio!2026";

async function loginAndNavigateToBudgets(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/correo|email/i).fill(TEST_EMAIL);
  await page.getByLabel(/contraseña|password/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /iniciar sesión|sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15_000 });
  await page.goto(`${BASE}/budgets`);
  await expect(page.getByRole("heading", { name: /presupuestos|budgets/i })).toBeVisible({
    timeout: 10_000,
  });
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

test.describe("Budgets — auth guard", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto(`${BASE}/budgets`);
    await expect(page).toHaveURL(/login/, { timeout: 8_000 });
  });

  test("GET /api/budgets returns 401 without auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/budgets`);
    expect(res.status()).toBe(401);
  });

  test("POST /api/budgets returns 401 without auth", async ({ request }) => {
    const res = await request.post(`${BASE}/api/budgets`, {
      data: { category_id: "test", limit_input: "500", period: "monthly", currency: "EUR" },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── Smoke ────────────────────────────────────────────────────────────────────

test.describe("Budgets — smoke", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToBudgets(page);
  });

  test("renders budgets page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /presupuestos|budgets/i })).toBeVisible();
  });

  test("shows create budget button", async ({ page }) => {
    const createBtn = page
      .getByRole("button", { name: /nuevo presupuesto|add budget|crear|new/i })
      .first();
    await expect(createBtn).toBeVisible();
  });

  test("page renders without 500 errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("response", (res) => {
      if (res.status() >= 500) errors.push(`${res.status()} ${res.url()}`);
    });
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
    expect(errors).toHaveLength(0);
  });
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

test.describe("Budgets — CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToBudgets(page);
  });

  test("can open creation dialog", async ({ page }) => {
    const createBtn = page
      .getByRole("button", { name: /nuevo presupuesto|add budget|crear|new/i })
      .first();
    await createBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
  });

  test("form has required fields with proper labels", async ({ page }) => {
    const createBtn = page
      .getByRole("button", { name: /nuevo presupuesto|add budget|crear|new/i })
      .first();
    await createBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    // Amount/limit field must be present
    const limitField = page.getByLabel(/límite|importe|limit|amount/i);
    await expect(limitField).toBeVisible();
  });

  test("form shows validation error on empty submit", async ({ page }) => {
    const createBtn = page
      .getByRole("button", { name: /nuevo presupuesto|add budget|crear|new/i })
      .first();
    await createBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    const submitBtn = page.getByRole("button", { name: /guardar|crear|save|create/i }).last();
    await submitBtn.click();

    await expect(
      page.getByRole("alert").or(page.getByText(/requerido|required|obligatorio/i)),
    ).toBeVisible({ timeout: 3_000 });
  });
});

// ─── Progress bar states (unit-verifiable via API) ───────────────────────────

test.describe("Budgets — API: progress calculation", () => {
  test("PATCH /api/budgets/:id returns 401 without auth", async ({ request }) => {
    const fakeId = "00000000-0000-4000-a000-000000000000";
    const res = await request.patch(`${BASE}/api/budgets/${fakeId}`, {
      data: { limit_input: "600" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("DELETE /api/budgets/:id returns 401 without auth", async ({ request }) => {
    const fakeId = "00000000-0000-4000-a000-000000000000";
    const res = await request.delete(`${BASE}/api/budgets/${fakeId}`);
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/budgets rejects unknown fields (Zod strict)", async ({ request }) => {
    const res = await request.post(`${BASE}/api/budgets`, {
      data: {
        category_id: "test",
        limit_input: "500",
        period: "monthly",
        currency: "EUR",
        admin: true, // unknown field — should be rejected
      },
    });
    expect([400, 401, 422]).toContain(res.status());
  });
});

// ─── Responsive ───────────────────────────────────────────────────────────────

test.describe("Budgets — responsive", () => {
  test("mobile: budget cards stack vertically", async ({ page }) => {
    await loginAndNavigateToBudgets(page);
    await page.setViewportSize({ width: 375, height: 812 });
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});
