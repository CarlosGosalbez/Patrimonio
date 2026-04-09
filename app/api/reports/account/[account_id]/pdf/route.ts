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

  // TODO: Implement with @react-pdf/renderer
  // For now, return placeholder
  return new NextResponse("PDF generation not yet implemented. Use Excel export.", {
    status: 501,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
