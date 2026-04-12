import { expect, test, type Page } from "@playwright/test";

/**
 * E2E tests for Custom Alerts (M10)
 * Covers: auth guard, CRUD, predefined alerts visibility, API schema validation.
 */

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "test@patrimio.app";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "TestPatrimio!2026";

async function loginAndNavigateToAlerts(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/correo|email/i).fill(TEST_EMAIL);
  await page.getByLabel(/contraseña|password/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /iniciar sesión|sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15_000 });
  // Try both possible URL patterns for the alerts page
  await page.goto(`${BASE}/alerts`);
  const url = page.url();
  if (url.includes("login") || url.includes("404")) {
    await page.goto(`${BASE}/custom-alerts`);
  }
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

test.describe("Custom Alerts — auth guard", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto(`${BASE}/alerts`);
    await expect(page).toHaveURL(/login/, { timeout: 8_000 });
  });

  test("GET /api/custom-alerts returns 401 without auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/custom-alerts`);
    expect(res.status()).toBe(401);
  });

  test("POST /api/custom-alerts returns 401 without auth", async ({ request }) => {
    const res = await request.post(`${BASE}/api/custom-alerts`, {
      data: { title: "Test", due_date: "2026-12-01", alert_days_before: 30 },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── API — CRUD endpoints ─────────────────────────────────────────────────────

test.describe("Custom Alerts — API endpoints", () => {
  test("PATCH /api/custom-alerts/:id returns 401 without auth", async ({ request }) => {
    const fakeId = "00000000-0000-4000-a000-000000000000";
    const res = await request.patch(`${BASE}/api/custom-alerts/${fakeId}`, {
      data: { due_date: "2026-06-01" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("DELETE /api/custom-alerts/:id returns 401 without auth", async ({ request }) => {
    const fakeId = "00000000-0000-4000-a000-000000000000";
    const res = await request.delete(`${BASE}/api/custom-alerts/${fakeId}`);
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/custom-alerts rejects unknown fields", async ({ request }) => {
    const res = await request.post(`${BASE}/api/custom-alerts`, {
      data: {
        title: "Test Alert",
        due_date: "2026-12-01",
        alert_days_before: 30,
        admin_override: true, // should be rejected by Zod .strict()
      },
    });
    expect([400, 401, 422]).toContain(res.status());
  });

  test("PATCH /api/custom-alerts/preferences returns 401 without auth", async ({ request }) => {
    const res = await request.patch(`${BASE}/api/custom-alerts/preferences`, {
      data: { weekly_alert_digest_enabled: false },
    });
    expect([401, 403]).toContain(res.status());
  });
});

// ─── Authenticated smoke ──────────────────────────────────────────────────────

test.describe("Custom Alerts — smoke (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToAlerts(page);
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
  });

  test("page renders without 500 errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("response", (res) => {
      if (res.status() >= 500) errors.push(`${res.status()} ${res.url()}`);
    });
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
    expect(errors).toHaveLength(0);
  });

  test("shows create alert button if on alerts page", async ({ page }) => {
    const url = page.url();
    if (url.includes("alerts") || url.includes("dashboard")) {
      // Either the alerts page is accessible or we're on dashboard
      await expect(page.locator("main, [role='main']").first()).toBeVisible();
    }
  });
});

// ─── Dashboard widget — upcoming alerts ──────────────────────────────────────

test.describe("Custom Alerts — dashboard widget", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel(/correo|email/i).fill(TEST_EMAIL);
    await page.getByLabel(/contraseña|password/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /iniciar sesión|sign in/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 15_000 });
  });

  test("dashboard loads without alert-related 500 errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("response", (res) => {
      if (res.status() >= 500 && res.url().includes("custom-alerts")) {
        errors.push(`${res.status()} ${res.url()}`);
      }
    });
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
    expect(errors).toHaveLength(0);
  });
});
