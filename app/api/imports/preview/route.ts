import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { previewImport } from "@/lib/imports/server";
import { previewImportSchema } from "@/lib/imports/schemas";
import { parseJsonBody } from "@/lib/http/server";
import type { z } from "zod";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = previewImportSchema.safeParse(body.data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json({ error: firstIssue?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const preview = await previewImport({
      accountId: parsed.data.account_id as string,
      rows: parsed.data.rows as any,
      supabase,
      userId: user.id,
    });

    return NextResponse.json(preview);
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 400 },
    );
  }
}
