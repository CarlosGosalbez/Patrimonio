import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type ServerClient = SupabaseClient<Database>;

export async function ensureUserProfile(supabase: ServerClient, userId: string) {
  const existing = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data) {
    return existing.data;
  }

  const inserted = await supabase
    .from("profiles")
    .insert({ user_id: userId } as never)
    .select("*")
    .single();

  if (inserted.error || !inserted.data) {
    throw new Error(inserted.error?.message ?? "Could not create profile");
  }

  return inserted.data;
}
