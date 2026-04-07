import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertAlertsPreferences } from "@/lib/alerts/mutations";
import { alertPreferencesSchema } from "@/lib/alerts/schemas";
import { parseJsonBody } from "@/lib/http/server";

export async function PATCH(request: NextRequest) {
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

  const parsed = alertPreferencesSchema.safeParse(body.data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json({ error: firstIssue?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const preferences = await upsertAlertsPreferences({
      input: parsed.data,
      supabase,
      userId: user.id,
    });

    return NextResponse.json({ preferences });
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 400 },
    );
  }
}
