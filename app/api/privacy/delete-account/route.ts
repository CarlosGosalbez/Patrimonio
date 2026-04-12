import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

/**
 * DELETE /api/privacy/delete-account
 * Permanently deletes user account and all associated data (GDPR Article 17 — Right to erasure)
 *
 * Security requirements:
 * - Password confirmation required
 * - Cannot be undone (cascades via ON DELETE CASCADE foreign keys)
 * - Deletes user from auth.users → triggers cascade to all user_id FKs
 *
 * Cascading deletion affects:
 * - profiles, user_preferences
 * - accounts, transactions, categories
 * - budgets, investments, investment_operations
 * - recurring_commitments, custom_alerts
 * - auto_categorization_rules, notifications
 * - Supabase Storage files in avatars bucket
 */

const DeleteAccountSchema = z
  .object({
    password: z.string().min(1, "Password required for confirmation"),
    confirmation: z.string().refine((val) => val === "ELIMINAR", {
      message: 'Must type "ELIMINAR" to confirm',
    }),
  })
  .strict();

export async function DELETE(req: Request) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Validate input
  const body = await req.json();
  const parsed = DeleteAccountSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { password } = parsed.data;

  try {
    // Re-authenticate to verify password (security critical)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (signInError) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    // Delete avatar files from Storage before account deletion
    try {
      const { data: files } = await supabase.storage.from("avatars").list(user.id);
      if (files && files.length > 0) {
        const filePaths = files.map((f: { name: string }) => `${user.id}/${f.name}`);
        await supabase.storage.from("avatars").remove(filePaths);
      }
    } catch (storageError) {
      console.error("Storage cleanup error (non-blocking):", storageError);
    }

    // Delete user via Edge Function (uses service_role key on the server)
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-user-account`;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return NextResponse.json({ error: "Session expired, please sign in again" }, { status: 401 });
    }

    const edgeResponse = await fetch(edgeFunctionUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!edgeResponse.ok) {
      const body = await edgeResponse.json().catch(() => ({}));
      console.error("Edge Function deletion error:", body);
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    // Account fully deleted — invalidate remaining session cookie
    await supabase.auth.signOut();

    return NextResponse.json({ message: "Account permanently deleted" }, { status: 200 });
  } catch (error) {
    Sentry.captureException(error);
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
