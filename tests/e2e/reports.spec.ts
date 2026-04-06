import { expect, test, type Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "test@patrimio.app";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "TestPatrimio!2026";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function loginAndNavigateToReports(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/correo|email/i).fill(TEST_EMAIL);
  await page.getByLabel(/contraseña|password/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /iniciar sesión|sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15_000 });
  await page.goto(`${BASE}/reports`);
  await expect(page.getByRole("heading", { name: /informes|reports/i })).toBeVisible({
    timeout: 10_000,
  });
}

// ─────────────────────────────────────────────────────────────
// Auth guard
// ─────────────────────────────────────────────────────────────

test.describe("Reports — auth guard", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto(`${BASE}/reports`);
    await expect(page).toHaveURL(/login/, { timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────
// Smoke tests (authenticated)
// ─────────────────────────────────────────────────────────────

test.describe("Reports — smoke", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToReports(page);
  });

  test("renders 4-tab layout", async ({ page }) => {
    // All four tabs must be present
    await expect(page.getByRole("tab", { name: /mensual|monthly/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /anual|annual/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /irpf|fiscal/i })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /datos personales|gdpr|personal data/i }),
    ).toBeVisible();
  });

  test("monthly tab shows KPI metrics", async ({ page }) => {
    // Monthly tab should be active by default
    await expect(page.getByRole("tab", { name: /mensual|monthly/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Should display income and expenses metric cards
    await expect(page.getByText(/ingresos|income/i).first()).toBeVisible();
    await expect(page.getByText(/gastos|expenses/i).first()).toBeVisible();
  });

  test("annual tab renders on click", async ({ page }) => {
    await page.getByRole("tab", { name: /anual|annual/i }).click();
    // Period comparison chart or annual summary should appear
    await expect(page.getByRole("tab", { name: /anual|annual/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("fiscal tab renders IRPF section", async ({ page }) => {
    await page.getByRole("tab", { name: /irpf|fiscal/i }).click();
    await expect(page.getByRole("tab", { name: /irpf|fiscal/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Legal disclaimer must be visible
    await expect(page.getByText(/profesional|asesor|disclaimer/i).first()).toBeVisible({
      timeout: 8_000,
    });
  });

  test("GDPR tab shows confirmation checkbox before download", async ({ page }) => {
    await page.getByRole("tab", { name: /datos personales|gdpr|personal data/i }).click();
    // Checkbox must be present and unchecked initially
    const checkbox = page.getByRole("checkbox", { name: /confirmo|confirmar|confirm/i });
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();
  });
});

// ─────────────────────────────────────────────────────────────
// Month/year selector
// ─────────────────────────────────────────────────────────────

test.describe("Reports — period selector", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToReports(page);
  });

  test("month selector changes allow navigating to different months", async ({ page }) => {
    // Month selector should be visible in monthly tab
    const monthSelect = page.getByRole("combobox", { name: /mes|month/i });
    await expect(monthSelect).toBeVisible();
  });

  test("year selector is visible", async ({ page }) => {
    const yearSelect = page.getByRole("combobox", { name: /año|year/i });
    await expect(yearSelect).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// AppShell navigation
// ─────────────────────────────────────────────────────────────

test.describe("Reports — navigation link", () => {
  test("reports link appears in bottom navigation after login", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel(/correo|email/i).fill(TEST_EMAIL);
    await page.getByLabel(/contraseña|password/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /iniciar sesión|sign in/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 15_000 });

    // The Reports nav link should be in the bottom nav
    const navLink = page.getByRole("link", { name: /informes|reports/i });
    await expect(navLink).toBeVisible();
    await navLink.click();
    await expect(page).toHaveURL(/reports/, { timeout: 8_000 });
  });
});
