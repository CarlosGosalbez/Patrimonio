import { test, expect, type Page } from "@playwright/test";

/**
 * Auth E2E tests — Phase 1
 * Covers: register, login, forgot password, 2FA page visibility
 *
 * Uses test accounts: these must NOT exist in the real DB at test time.
 * For CI: set TEST_USER_EMAIL + TEST_USER_PASSWORD env vars.
 */

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? `e2e+${Date.now()}@example.com`;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "Test_Patrimio!2025#";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function goToLogin(page: Page) {
  await page.goto(`${BASE}/login`);
  await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible();
}

// ─── Login page ───────────────────────────────────────────────────────────────

test.describe("Login page", () => {
  test("renders login form", async ({ page }) => {
    await goToLogin(page);
    await expect(page.getByLabel(/correo/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeVisible();
  });

  test("shows validation errors on empty submit", async ({ page }) => {
    await goToLogin(page);
    await page.getByRole("button", { name: /iniciar sesión/i }).click();
    await expect(page.getByText(/correo/i)).toBeVisible();
  });

  test("shows error on wrong credentials", async ({ page }) => {
    await goToLogin(page);
    await page.getByLabel(/correo/i).fill("nobody@example.com");
    await page.getByLabel(/contraseña/i).fill("WrongPass!2025");
    await page.getByRole("button", { name: /iniciar sesión/i }).click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 8000 });
  });

  test("has link to register", async ({ page }) => {
    await goToLogin(page);
    const link = page.getByRole("link", { name: /crear cuenta/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/register/);
  });

  test("has link to forgot password", async ({ page }) => {
    await goToLogin(page);
    const link = page.getByRole("link", { name: /olvidaste/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/forgot-password/);
  });
});

// ─── Register page ─────────────────────────────────────────────────────────────

test.describe("Register page", () => {
  test("renders register form", async ({ page }) => {
    await page.goto(`${BASE}/register`);
    await expect(page.getByLabel(/correo/i)).toBeVisible();
    await expect(page.getByLabel(/^contraseña$/i)).toBeVisible();
    await expect(page.getByLabel(/confirmar/i)).toBeVisible();
  });

  test("shows password strength meter on input", async ({ page }) => {
    await page.goto(`${BASE}/register`);
    const pwdInput = page.getByLabel(/^contraseña$/i);
    await pwdInput.fill("abc");
    await expect(
      page
        .locator('[data-testid="password-strength"]')
        .or(page.locator(".bg-red-500, .bg-orange-500")),
    ).toBeVisible({ timeout: 3000 });
  });

  test("rejects weak password", async ({ page }) => {
    await page.goto(`${BASE}/register`);
    await page.getByLabel(/correo/i).fill("test@example.com");
    await page.getByLabel(/^contraseña$/i).fill("password");
    await page.getByLabel(/confirmar/i).fill("password");
    await page.getByRole("button", { name: /crear cuenta/i }).click();
    await expect(page.getByText(/12 caracteres|mayúscula|número|especial/i)).toBeVisible();
  });

  test("rejects mismatched passwords", async ({ page }) => {
    await page.goto(`${BASE}/register`);
    await page.getByLabel(/correo/i).fill("test@example.com");
    await page.getByLabel(/^contraseña$/i).fill("SecurePass!2025");
    await page.getByLabel(/confirmar/i).fill("DifferentPass!2025");
    await page.getByRole("button", { name: /crear cuenta/i }).click();
    await expect(page.getByText(/no coinciden/i)).toBeVisible();
  });
});

// ─── Forgot password page ─────────────────────────────────────────────────────

test.describe("Forgot password page", () => {
  test("renders forgot password form", async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`);
    await expect(page.getByLabel(/correo/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /enviar/i })).toBeVisible();
  });

  test("shows success state regardless of whether email exists (anti-enumeration)", async ({
    page,
  }) => {
    await page.goto(`${BASE}/forgot-password`);
    await page.getByLabel(/correo/i).fill("nonexistent@example.com");
    await page.getByRole("button", { name: /enviar/i }).click();
    // Should show success, not an error about email not existing
    await expect(page.getByText(/enviado|revisa tu correo|si existe/i)).toBeVisible({
      timeout: 8000,
    });
  });
});

// ─── Route protection ─────────────────────────────────────────────────────────

test.describe("Route protection", () => {
  test("redirects unauthenticated user to login when accessing dashboard", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });

  test("redirects unauthenticated user to login when accessing settings", async ({ page }) => {
    await page.goto(`${BASE}/settings/security`);
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });

  test("root path redirects to login when unauthenticated", async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveURL(/login|dashboard/, { timeout: 5000 });
  });
});

// ─── Two factor page ──────────────────────────────────────────────────────────

test.describe("Two factor page", () => {
  test("renders verification form", async ({ page }) => {
    await page.goto(`${BASE}/two-factor`);
    await expect(page.getByText(/verificación en dos pasos/i)).toBeVisible();
  });

  test("can switch to recovery code mode", async ({ page }) => {
    await page.goto(`${BASE}/two-factor`);
    await page.getByText(/código de recuperación/i).click();
    await expect(page.getByText(/16 caracteres/i)).toBeVisible();
  });
});
