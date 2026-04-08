// app/api/reports/pdf/route.ts
// Server-side PDF generation using @react-pdf/renderer
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { generateMonthlyReport, generateFiscalReport } from "@/lib/reports/server";
import { renderMonthlyReportPdf, renderFiscalReportPdf } from "@/lib/reports/pdf";

const PdfQuerySchema = z
  .object({
    type: z.enum(["monthly", "fiscal"]),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100),
  })
  .strict();

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const parsed = PdfQuerySchema.safeParse({
    type: request.nextUrl.searchParams.get("type") ?? "monthly",
    month: request.nextUrl.searchParams.get("month") ?? now.getMonth() + 1,
    year: request.nextUrl.searchParams.get("year") ?? now.getFullYear(),
  });

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const { type, year, month } = parsed.data;

    let pdfBuffer: Buffer;
    let filename: string;

    if (type === "fiscal") {
      const t = await getTranslations("investments");
      const report = await generateFiscalReport(supabase, user.id, year, t("fiscal.disclaimer"));
      pdfBuffer = await renderFiscalReportPdf(report);
      filename = `patrimonio-fiscal-irpf-${year}.pdf`;
    } else {
      const m = month ?? now.getMonth() + 1;
      const report = await generateMonthlyReport(supabase, user.id, m, year);
      pdfBuffer = await renderMonthlyReportPdf(report);
      filename = `patrimonio-informe-${year}-${String(m).padStart(2, "0")}.pdf`;
    }

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
