import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFinancialReport } from "@/lib/reports/excel-export";
import { handleApiError } from "@/lib/errors/api-error-handler";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);

  try {
    const buffer = await generateFinancialReport(supabase, user.id, year);

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="patrimonio-report-${year}.xlsx"`,
      },
    });
  } catch (error) {
    return handleApiError({
      error,
      message: "Error al generar el reporte",
      statusCode: 500,
      context: { year },
    });
  }
}
