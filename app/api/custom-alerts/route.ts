import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCustomAlert } from "@/lib/alerts/mutations";
import { getCustomAlertsPageData } from "@/lib/alerts/server";
import { customAlertInputSchema } from "@/lib/alerts/schemas";
import { parseJsonBody } from "@/lib/http/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const overview = await getCustomAlertsPageData({
      supabase,
      userId: user.id,
    });

    return NextResponse.json(overview);
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 500 },
    );
  }
}

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

  const parsed = customAlertInputSchema.safeParse(body.data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json({ error: firstIssue?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const alert = await createCustomAlert({
      input: parsed.data,
      supabase,
      userId: user.id,
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 400 },
    );
  }
}
