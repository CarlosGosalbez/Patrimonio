/**
 * Unit tests for the market-updater cron route.
 * Tests: auth guard, env var validation, successful proxying,
 * edge function failure handling.
 *
 * The cron route delegates to the Supabase Edge Function — no Yahoo/AV/FMP
 * fallback exists in the Next.js layer (it's inside the Edge Function).
 * These tests validate only what the Next.js route does.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/market-updater/route";

// Store original env and restore after each test
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-cron-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

function makeRequest(authHeader?: string) {
  return new NextRequest("http://localhost/api/cron/market-updater", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/market-updater — auth guard", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when Authorization header has wrong secret", async () => {
    const res = await GET(makeRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when Authorization header has no Bearer prefix", async () => {
    const res = await GET(makeRequest("test-cron-secret"));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cron/market-updater — env var validation", () => {
  it("returns 500 when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.stubGlobal("fetch", vi.fn());

    const res = await GET(makeRequest("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Missing");
  });

  it("returns 500 when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.stubGlobal("fetch", vi.fn());

    const res = await GET(makeRequest("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/cron/market-updater — successful invocation", () => {
  it("calls Supabase Edge Function with correct headers and returns 200", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ updated: 5 }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await GET(makeRequest("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toMatchObject({ updated: 5 });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/functions/v1/market-updater"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("Bearer test-service-role-key"),
        }),
      }),
    );
  });

  it("returns 500 when Edge Function responds with error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
        text: async () => "Service Unavailable",
      }),
    );

    const res = await GET(makeRequest("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("handles Edge Function throwing a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network timeout")));

    await expect(GET(makeRequest("Bearer test-cron-secret"))).rejects.toThrow("Network timeout");
  });
});
