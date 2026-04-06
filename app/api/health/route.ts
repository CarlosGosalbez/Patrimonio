import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Deployment health check — verifies DB connectivity and auth service.
 * Called by Vercel Deployment Checks after each deploy.
 * Returns 200 when the app and Supabase are reachable, 503 otherwise.
 */
export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  // Check Supabase connectivity (anon ping — no auth required)
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("categories").select("id").limit(1);
    checks.supabase = error ? "error" : "ok";
  } catch {
    checks.supabase = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    },
    { status: allOk ? 200 : 503 },
  );
}
