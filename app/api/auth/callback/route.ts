import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Validates `next` to prevent open-redirect attacks
function safeRedirectPath(raw: string | null, fallback = "/dashboard"): string {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("://")) {
    return trimmed;
  }
  return fallback;
}

/**
 * Supabase email confirmation callback.
 * Handles: email verification, password reset, OAuth (if added later).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // 'email', 'recovery', 'invite'
  const next = safeRedirectPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Do NOT include error.message in the redirect URL to avoid leaking internal details
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // Password reset → go to reset-password page so user can enter new password
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
