import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateCategorySchema, UpdateCategorySchema } from "@/lib/categories/types";
import { handleApiError } from "@/lib/errors/api-error-handler";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type");

  try {
    let query = supabase
      .from("categories")
      .select("id,name,color,icon,is_income,user_id,parent_id,sort_order")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (type === "income") {
      query = query.eq("is_income", true);
    }

    if (type === "expense") {
      query = query.eq("is_income", false);
    }

    const { data, error: dbError } = await query;

    if (dbError) {
      return NextResponse.json({ error: dbError.message || "Database error" }, { status: 500 });
    }

    // Add is_system flag
    const categories = (data ?? []).map((cat) => ({
      ...cat,
      is_system: cat.user_id === null,
    }));

    return NextResponse.json({ categories });
  } catch (routeError) {
    return handleApiError({
      error: routeError,
      message: "Error al obtener las categorías",
      statusCode: 500,
      context: { type },
    });
  }
}

/**
 * POST /api/categories
 * Create a new user category
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
  const parsed = CreateCategorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      ...parsed.data,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return handleApiError({
      error,
      message: "Error al crear la categoría",
      statusCode: 500,
      context: { categoryData: parsed.data },
    });
  }

  return NextResponse.json({ ...data, is_system: false }, { status: 201 });
}

/**
 * PATCH /api/categories
 * Update a user category
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing category id" }, { status: 400 });
  }

  const parsed = UpdateCategorySchema.safeParse(updates);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    );
  }

  // Only allow updating user's own categories (RLS enforces this too)
  const { data, error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return handleApiError({
      error,
      message: "Error al actualizar la categoría",
      statusCode: 500,
      context: { categoryId: id },
    });
  }

  return NextResponse.json({ ...data, is_system: false });
}

/**
 * DELETE /api/categories?id=uuid
 * Soft delete a user category
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing category id" }, { status: 400 });
  }

  // Soft delete
  const { error } = await supabase
    .from("categories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return handleApiError({
      error,
      message: "Error al eliminar la categoría",
      statusCode: 500,
      context: { categoryId: id },
    });
  }

  return new Response(null, { status: 204 });
}
