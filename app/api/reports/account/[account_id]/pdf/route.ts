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

  // PDF generation requires @react-pdf/renderer which is not yet installed.
  // Use the Excel endpoint as alternative.
  return new NextResponse(
    JSON.stringify({
      error: "PDF export not yet available",
      alternative: `/api/reports/account/${account_id}/excel`,
    }),
    {
      status: 501,
      headers: {
        "Content-Type": "application/json",
        "X-Alternative-Format": "xlsx",
        "X-Alternative-Url": `/api/reports/account/${account_id}/excel`,
      },
    },
  );
}
