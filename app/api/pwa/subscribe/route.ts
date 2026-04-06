// app/api/pwa/subscribe/route.ts — Save/remove push subscription
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const SubscribeSchema = z
  .object({
    endpoint: z.string().url().max(2048),
    p256dh: z.string().min(1).max(500),
    auth_key: z.string().min(1).max(500),
    user_agent: z.string().max(500).optional(),
    device_label: z.string().max(100).optional(),
  })
  .strict();

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const parsed = SubscribeSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { endpoint, p256dh, auth_key, user_agent, device_label } = parsed.data;

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

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const { endpoint } = (await req.json()) as { endpoint?: string };
  if (!endpoint || typeof endpoint !== "string")
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });

  const { error: dbError } = await supabase
    .from("push_subscriptions")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
