// app/api/pwa/subscribe/route.ts — Save/remove push subscription
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/http/server";

const SubscribeSchema = z
  .object({
    endpoint: z.string().url().max(2048),
    p256dh: z.string().min(1).max(500),
    auth_key: z.string().min(1).max(500),
    user_agent: z.string().max(500).optional(),
    device_label: z.string().max(100).optional(),
  })
  .strict();

const UnsubscribeSchema = z.object({ endpoint: z.string().url().max(2048) }).strict();

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const body = await parseJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = SubscribeSchema.safeParse(body.data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json({ error: firstIssue?.message ?? "Invalid input" }, { status: 400 });
  }

  const { endpoint, p256dh, auth_key, user_agent, device_label } = parsed.data;

  try {
    const { error: dbError } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth_key,
        user_agent: user_agent ?? null,
        device_label: device_label ?? null,
        is_active: true,
      },
      { onConflict: "user_id,endpoint" },
    );

    if (dbError)
      return NextResponse.json({ error: dbError.message || "Database error" }, { status: 500 });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const body = await parseJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = UnsubscribeSchema.safeParse(body.data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json({ error: firstIssue?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const { error: dbError } = await supabase
      .from("push_subscriptions")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("endpoint", parsed.data.endpoint);

    if (dbError)
      return NextResponse.json({ error: dbError.message || "Database error" }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 500 },
    );
  }
}
