// app/api/reports/excel/route.ts
// Full Excel export: summary + all transactions + investments for the period
import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateMonthlyReport, generateAnnualReport } from "@/lib/reports/server";
import { buildMonthlyExcel, buildAnnualExcel } from "@/lib/reports/excel";
import { endOfMonth, endOfYear, startOfMonth, startOfYear } from "date-fns";

const ExcelQuerySchema = z
  .object({
    type: z.enum(["monthly", "annual"]),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100),
  })
  .strict();

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

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
  const parsed = ExcelQuerySchema.safeParse({
    type: request.nextUrl.searchParams.get("type") ?? "monthly",
    month: request.nextUrl.searchParams.get("month") ?? now.getMonth() + 1,
    year: request.nextUrl.searchParams.get("year") ?? now.getFullYear(),
  });

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const { type, year, month } = parsed.data;
    let startDate: string;
    let endDate: string;
    let filename: string;
    let excelBuffer: Buffer;

    if (type === "monthly") {
      const m = month ?? now.getMonth() + 1;
      const start = startOfMonth(new Date(year, m - 1, 1));
      const end = endOfMonth(start);
      startDate = toIsoDate(start);
      endDate = toIsoDate(end);
      filename = `patrimonio-informe-${year}-${String(m).padStart(2, "0")}.xlsx`;

      const [report, txResult] = await Promise.all([
        generateMonthlyReport(supabase, user.id, m, year),
        supabase
          .from("transactions")
          .select(
            "transaction_date,description,amount_cents,is_income,currency,notes,category:categories(name),account:accounts(name)",
          )
          .eq("user_id", user.id)
          .gte("transaction_date", startDate)
          .lte("transaction_date", endDate)
          .is("deleted_at", null)
          .order("transaction_date", { ascending: false }),
      ]);

      excelBuffer = buildMonthlyExcel(
        report,
        (txResult.data ?? []) as Parameters<typeof buildMonthlyExcel>[1],
      );
    } else {
      const start = startOfYear(new Date(year, 0, 1));
      const end = endOfYear(start);
      startDate = toIsoDate(start);
      endDate = toIsoDate(end);
      filename = `patrimonio-anual-${year}.xlsx`;

      const [report, txResult, invResult] = await Promise.all([
        generateAnnualReport(supabase, user.id, year),
        supabase
          .from("transactions")
          .select(
            "transaction_date,description,amount_cents,is_income,currency,notes,category:categories(name),account:accounts(name)",
          )
          .eq("user_id", user.id)
          .gte("transaction_date", startDate)
          .lte("transaction_date", endDate)
          .is("deleted_at", null)
          .order("transaction_date", { ascending: false }),
        supabase
          .from("investments")
          .select(
            "name,ticker,investment_type,quantity,avg_purchase_price_cents,current_value_cents,currency",
          )
          .eq("user_id", user.id)
          .eq("is_active", true)
          .is("deleted_at", null),
      ]);

      excelBuffer = buildAnnualExcel(
        report,
        (txResult.data ?? []) as Parameters<typeof buildAnnualExcel>[1],
        (invResult.data ?? []) as Parameters<typeof buildAnnualExcel>[2],
      );
    }

    return new Response(new Uint8Array(excelBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
