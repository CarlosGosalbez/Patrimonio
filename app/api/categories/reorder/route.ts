import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ReorderCategoriesSchema } from "@/lib/categories/types";

/**
 * POST /api/categories/reorder
 * Bulk update sort_order for drag-drop reordering
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const parsed = ReorderCategoriesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    );
  }

  // Update each category in sequence
  // (Could optimize with RPC function if performance becomes an issue)
  const updates = parsed.data.updates;
  const errors = [];

  for (const update of updates) {
    const { error } = await supabase
      .from("categories")
      .update({
        sort_order: update.sort_order,
        ...(update.parent_id !== undefined && { parent_id: update.parent_id }),
      })
      .eq("id", update.id)
      .eq("user_id", user.id); // Only update user's own categories

    if (error) {
      errors.push({ id: update.id, error: error.message });
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: "Some updates failed", details: errors }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
