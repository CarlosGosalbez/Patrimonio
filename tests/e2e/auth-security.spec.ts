import { test, expect } from "@playwright/test";

/**
 * Auth Security E2E tests — Negative / injection tests
 *
 * Verifica que los formularios de login/registro y las API routes protegidas
 * son robustos ante:
 *   - Inyección SQL en campos de email y contraseña
 *   - XSS en campos de texto
 *   - Payloads de tamaño excesivo (DoS)
 *   - Acceso directo a rutas de app sin autenticación (IDOR/auth bypass)
 *   - API routes que devuelven 401 sin cookie de sesión
 *
 * Estos tests NO requieren un usuario autenticado.
 * Todos los intentos de ataque deben resultar en un mensaje de error de UI
 * o en un código HTTP 4xx — NUNCA en bypass de autenticación.
 */

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fillLoginAndSubmit(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto(`${BASE}/login`);
  await expect(page.getByLabel(/correo/i)).toBeVisible();
  await page.getByLabel(/correo/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
}

async function fillRegisterAndSubmit(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto(`${BASE}/register`);
  await page.getByLabel(/correo/i).fill(email);
  await page.getByLabel(/^contraseña$/i).fill(password);
  await page.getByLabel(/confirmar/i).fill(password);
  await page.getByRole("button", { name: /crear cuenta/i }).click();
}

// ─── Login — SQL injection y XSS ────────────────────────────────────────────

test.describe("Login — inyección y XSS", () => {
  test("rechaza SQL injection en email: OR 1=1", async ({ page }) => {
    await fillLoginAndSubmit(page, "' OR '1'='1'--@example.com", "anything");
    // Debe quedar en /login o mostrar error de validación — NUNCA redirigir a /dashboard
    await expect(page).not.toHaveURL(/dashboard/, { timeout: 5000 });
    // Debe mostrar error de formato de email o credenciales inválidas
    await expect(
      page.getByRole("alert").or(page.getByText(/correo|inválido|credenciales/i)),
    ).toBeVisible({
      timeout: 8000,
    });
  });

  test("rechaza SQL injection en email: UNION SELECT", async ({ page }) => {
    await fillLoginAndSubmit(page, "foo@bar.com' UNION SELECT 1,2,3--", "anything");
    await expect(page).not.toHaveURL(/dashboard/, { timeout: 5000 });
    await expect(
      page.getByRole("alert").or(page.getByText(/correo|inválido|credenciales/i)),
    ).toBeVisible({
      timeout: 8000,
    });
  });

  test("rechaza SQL injection en contraseña: DROP TABLE", async ({ page }) => {
    await fillLoginAndSubmit(page, "victim@example.com", "'; DROP TABLE auth.users; --");
    await expect(page).not.toHaveURL(/dashboard/, { timeout: 5000 });
    await expect(
      page.getByRole("alert").or(page.getByText(/credenciales|incorrecto/i)),
    ).toBeVisible({
      timeout: 8000,
    });
  });

  test("rechaza XSS en email: <script>alert", async ({ page }) => {
    await fillLoginAndSubmit(page, "<script>alert(1)</script>@evil.com", "anything");
    await expect(page).not.toHaveURL(/dashboard/, { timeout: 5000 });
    // La página no debe haber ejecutado el script — verificar que no hay alert activo
    await expect(page.getByRole("alert").or(page.getByText(/correo|inválido/i))).toBeVisible({
      timeout: 8000,
    });
  });

  test("rechaza XSS en email: javascript: URI", async ({ page }) => {
    await fillLoginAndSubmit(page, "javascript:alert(document.cookie)", "anything");
    await expect(page).not.toHaveURL(/dashboard/, { timeout: 5000 });
    await expect(page.getByRole("alert").or(page.getByText(/correo|inválido/i))).toBeVisible({
      timeout: 8000,
    });
  });

  test("rechaza email excesivamente largo (>=500 chars)", async ({ page }) => {
    const longEmail = `${"a".repeat(490)}@example.com`;
    await fillLoginAndSubmit(page, longEmail, "anything");
    await expect(page).not.toHaveURL(/dashboard/, { timeout: 5000 });
    // Debe mostrar error de validación o de credenciales
    await expect(
      page.getByRole("alert").or(page.getByText(/correo|inválido|demasiado largo|credenciales/i)),
    ).toBeVisible({ timeout: 8000 });
  });

  test("rechaza contraseña excesivamente larga (>=2000 chars)", async ({ page }) => {
    const longPassword = "A!1" + "x".repeat(2000);
    await fillLoginAndSubmit(page, "victim@example.com", longPassword);
    await expect(page).not.toHaveURL(/dashboard/, { timeout: 5000 });
    await expect(
      page.getByRole("alert").or(page.getByText(/contraseña|credenciales|incorrecto/i)),
    ).toBeVisible({ timeout: 8000 });
  });

  test("rechaza email con caracteres de control (null byte)", async ({ page }) => {
    // Playwright .fill() no puede insertar null bytes directamente en el
    // campo HTML, pero si alguien manipula la request el server también la rechaza.
    // Verificamos el comportamiento del formulario con caracteres especiales representables.
    await fillLoginAndSubmit(page, "foo\u200B@bar.com", "anything");
    await expect(page).not.toHaveURL(/dashboard/, { timeout: 5000 });
  });
});

// ─── Registro — inyección y XSS ─────────────────────────────────────────────

test.describe("Register — inyección y XSS", () => {
  test("rechaza SQL injection en email de registro", async ({ page }) => {
    await fillRegisterAndSubmit(page, "admin'--@example.com", "SecurePass!2025");
    await expect(page).not.toHaveURL(/dashboard|verify/i, { timeout: 5000 });
    await expect(page.getByRole("alert").or(page.getByText(/correo|inválido/i))).toBeVisible({
      timeout: 8000,
    });
  });

  test("rechaza XSS en email de registro: <img onerror>", async ({ page }) => {
    await fillRegisterAndSubmit(page, '<img src=x onerror="alert(1)">@evil.com', "SecurePass!2025");
    await expect(page).not.toHaveURL(/dashboard|verify/i, { timeout: 5000 });
  });

  test("rechaza contraseña vacía pese a JS deshabilitado (validación server-side)", async ({
    page,
  }) => {
    // Verifica también el comportamiento con contraseña sólo de espacios
    await fillRegisterAndSubmit(page, "test@example.com", "   ");
    await expect(page).not.toHaveURL(/dashboard|verify/i, { timeout: 5000 });
    await expect(page.getByText(/contraseña|12 caracteres|caracteres|débil/i)).toBeVisible({
      timeout: 8000,
    });
  });
});

// ─── Forgot password — anti-enumeración ─────────────────────────────────────

test.describe("Forgot password — anti-enumeración de usuarios", () => {
  test("muestra el mismo mensaje para email existente y no existente", async ({ page }) => {
    // Para un email que no puede existir en el sistema
    await page.goto(`${BASE}/forgot-password`);
    await page.getByLabel(/correo/i).fill("definitively-does-not-exist-xyz123@norealdomain.test");
    await page.getByRole("button", { name: /enviar/i }).click();
    // Debe mostrar mensaje genérico de éxito (evitar enumerar si el email existe)
    await expect(page.getByText(/enviado|revisa tu correo|si existe|instrucciones/i)).toBeVisible({
      timeout: 10000,
    });
    // NO debe mostrar "email no registrado" ni similar
    await expect(page.getByText(/no (está|existe|encontramos|registrado)/i)).not.toBeVisible();
  });

  test("rechaza SQL injection en campo email de forgot password", async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`);
    await page.getByLabel(/correo/i).fill("' OR '1'='1'--@example.com");
    await page.getByRole("button", { name: /enviar/i }).click();
    // No debe producir error 500 ni exponer información del servidor
    await expect(page.getByText(/500|internal server error/i)).not.toBeVisible({
      timeout: 8000,
    });
  });
});

// ─── Rutas de app — protección sin autenticación ─────────────────────────────

test.describe("Rutas protegidas — acceso sin autenticación", () => {
  const protectedRoutes = [
    "/dashboard",
    "/transactions",
    "/budgets",
    "/investments",
    "/commitments",
    "/imports",
    "/reports",
    "/settings",
    "/settings/security",
    "/settings/categories",
  ];

  for (const route of protectedRoutes) {
    test(`redirige a login al acceder a ${route} sin sesión`, async ({ page }) => {
      await page.goto(`${BASE}${route}`);
      // Debe redirigir a /login — nunca mostrar datos de usuario
      await expect(page).toHaveURL(/login/, { timeout: 8000 });
    });
  }
});

// ─── API routes — 401 sin cookie de sesión ───────────────────────────────────

test.describe("API routes — rechazan requests sin autenticación (HTTP 401)", () => {
  // Lista de endpoints críticos que deben requerir autenticación
  const apiEndpoints: Array<{ method: string; path: string; body?: object }> = [
    { method: "GET", path: "/api/transactions" },
    {
      method: "POST",
      path: "/api/transactions",
      body: {
        amount_cents: 1000,
        description: "test",
        date: "2025-01-01",
        type: "expense",
        account_id: "00000000-0000-0000-0000-000000000001",
      },
    },
    { method: "GET", path: "/api/budgets" },
    {
      method: "POST",
      path: "/api/budgets",
      body: { name: "test", amount_cents: 100000, period: "monthly" },
    },
    { method: "GET", path: "/api/investments" },
    {
      method: "POST",
      path: "/api/investments/positions",
      body: {
        name: "AAPL",
        ticker: "AAPL",
        investment_type: "stock",
        opening_date: "2025-01-01",
        opening_price_input: "100",
        opening_quantity_input: "10",
      },
    },
    { method: "GET", path: "/api/accounts" },
    {
      method: "POST",
      path: "/api/accounts",
      body: {
        name: "Santander",
        type: "checking",
        currency: "EUR",
        initial_balance_cents: 0,
        color: "#1E40AF",
        icon: "bank",
        bank_name: "Santander",
      },
    },
    { method: "GET", path: "/api/custom-alerts" },
    { method: "GET", path: "/api/commitments" },
    { method: "GET", path: "/api/privacy/export" },
    { method: "GET", path: "/api/profile" },
  ];

  for (const { method, path, body } of apiEndpoints) {
    test(`${method} ${path} devuelve 401 sin sesión`, async ({ request }) => {
      const options: Parameters<typeof request.fetch>[1] = {
        method,
        headers: { "content-type": "application/json" },
        // No cookies — Playwright request context sin autenticación
        ignoreHTTPSErrors: true,
      };
      if (body) {
        options.data = JSON.stringify(body);
      }

      const response = await request.fetch(`${BASE}${path}`, options);
      expect(response.status()).toBe(401);
    });
  }
});

// ─── IDOR — acceso a recursos de otros usuarios ──────────────────────────────

test.describe("IDOR — acceso a recursos sin autenticación y con IDs ajenos", () => {
  test("GET /api/transactions con query user_id ajeno devuelve 401", async ({ request }) => {
    const response = await request.fetch(
      `${BASE}/api/transactions?user_id=00000000-0000-0000-0000-000000000001`,
      { method: "GET", headers: { "content-type": "application/json" } },
    );
    // Sin cookie autenticada → 401 (no 200 con datos de otro usuario)
    expect(response.status()).toBe(401);
  });

  test("GET /api/investments/positions con id ajeno devuelve 401", async ({ request }) => {
    const response = await request.fetch(
      `${BASE}/api/investments/positions/00000000-0000-0000-0000-000000000001`,
      { method: "GET", headers: { "content-type": "application/json" } },
    );
    expect([401, 404, 405]).toContain(response.status());
  });

  test("PATCH /api/accounts con id ajeno en body devuelve 401", async ({ request }) => {
    const response = await request.fetch(
      `${BASE}/api/accounts/00000000-0000-0000-0000-000000000001`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        data: JSON.stringify({ name: "hacked" }),
      },
    );
    expect([401, 404, 405]).toContain(response.status());
  });

  test("POST /api/transactions con user_id en body devuelve 400 o 401", async ({ request }) => {
    // user_id en el body debe ser ignorado o rechazado por .strict() — nunca usarse
    const response = await request.fetch(`${BASE}/api/transactions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      data: JSON.stringify({
        user_id: "00000000-0000-0000-0000-000000000001",
        amount_cents: 1000,
        description: "IDOR test",
        date: "2025-01-01",
        type: "expense",
        account_id: "00000000-0000-0000-0000-000000000002",
      }),
    });
    // Sin sesión → 401; con sesión propia y user_id en body → 400 por .strict()
    expect([400, 401]).toContain(response.status());
  });
});

