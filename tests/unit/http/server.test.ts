/**
 * tests/unit/http/server.test.ts
 *
 * Tests para lib/http/server.ts: parseJsonBody y dbErrorMessage.
 * Cubre: casos válidos, JSON malformado, body vacío, mensajes de error de DB.
 */
import { describe, expect, it } from "vitest";
import { dbErrorMessage, parseJsonBody } from "@/lib/http/server";

// ---------------------------------------------------------------------------
// parseJsonBody
// ---------------------------------------------------------------------------
describe("parseJsonBody", () => {
  function makeRequest(body: string, contentType = "application/json"): Request {
    return new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": contentType },
      body,
    });
  }

  it("returns { ok: true, data } for valid JSON object", async () => {
    const req = makeRequest('{"amount": 100, "description": "test"}');
    const result = await parseJsonBody(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ amount: 100, description: "test" });
    }
  });

  it("returns { ok: true, data } for valid JSON with nested objects", async () => {
    const req = makeRequest('{"user": {"id": "uuid-1"}, "items": [1, 2, 3]}');
    const result = await parseJsonBody(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((result.data as Record<string, unknown>).user).toEqual({ id: "uuid-1" });
    }
  });

  it("returns { ok: true, data: [] } for valid JSON array", async () => {
    const req = makeRequest("[1, 2, 3]");
    const result = await parseJsonBody(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([1, 2, 3]);
    }
  });

  it("returns { ok: true, data: null } for JSON null", async () => {
    const req = makeRequest("null");
    const result = await parseJsonBody(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });

  it("returns { ok: false, response } for malformed JSON", async () => {
    const req = makeRequest("{invalid json here}");
    const result = await parseJsonBody(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error).toBe("Invalid JSON body");
    }
  });

  it("returns { ok: false, response } for empty body", async () => {
    const req = makeRequest("");
    const result = await parseJsonBody(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it("returns { ok: false, response } for truncated JSON", async () => {
    const req = makeRequest('{"amount": 100,');
    const result = await parseJsonBody(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it("parses JSON string '\"hello\"' as primitive string", async () => {
    const req = makeRequest('"hello"');
    const result = await parseJsonBody(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe("hello");
    }
  });

  it("returns { ok: false } for plain text (not JSON)", async () => {
    const req = makeRequest("just plain text");
    const result = await parseJsonBody(req);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// dbErrorMessage
// ---------------------------------------------------------------------------
describe("dbErrorMessage", () => {
  it("returns error message when present", () => {
    expect(dbErrorMessage({ message: "foreign key constraint" })).toBe("foreign key constraint");
  });

  it("returns fallback for empty string message", () => {
    expect(dbErrorMessage({ message: "" })).toBe("Database error");
  });

  it("returns fallback for whitespace-only message", () => {
    expect(dbErrorMessage({ message: "   " })).toBe("Database error");
  });

  it("returns fallback for null error object", () => {
    expect(dbErrorMessage(null)).toBe("Database error");
  });

  it("returns fallback for undefined error object", () => {
    expect(dbErrorMessage(undefined)).toBe("Database error");
  });

  it("returns fallback for object without message property", () => {
    expect(dbErrorMessage({})).toBe("Database error");
  });

  it("uses custom fallback when provided", () => {
    expect(dbErrorMessage(null, "Custom fallback")).toBe("Custom fallback");
  });

  it("uses custom fallback for empty string message", () => {
    expect(dbErrorMessage({ message: "" }, "Insert failed")).toBe("Insert failed");
  });

  it("trims the message (whitespace around valid message)", () => {
    expect(dbErrorMessage({ message: "  constraint violation  " })).toBe("constraint violation");
  });

  it("returns actual message (not fallback) when non-empty after trim", () => {
    const msg = "duplicate key value violates unique constraint";
    expect(dbErrorMessage({ message: msg })).toBe(msg);
  });

  // Security: DB error messages should NOT leak sensitive info in production
  // This test documents that the function returns raw DB messages — sanitization
  // should be done at the route level before returning to clients
  it("returns raw DB message (caller must sanitize before sending to client)", () => {
    const rawDbMsg = 'ERROR: duplicate key value "users_email_key" (DETAIL: ...internal...)';
    const result = dbErrorMessage({ message: rawDbMsg });
    expect(result).toBe(rawDbMsg);
    // → Reminder: routes should use a generic message for client responses
  });
});
