import path from "path";
import { test, expect, type Page } from "@playwright/test";

/**
 * Imports E2E happy-path — Phase 4
 * Flow: login → navigate to /imports → upload CSV (Santander) →
 *       select account → preview → confirm → verify success → rollback → verify rollback
 *
 * Runs against both Desktop Chrome and iPhone 14 (configured in playwright.config.ts).
 * Uses TEST_USER_EMAIL + TEST_USER_PASSWORD env vars pointing to a real account
 * that has at least one bank account created.
 *
 * IMPORTANT: Sequential (workers: 1) to avoid DB state conflicts.
 */

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "test@patrimio.app";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "TestPatrimio!2026";
const FIXTURE_CSV = path.resolve(__dirname, "fixtures/santander-sample.csv");

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function loginAndNavigateToImports(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/correo/i).fill(TEST_EMAIL);
  await page.getByLabel(/contraseña/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();

  // Wait for redirect to dashboard (auth middleware redirects after login)
  await page.waitForURL(/dashboard/, { timeout: 15000 });

  // Navigate to imports
  await page.goto(`${BASE}/imports`);
  await expect(page.getByRole("heading", { name: /importaci/i })).toBeVisible({ timeout: 10000 });
}

// ─── Guard: unauthenticated redirect ─────────────────────────────────────────

test.describe("Imports — auth guard", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto(`${BASE}/imports`);
    await expect(page).toHaveURL(/login/, { timeout: 8000 });
  });
});

// ─── Happy path ───────────────────────────────────────────────────────────────

test.describe("Imports — happy path", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToImports(page);
  });

  test("renders the imports page with file upload zone", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /importaci/i })).toBeVisible();
    // File input present
    await expect(page.locator('input[type="file"]')).toBeVisible();
    // Account selector present
    await expect(page.locator("#import-account")).toBeVisible();
  });

  test("upload CSV → auto-detects Santander → shows mapping board", async ({ page }) => {
    // Upload the fixture CSV
    await page.locator('input[type="file"]').setInputFiles(FIXTURE_CSV);

    // File info card should show detected bank
    await expect(page.getByText(/santander/i)).toBeVisible({ timeout: 8000 });
    // Mapping board should appear
    await expect(page.getByText(/columnas disponibles|available columns/i)).toBeVisible({
      timeout: 6000,
    });
  });

  test("full flow: upload → select account → preview → confirm → rollback", async ({ page }) => {
    // ── 1. Upload CSV ────────────────────────────────────────────────────────
    await page.locator('input[type="file"]').setInputFiles(FIXTURE_CSV);
    await expect(page.getByText(/santander/i)).toBeVisible({ timeout: 8000 });

    // ── 2. Select first available account ────────────────────────────────────
    const accountSelect = page.locator("#import-account");
    // Wait for accounts to load (query might be pending)
    await expect(accountSelect.locator("option")).not.toHaveCount(1, { timeout: 8000 }); // [0] = placeholder
    await accountSelect.selectOption({ index: 1 }); // pick first real account

    // ── 3. Request preview ────────────────────────────────────────────────────
    await page.getByRole("button", { name: /pre-importar|preview/i }).click();

    // Preview table should appear with rows
    await expect(page.getByText(/SUPERMERCADO|NOMINA|CARREFOUR/i)).toBeVisible({ timeout: 15000 });

    // ── 4. Confirm import ─────────────────────────────────────────────────────
    const confirmBtn = page.getByRole("button", { name: /confirmar importaci|confirm import/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Success toast
    await expect(page.getByText(/importaci.*confirmada|import.*confirmed/i)).toBeVisible({
      timeout: 12000,
    });

    // ── 5. Verify batch appears in history ───────────────────────────────────
    const historySection = page.getByText(/historial de importaciones|import history/i);
    await expect(historySection).toBeVisible();
    await expect(page.getByText("santander-sample.csv")).toBeVisible({ timeout: 8000 });

    // ── 6. Rollback the import ───────────────────────────────────────────────
    const rollbackBtn = page.getByRole("button", { name: /deshacer|rollback/i }).first();
    await expect(rollbackBtn).toBeVisible({ timeout: 5000 });
    await rollbackBtn.click();

    // Rollback success: status badge should change to rolled_back / deshecho
    await expect(page.getByText(/deshecho|rolled.back/i)).toBeVisible({ timeout: 10000 });
  });
});

// ─── Duplicate detection ─────────────────────────────────────────────────────

test.describe("Imports — duplicate detection", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToImports(page);
  });

  test("re-uploading same CSV shows duplicate flags after second preview", async ({ page }) => {
    // Upload and confirm once so data exists in DB
    await page.locator('input[type="file"]').setInputFiles(FIXTURE_CSV);
    await expect(page.getByText(/santander/i)).toBeVisible({ timeout: 8000 });

    const accountSelect = page.locator("#import-account");
    await expect(accountSelect.locator("option")).not.toHaveCount(1, { timeout: 8000 });
    await accountSelect.selectOption({ index: 1 });

    await page.getByRole("button", { name: /pre-importar|preview/i }).click();
    await expect(page.getByText(/SUPERMERCADO|NOMINA|CARREFOUR/i)).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /confirmar importaci|confirm import/i }).click();
    await expect(page.getByText(/importaci.*confirmada|import.*confirmed/i)).toBeVisible({
      timeout: 12000,
    });

    // ── Now re-upload the same file and preview again ─────────────────────────
    await page.locator('input[type="file"]').setInputFiles(FIXTURE_CSV);
    await expect(page.getByText(/santander/i)).toBeVisible({ timeout: 8000 });
    await accountSelect.selectOption({ index: 1 });

    await page.getByRole("button", { name: /pre-importar|preview/i }).click();

    // Duplicate flag should appear (at least one row marked as possible duplicate)
    await expect(page.getByText(/posible duplicado|possible duplicate|duplicate/i)).toBeVisible({
      timeout: 15000,
    });

    // ── Rollback first import to clean up ─────────────────────────────────────
    const rollbackBtns = page.getByRole("button", { name: /deshacer|rollback/i });
    await expect(rollbackBtns.first()).toBeVisible({ timeout: 5000 });
    await rollbackBtns.first().click();
    await expect(page.getByText(/deshecho|rolled.back/i)).toBeVisible({ timeout: 10000 });
  });
});