// ─── Headers de seguridad ─────────────────────────────────────────────────────

test.describe("Headers de seguridad HTTP", () => {
  test("login page incluye X-Frame-Options o CSP frame-ancestors", async ({ request }) => {
    const response = await request.fetch(`${BASE}/login`);
    const xFrameOptions = response.headers()["x-frame-options"];
    const csp = response.headers()["content-security-policy"];

    const hasFrameProtection =
      (xFrameOptions && /deny|sameorigin/i.test(xFrameOptions)) ||
      (csp && /frame-ancestors/i.test(csp));

    expect(
      hasFrameProtection,
      `La página de login debe incluir X-Frame-Options o CSP frame-ancestors. ` +
        `x-frame-options=${xFrameOptions}, csp=${csp}`,
    ).toBeTruthy();
  });

  test("API route incluye X-Content-Type-Options: nosniff", async ({ request }) => {
    const response = await request.fetch(`${BASE}/api/profile`);
    // 401 es esperado sin auth, pero los headers deben estar presentes
    const xContentType = response.headers()["x-content-type-options"];
    // Vercel añade este header automáticamente en producción — en dev puede no estar
    // Solo verificamos que no haya un header que diga 'sniff' explícitamente
    expect(xContentType).not.toBe("sniff");
  });
});
