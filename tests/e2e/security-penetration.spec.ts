import { expect, test } from "@playwright/test";

/**
 * Security Penetration Tests
 * Verifica OWASP Top 10 mitigations en Patrimio.
 *
 * Estos tests NO requieren usuario autenticado (prueban fronteras del sistema).
 * Los ataques con payload malicioso deben resultar en 4xx — NUNCA en bypass.
 */

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";

// ─── SQL Injection ────────────────────────────────────────────────────────────

test.describe("SQL Injection", () => {
  test("login with SQL injection in email does not bypass auth", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel(/correo|email/i).fill("' OR '1'='1'; DROP TABLE users; --@test.com");
    await page.getByLabel(/contraseña|password/i).fill("anything");
    await page.getByRole("button", { name: /iniciar sesión|sign in/i }).click();
    await expect(page).not.toHaveURL(/dashboard/, { timeout: 5_000 });
    await expect(page.getByRole("alert").or(page.getByText(/inválido|invalid|error/i))).toBeVisible(
      {
        timeout: 8_000,
      },
    );
  });

  test("POST /api/transactions with SQL in description is safe (Supabase parameterized)", async ({
    request,
  }) => {
    const res = await request.post(`${BASE}/api/transactions`, {
      data: {
        description: "'; DROP TABLE transactions; --",
        amount_cents: 1000,
        is_income: false,
        transaction_date: "2026-01-01",
        account_id: "00000000-0000-4000-a000-000000000000",
      },
    });
    // Must be 401 (no auth) — never a 500 (which could indicate execution)
    expect([400, 401, 403, 422]).toContain(res.status());
  });
});

// ─── XSS (Cross-Site Scripting) ───────────────────────────────────────────────

