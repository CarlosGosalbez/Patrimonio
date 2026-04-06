import { expect, test, type Page } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://localhost:3000'
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? 'test@patrimio.app'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'TestPatrimio!2026'

async function loginAndNavigateToInvestments(page: Page) {
  await page.goto(`${BASE}/login`)
  await page.getByLabel(/correo|email/i).fill(TEST_EMAIL)
  await page.getByLabel(/contraseña|password/i).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /iniciar sesión|sign in/i }).click()
  await page.waitForURL(/dashboard/, { timeout: 15_000 })
  await page.goto(`${BASE}/investments`)
  await expect(page.getByRole('heading', { name: /inversiones|investments/i })).toBeVisible({
    timeout: 10_000,
  })
}

test.describe('Investments — auth guard', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto(`${BASE}/investments`)
    await expect(page).toHaveURL(/login/, { timeout: 8_000 })
  })
})

test.describe('Investments — smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToInvestments(page)
  })

  test('renders the investments workspace', async ({ page }) => {
    await expect(page.getByRole('button', { name: /nueva posición|new position/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /exportar excel|export excel/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /cartera|portfolio/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /operaciones|operations/i })).toBeVisible()
  })
})
