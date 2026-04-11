// app/api/reports/gdpr/route.ts
// GDPR full data export — Excel multi-sheet with all user data
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGdprExportData } from "@/lib/reports/server";
import { buildGdprExcel } from "@/lib/reports/excel";

// GET /api/reports/gdpr — no query params needed; returns Excel
export async function GET(request: NextRequest) {
  // Suppress unused variable warning — required for Next.js route signature
  void request;

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const exportData = await buildGdprExportData(supabase, user.id);
    const excelBuffer = buildGdprExcel(exportData);

    const exportedDate = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(excelBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Patrimio_GDPR_Export_${user.id.slice(0, 8)}_${exportedDate}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