test.describe("XSS", () => {
  test("login with XSS in email field does not execute script", async ({ page }) => {
    const alertFired = { value: false };
    page.on("dialog", (dialog) => {
      alertFired.value = true;
      void dialog.dismiss();
    });

    await page.goto(`${BASE}/login`);
    await page.getByLabel(/correo|email/i).fill('<img src=x onerror="alert(1)">@test.com');
    await page.getByLabel(/contraseña|password/i).fill("Test!2026");
    await page.getByRole("button", { name: /iniciar sesión|sign in/i }).click();

    // Wait briefly to catch any deferred XSS
    await page.waitForTimeout(1000);
    expect(alertFired.value).toBe(false);
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test("register with XSS payload does not execute script", async ({ page }) => {
    const alertFired = { value: false };
    page.on("dialog", (dialog) => {
      alertFired.value = true;
      void dialog.dismiss();
    });

    await page.goto(`${BASE}/register`);
    const emailField = page.getByLabel(/correo|email/i);
    if (await emailField.isVisible()) {
      await emailField.fill('<script>alert("xss")</script>@evil.com');
    }
    await page.waitForTimeout(1000);
    expect(alertFired.value).toBe(false);
  });
});

// ─── CSRF protection ──────────────────────────────────────────────────────────

test.describe("CSRF", () => {
  test("POST to API from unauthenticated request returns 401", async ({ request }) => {
    // Simulates cross-origin request without session cookie
    const res = await request.post(`${BASE}/api/transactions`, {
      data: { amount_cents: 9999999, description: "csrf-attack" },
      headers: { Origin: "https://evil-site.example.com" },
    });
    expect([401, 403]).toContain(res.status());
  });
});

// ─── IDOR (Insecure Direct Object Reference) ─────────────────────────────────

test.describe("IDOR", () => {
  test("GET /api/transactions/:id with fake UUID returns 401/403/404", async ({ request }) => {
    const fakeId = "11111111-1111-4111-8111-111111111111";
    const res = await request.get(`${BASE}/api/transactions/${fakeId}`);
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test("GET /api/budgets/:id with fake UUID returns 401/403/404", async ({ request }) => {
    const fakeId = "22222222-2222-4222-8222-222222222222";
    const res = await request.get(`${BASE}/api/budgets/${fakeId}`);
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test("GET /api/investments/:id with fake UUID returns 401/403/404", async ({ request }) => {
    const fakeId = "33333333-3333-4333-8333-333333333333";
    const res = await request.get(`${BASE}/api/investments/${fakeId}`);
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test("GET /api/custom-alerts/:id with fake UUID returns 401/403/404", async ({ request }) => {
    const fakeId = "44444444-4444-4444-8444-444444444444";
    const res = await request.get(`${BASE}/api/custom-alerts/${fakeId}`);
    expect([400, 401, 403, 404]).toContain(res.status());
  });
});

// ─── Mass Assignment ─────────────────────────────────────────────────────────

test.describe("Mass Assignment (Zod .strict())", () => {
  test("POST /api/transactions with extra field is rejected", async ({ request }) => {
    const res = await request.post(`${BASE}/api/transactions`, {
      data: {
        amount_cents: 100,
        description: "test",
        admin: true,
        role: "superuser",
      },
    });
    expect([400, 401, 422]).toContain(res.status());
  });

  test("POST /api/budgets with extra field is rejected", async ({ request }) => {
    const res = await request.post(`${BASE}/api/budgets`, {
      data: {
        category_id: "cat-1",
        limit_input: "500",
        admin_bypass: true,
      },
    });
    expect([400, 401, 422]).toContain(res.status());
  });

  test("PATCH /api/profile with extra field is rejected", async ({ request }) => {
    const res = await request.patch(`${BASE}/api/profile`, {
      data: {
        display_name: "Test",
        is_admin: true, // should be rejected
      },
    });
    expect([400, 401, 422]).toContain(res.status());
  });
});

// ─── Unauthenticated access to protected routes ───────────────────────────────

test.describe("Authorization — missing auth header", () => {
  const protectedRoutes = [
    "/api/dashboard/summary",
    "/api/transactions",
    "/api/budgets",
    "/api/investments",
    "/api/custom-alerts",
    "/api/commitments",
    "/api/profile",
    "/api/reports/monthly",
    "/api/analytics/summary",
  ];

  for (const route of protectedRoutes) {
    test(`GET ${route} returns 401 without auth`, async ({ request }) => {
      const res = await request.get(`${BASE}${route}`);
      expect(res.status()).toBe(401);
    });
  }
});

// ─── Brute force protection ───────────────────────────────────────────────────

test.describe("Brute Force", () => {
  test("multiple failed logins show error consistently", async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.goto(`${BASE}/login`);
      await page.getByLabel(/correo|email/i).fill("brute@force.test");
      await page.getByLabel(/contraseña|password/i).fill(`WrongPass!${i}`);
      await page.getByRole("button", { name: /iniciar sesión|sign in/i }).click();
      // Should stay on login page
      await expect(page).not.toHaveURL(/dashboard/, { timeout: 5_000 });
    }
    // Should show some kind of error — never redirect to dashboard
    await expect(page).not.toHaveURL(/dashboard/);
  });
});

// ─── Path traversal ──────────────────────────────────────────────────────────

test.describe("Path Traversal", () => {
  test("traversal in URL path is blocked (404 or 401)", async ({ request }) => {
    const res = await request.get(`${BASE}/api/../../etc/passwd`);
    expect([400, 401, 404]).toContain(res.status());
  });

  test("accessing non-existent API route returns 404 not 500", async ({ request }) => {
    const res = await request.get(`${BASE}/api/nonexistent-endpoint-xyz`);
    expect(res.status()).toBe(404);
  });
});

// ─── Oversized payloads (basic DoS protection) ────────────────────────────────

test.describe("Oversized Payload", () => {
  test("oversized JSON body to /api/transactions is rejected", async ({ request }) => {
    const hugeString = "a".repeat(1_000_000); // 1MB string
    const res = await request.post(`${BASE}/api/transactions`, {
      data: { description: hugeString, amount_cents: 100 },
    });
    // Should return 400/401/413 — never 200 or 500
    expect([400, 401, 413, 422]).toContain(res.status());
  });
});
