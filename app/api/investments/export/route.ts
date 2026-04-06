import { NextRequest, NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import * as XLSX from "xlsx";
import { investmentExportSchema } from "@/lib/investments/schemas";
import { getInvestmentsOverview, listInvestmentOperationsForYear } from "@/lib/investments/server";
import { centsToDec } from "@/lib/financial/formatters";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = investmentExportSchema.safeParse({
    year: request.nextUrl.searchParams.get("year") ?? new Date().getFullYear(),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const t = await getTranslations("investments");
    const [overview, operations] = await Promise.all([
      getInvestmentsOverview({
        irpfDisclaimer: t("fiscal.disclaimer"),
        supabase,
        userId: user.id,
        year: parsed.data.year,
      }),
      listInvestmentOperationsForYear({
        supabase,
        userId: user.id,
        year: parsed.data.year,
      }),
    ]);

    const summaryRows = [
      {
        [t("export.columns.metric")]: t("summary.totalValue"),
        [t("export.columns.value")]: centsToDec(overview.summary.total_value_cents),
        [t("export.columns.currency")]: overview.base_currency,
      },
      {
        [t("export.columns.metric")]: t("summary.totalInvested"),
        [t("export.columns.value")]: centsToDec(overview.summary.total_invested_cents),
        [t("export.columns.currency")]: overview.base_currency,
      },
      {
        [t("export.columns.metric")]: t("summary.unrealizedPnL"),
        [t("export.columns.value")]: centsToDec(overview.summary.unrealized_pl_cents),
        [t("export.columns.currency")]: overview.base_currency,
      },
      {
        [t("export.columns.metric")]: t("summary.realizedPnL"),
        [t("export.columns.value")]: centsToDec(overview.summary.realized_pl_cents),
        [t("export.columns.currency")]: overview.base_currency,
      },
      {
        [t("export.columns.metric")]: t("summary.dividendsGross"),
        [t("export.columns.value")]: centsToDec(overview.irpf.dividends_received_cents),
        [t("export.columns.currency")]: overview.base_currency,
      },
      {
        [t("export.columns.metric")]: t("summary.dividendsWithholding"),
        [t("export.columns.value")]: centsToDec(overview.irpf.withholding_cents),
        [t("export.columns.currency")]: overview.base_currency,
      },
      {
        [t("export.columns.metric")]: t("summary.dividendsNet"),
        [t("export.columns.value")]: centsToDec(overview.irpf.net_dividends_cents),
        [t("export.columns.currency")]: overview.base_currency,
      },
    ];

    const positionRows = overview.positions.map((position) => ({
      [t("export.columns.ticker")]: position.ticker,
      [t("export.columns.name")]: position.name,
      [t("export.columns.type")]: t(`types.${position.investment_type}`),
      [t("export.columns.account")]: position.account?.name ?? t("fields.optionalAccount"),
      [t("export.columns.quantity")]: position.quantity,
      [t("export.columns.avgPrice")]: centsToDec(position.avg_purchase_price_cents),
      [t("export.columns.currentPrice")]:
        position.current_price_cents != null ? centsToDec(position.current_price_cents) : "",
      [t("export.columns.currentValue")]: centsToDec(position.current_value_base_cents),
      [t("export.columns.unrealizedPnL")]: centsToDec(position.unrealized_pl_cents),
      [t("export.columns.currency")]: overview.base_currency,
    }));

    const operationRows = operations.map((operation) => ({
      [t("export.columns.date")]: operation.operation_date,
      [t("export.columns.ticker")]: operation.investment?.ticker ?? "",
      [t("export.columns.name")]: operation.investment?.name ?? "",
      [t("export.columns.operationType")]: t(`operations.${operation.operation_type}`),
      [t("export.columns.quantity")]: operation.quantity,
      [t("export.columns.price")]: centsToDec(operation.price_cents),
      [t("export.columns.fee")]: centsToDec(operation.fee_cents),
      [t("export.columns.total")]: centsToDec(operation.total_cents),
      [t("export.columns.currency")]: operation.currency,
      [t("export.columns.notes")]: operation.notes ?? "",
    }));

    const dividendRows = overview.irpf.rows.map((row) => ({
      [t("export.columns.date")]: row.operation_date,
      [t("export.columns.ticker")]: row.investment.ticker,
      [t("export.columns.name")]: row.investment.name,
      [t("export.columns.grossDividend")]: centsToDec(row.total_cents),
      [t("export.columns.withholding")]: centsToDec(row.withholding_cents ?? 0),
      [t("export.columns.netDividend")]: centsToDec(row.total_cents - (row.withholding_cents ?? 0)),
      [t("export.columns.currency")]: overview.base_currency,
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summaryRows),
      t("export.sheets.summary"),
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(positionRows),
      t("export.sheets.positions"),
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(operationRows),
      t("export.sheets.operations"),
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(dividendRows),
      t("export.sheets.dividends"),
    );

    const buffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Disposition": `attachment; filename="patrimio-investments-${parsed.data.year}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : "Internal server error" },
      { status: 500 },
    );
  }
}
