import { NextRequest, NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { confirmImport } from "@/lib/imports/server";
import { confirmImportSchema } from "@/lib/imports/schemas";
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

  const parsed = confirmImportSchema.safeParse(body.data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json({ error: firstIssue?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const t = await getTranslations("imports");
    const result = await confirmImport({
      accountId: parsed.data.account_id as string,
      fileChecksum: parsed.data.file_checksum as string,
      fileName: parsed.data.file_name as string,
      rows: parsed.data.rows as any,
      sourceBank: parsed.data.source_bank as string,
      sourceFormat: parsed.data.source_format as any,
      supabase,
      t,
      userId: user.id,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 400 },
    );
  }
}
