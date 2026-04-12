import { createClient } from "@/lib/supabase/server";
import { PreferencesSchema, DEFAULT_PREFERENCES } from "@/lib/preferences/types";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database";
import * as Sentry from "@sentry/nextjs";

type UserPreferencesRow = Database["public"]["Tables"]["user_preferences"]["Row"];

/**
 * GET /api/preferences
 * Fetch user preferences for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Fetch preferences
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      // If no preferences exist, create defaults
      if (error.code === "PGRST116") {
        const { data: newPrefs, error: insertError } = await supabase
          .from("user_preferences")
          .insert({
            user_id: user.id,
            ...DEFAULT_PREFERENCES,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating default preferences:", insertError);
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json(newPrefs);
      }

      console.error("Error fetching preferences:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    Sentry.captureException(error);
    console.error("Unexpected error in GET /api/preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/preferences
 * Update user preferences for the authenticated user
 */
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse and validate input
    const body = await req.json();
    const result = PreferencesSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.flatten() },
        { status: 400 },
      );
    }

    // Update preferences
    const { data, error } = await supabase
      .from("user_preferences")
      .update(result.data)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating preferences:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    Sentry.captureException(error);
    console.error("Unexpected error in PATCH /api/preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
