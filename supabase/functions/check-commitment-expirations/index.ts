import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * check-commitment-expirations
 * Daily cron function that detects expired commitments that still have
 * recent transactions, and creates a notification for the user to review.
 */

Deno.serve(async (req: Request) => {
  // Only allow POST or scheduled invocations from Supabase cron
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // 1. Fetch all expired commitments (end_date < TODAY and not already dismissed)
  const { data: expiredCommitments, error: commitmentError } = await supabase
    .from("recurring_commitments")
    .select("id, user_id, name, amount_cents")
    .lt("end_date", today)
    .eq("is_active", true)
    .is("deleted_at", null)
    .eq("expiration_alert_dismissed", false);

  if (commitmentError) {
    console.error("[check-commitment-expirations] fetch error:", commitmentError.message);
    return new Response(JSON.stringify({ error: commitmentError.message }), { status: 500 });
  }

  if (!expiredCommitments || expiredCommitments.length === 0) {
    return new Response(JSON.stringify({ checked: 0 }), { status: 200 });
  }

  let notificationsCreated = 0;

  for (const commitment of expiredCommitments) {
    // 2. Check if there are recent transactions linked to this commitment
    const { data: recentTransactions } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", commitment.user_id)
      .eq("commitment_id", commitment.id)
      .gte("date", thirtyDaysAgo)
      .is("deleted_at", null)
      .limit(1);

    if (!recentTransactions || recentTransactions.length === 0) {
      continue;
    }

    // 3. Avoid duplicate notifications — skip if one already exists for this commitment in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existingNotif } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", commitment.user_id)
      .eq("reference_id", commitment.id)
      .eq("type", "commitment_expired")
      .gte("created_at", sevenDaysAgo)
      .limit(1);

    if (existingNotif && existingNotif.length > 0) {
      continue;
    }

    // 4. Create notification
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: commitment.user_id,
      type: "commitment_expired",
      severity: "warning",
      title: `Compromiso vencido: ${commitment.name}`,
      body: `El compromiso "${commitment.name}" ha vencido pero sigue apareciendo en tus extractos. ¿Renovaste el contrato?`,
      reference_id: commitment.id,
    });

    if (!notifError) {
      notificationsCreated++;
    }
  }

  return new Response(
    JSON.stringify({
      checked: expiredCommitments.length,
      notifications_created: notificationsCreated,
    }),
    { status: 200 },
  );
});
