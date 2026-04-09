import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: { params: Promise<{ account_id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { account_id } = await params;

  // TODO: Implement with xlsx library
  // For now, return CSV stub
  const csv = `Account Report\nAccount ID: ${account_id}\nGenerated: ${new Date().toISOString()}\n\nNote: Excel generation not yet implemented.`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="account-${account_id}-report.csv"`,
    },
  });
}
