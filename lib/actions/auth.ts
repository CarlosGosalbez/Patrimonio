"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

// Validate `next` to prevent open redirect (must be a real relative path)
function safeRedirectPath(raw: unknown, fallback = "/dashboard"): string {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  // Must start with / and NOT with // (protocol-relative) or contain ://
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("://")) {
    return trimmed;
  }
  return fallback;
}

const LoginActionSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
    next: z.string().optional(),
  })
  .strict();

export type LoginActionResult = { error: string } | null;

/**
 * Server Action for login — sets session cookies on the server before redirect,
 * eliminating the race condition where middleware couldn't see the new cookies.
 */
export async function loginAction(formData: FormData): Promise<LoginActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? "/dashboard",
  };

  const parsed = LoginActionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "credentialsError" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Return generic message — never expose exact Supabase error details
    return { error: "credentialsError" };
  }

  // MFA required (session not established yet, need second factor)
  if (data.session === null && data.user) {
    redirect("/two-factor");
  }

  // Check Authenticator Assurance Level for already-enrolled TOTP
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData?.nextLevel === "aal2" && aalData.currentLevel !== aalData.nextLevel) {
    redirect("/two-factor");
  }

  // Server-side redirect — cookies are set in the response before the browser follows it.
  // This eliminates the race condition where middleware couldn't see fresh session cookies.
  const destination = safeRedirectPath(parsed.data.next);
  redirect(destination);
}
