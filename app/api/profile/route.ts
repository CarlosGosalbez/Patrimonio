import { createClient } from "@/lib/supabase/server";
import { UpdateProfileSchema, type ProfileDisplayData } from "@/lib/profile/types";
import { NextResponse } from "next/server";

/**
 * GET /api/profile
 * Returns current user profile data
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

  // Fetch profile from profiles table
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, date_of_birth, avatar_url, locale, created_at")
    .eq("user_id", user.id)
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const response: ProfileDisplayData = {
    full_name: profile.full_name,
    date_of_birth: profile.date_of_birth,
    avatar_url: profile.avatar_url,
    email: user.email ?? null,
    locale: profile.locale,
    created_at: profile.created_at,
  };

  return NextResponse.json(response);
}

/**
 * PATCH /api/profile
 * Update user profile fields (full_name, date_of_birth, avatar_url)
 */
export async function PATCH(req: Request) {
  const supabase = await createClient();

  // Auth check: get authenticated user from JWT
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Validate input with Zod (strict mode — rejects unknown fields)
  const body = await req.json();
  const parsed = UpdateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { full_name, date_of_birth, avatar_url } = parsed.data;

  // Update profile (RLS ensures user can only update their own record)
  const { data, error: updateError } = await supabase
    .from("profiles")
    .update({
      full_name: full_name ?? null,
      date_of_birth: date_of_birth ?? null,
      avatar_url: avatar_url ?? null,
    })
    .eq("user_id", user.id)
    .select("full_name, date_of_birth, avatar_url, locale, created_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
