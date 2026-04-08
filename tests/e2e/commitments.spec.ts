import { expect, test, type Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "test@patrimio.app";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "TestPatrimio!2026";

async function loginAndNavigateToCommitments(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/correo|email/i).fill(TEST_EMAIL);
  await page.getByLabel(/contraseña|password/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /iniciar sesión|sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15_000 });
  await page.goto(`${BASE}/commitments`);
  await expect(page.getByRole("heading", { name: /compromisos|commitments/i })).toBeVisible({
    timeout: 10_000,
  });
}

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------
test.describe("Commitments — auth guard", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto(`${BASE}/commitments`);
    await expect(page).toHaveURL(/login/, { timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Smoke
// ---------------------------------------------------------------------------
test.describe("Commitments — smoke", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToCommitments(page);
  });

  test("renders the commitments page with the new commitment button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /nuevo compromiso|new commitment/i }),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Create — utility type (luz/agua)
// ---------------------------------------------------------------------------
test.describe("Commitments — create utility (luz/agua)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToCommitments(page);
  });

  test("opens the commitment dialog and can fill a utility commitment", async ({ page }) => {
    // Open dialog
    await page.getByRole("button", { name: /nuevo compromiso|new commitment/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Select utility type
    const typeSelect = dialog.getByRole("combobox", { name: /tipo|type/i });
    await typeSelect.selectOption("utility");

    // Fill name
    const nameInput = dialog.getByLabel(/nombre|name/i);
    await nameInput.fill("Luz Iberdrola");

    // Amount — should show variable hint
    const amountInput = dialog.getByLabel(/importe|amount/i);
    await amountInput.fill("85,00");
    // The variable hint should be visible for utility type
    await expect(dialog.getByText(/importe puede variar|amount may vary/i)).toBeVisible();

    // Date hint — approximate date hint should appear for utility type
    await expect(
      dialog.getByText(/no tienen fecha fija|don't have a fixed due date/i),
    ).toBeVisible();

    // Frequency
    const freqSelect = dialog.getByRole("combobox", { name: /frecuencia|frequency/i });
    await freqSelect.selectOption("monthly");

    // Account selector should be visible
    await expect(dialog.getByRole("combobox", { name: /cuenta|account/i })).toBeVisible();

    // "Nueva cuenta" button must always be visible (even when accounts exist)
    await expect(dialog.getByRole("button", { name: /nueva cuenta|new account/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Edit — date pre-fill regression
// ---------------------------------------------------------------------------
test.describe("Commitments — edit date format regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToCommitments(page);
  });

  test("existing commitment shows date pre-filled in YYYY-MM-DD format", async ({ page }) => {
    // Open the first edit button if any commitment exists
    const editButton = page.getByRole("button", { name: /editar|edit/i }).first();
    const hasCommitments = await editButton.isVisible({ timeout: 5_000 }).catch(() => false);

    test.skip(!hasCommitments, "No commitments available to test edit flow");

    await editButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // The date input must contain a value in YYYY-MM-DD format (not ISO timestamp)
    const dateInput = dialog.locator('input[type="date"]').first();
    const dateValue = await dateInput.inputValue();
    // Must match YYYY-MM-DD (no time component)
    expect(dateValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Must NOT contain 'T' (ISO timestamp)
    expect(dateValue).not.toContain("T");
  });
});
