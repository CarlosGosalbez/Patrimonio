import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database";
import * as Sentry from "@sentry/nextjs";

const EXPORT_USER_DATA_RPC = "export_user_data" as keyof Database["public"]["Functions"];

/**
 * GET /api/privacy/export
 * Exports all user data as JSON (GDPR Article 20 — Data portability)
 *
 * Returns a downloadable JSON file with:
 * - Profile, preferences
 * - Accounts, transactions, categories
 * - Budgets, investments, commitments
 * - Notifications (last 90 days)
 * - Auto-categorization and correlation rules
 */
export async function GET() {
  const supabase = await createClient();

  // Auth check: get authenticated user from JWT
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Call SECURITY DEFINER RPC function
    const { data, error: rpcError } = await supabase.rpc(EXPORT_USER_DATA_RPC, {
      target_user_id: user.id,
    });

    if (rpcError) {
      console.error("Export RPC error:", rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "No data returned" }, { status: 500 });
    }

    // Return as downloadable JSON file
    const fileName = `patrimio-export-${user.id}-${Date.now()}.json`;

    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
