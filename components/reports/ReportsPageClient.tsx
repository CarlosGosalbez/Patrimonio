"use client";

import { useState } from "react";
import { useId } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart2,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useMonthlyReportQuery,
  useAnnualReportQuery,
  useFiscalReportQuery,
  usePeriodComparisonQuery,
  useDownloadPdf,
  useDownloadExcel,
  useDownloadGdpr,
} from "@/hooks/usePhase7Reports";
import { formatCurrency, formatPercentChange } from "@/lib/financial/formatters";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function formatTooltipCurrency(value: unknown): string {
  if (typeof value !== "number") return String(value ?? "");
  return formatCurrency(value);
}

function DeltaBadge({ pct, invert }: { pct: number | null; invert?: boolean }) {
  if (pct === null) return null;
  const isGood = invert ? pct <= 0 : pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${isGood ? "text-emerald-600" : "text-rose-600"
        }`}
      aria-label={`${pct > 0 ? "+" : ""}${pct.toFixed(1)}% vs periodo anterior`}
    >
      {isGood ? (
        <TrendingUp className="h-3 w-3" aria-hidden="true" />
      ) : (
        <TrendingDown className="h-3 w-3" aria-hidden="true" />
      )}
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

function MetricCard({
  label,
  value,
  delta,
  invertDelta,
}: {
  label: string;
  value: string;
  delta?: number | null;
  invertDelta?: boolean;
}) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        {delta !== undefined && delta !== null && (
          <div className="mt-1.5">
            <DeltaBadge pct={delta} invert={invertDelta} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryBar({
  name,
  amountCents,
  pct,
}: {
  name: string;
  amountCents: number;
  pct: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="max-w-[60%] truncate">{name}</span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
          <span className="font-medium">{formatCurrency(amountCents)}</span>
        </div>
      </div>
      <div
        className="h-2 w-full rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-2 rounded-full bg-rose-500 transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Monthly Tab
// ─────────────────────────────────────────────────────────────

function MonthlyTab({ month, year }: { month: number; year: number }) {
  const t = useTranslations("reports");
  const { data, isLoading } = useMonthlyReportQuery(month, year);
  const { data: comparison, isLoading: cmpLoading } = usePeriodComparisonQuery(
    "month",
    month,
    year,
  );
  const downloadPdf = useDownloadPdf();
  const downloadExcel = useDownloadExcel();

  const handleDownloadPdf = () => {
    downloadPdf.mutate(
      { type: "monthly", month, year },
      {
        onSuccess: () => toast.success(t("pdfDownloaded")),
        onError: (e) => toast.error(e instanceof Error ? e.message : t("downloadError")),
      },
    );
  };

  const handleDownloadExcel = () => {
    downloadExcel.mutate(
      { type: "monthly", month, year },
      {
        onSuccess: () => toast.success(t("excelDownloaded")),
        onError: (e) => toast.error(e instanceof Error ? e.message : t("downloadError")),
      },
    );
  };

  if (isLoading || cmpLoading) {
    return (
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-busy="true"
        aria-label={t("loading")}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-28 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Export buttons */}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPdf}
          disabled={downloadPdf.isPending}
          aria-busy={downloadPdf.isPending}
          className="min-h-[44px] gap-2"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          {downloadPdf.isPending ? t("generating") : t("downloadPdf")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadExcel}
          disabled={downloadExcel.isPending}
          aria-busy={downloadExcel.isPending}
          className="min-h-[44px] gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          {downloadExcel.isPending ? t("generating") : t("downloadExcel")}
        </Button>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("income")}
          value={formatCurrency(data.income_total_cents)}
          delta={data.comparison.income_delta_pct}
        />
        <MetricCard
          label={t("expenses")}
          value={formatCurrency(data.expenses_total_cents)}
          delta={data.comparison.expenses_delta_pct}
          invertDelta
        />
        <MetricCard label={t("netBalance")} value={formatCurrency(data.net_balance_cents)} />
        <MetricCard
          label={t("savingsRate")}
          value={data.savings_rate_percent !== null ? `${data.savings_rate_percent}%` : "—"}
          delta={data.comparison.savings_rate_delta}
        />
      </div>

      {/* Period comparison chart */}
      {comparison && (
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {t("comparisonTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  {
                    name: comparison.previous.label,
                    income: comparison.previous.income_cents,
                    expenses: comparison.previous.expenses_cents,
                  },
                  {
                    name: comparison.current.label,
                    income: comparison.current.income_cents,
                    expenses: comparison.current.expenses_cents,
                  },
                ]}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'inherit' }} />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v, "EUR")}
                  tick={{ fontSize: 10 }}
                  width={72}
                />
                <Tooltip formatter={formatTooltipCurrency} />
                <Legend />
                <Bar dataKey="income" name={t("income")} fill="#059669" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name={t("expenses")} fill="#dc2626" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Expenses by category */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("expensesByCategory")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.expenses_by_category.slice(0, 8).map((cat) => (
            <CategoryBar
              key={cat.category_id ?? "none"}
              name={cat.category_name}
              amountCents={cat.amount_cents}
              pct={cat.percent_of_total}
            />
          ))}
        </CardContent>
      </Card>

      {/* Top expenses */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("topExpenses")}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {data.top_expenses.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{tx.description}</p>
                <p className="text-xs text-muted-foreground">{tx.category_name ?? "—"}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-rose-600">
                {formatCurrency(tx.amount_cents)}
              </span>
            </div>
          ))}
          {data.top_expenses.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("noData")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Annual Tab
// ─────────────────────────────────────────────────────────────

function AnnualTab({ year }: { year: number }) {
  const t = useTranslations("reports");
  const { data, isLoading } = useAnnualReportQuery(year);
  const { data: comparison, isLoading: cmpLoading } = usePeriodComparisonQuery("year", 1, year);
  const downloadExcel = useDownloadExcel();

  const handleDownloadExcel = () => {
    downloadExcel.mutate(
      { type: "annual", year },
      {
        onSuccess: () => toast.success(t("excelDownloaded")),
        onError: (e) => toast.error(e instanceof Error ? e.message : t("downloadError")),
      },
    );
  };

  if (isLoading || cmpLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-28 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadExcel}
          disabled={downloadExcel.isPending}
          aria-busy={downloadExcel.isPending}
          className="min-h-[44px] gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          {downloadExcel.isPending ? t("generating") : t("downloadExcelFull")}
        </Button>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("totalIncome")}
          value={formatCurrency(data.total_income_cents)}
          delta={comparison?.income_delta_pct}
        />
        <MetricCard
          label={t("totalExpenses")}
          value={formatCurrency(data.total_expenses_cents)}
          delta={comparison?.expenses_delta_pct}
          invertDelta
        />
        <MetricCard label={t("netBalance")} value={formatCurrency(data.total_net_cents)} />
        <MetricCard
          label={t("avgSavingsRate")}
          value={data.avg_savings_rate_percent !== null ? `${data.avg_savings_rate_percent}%` : "—"}
        />
      </div>

      {/* Monthly evolution chart */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("monthlyEvolution")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.monthly_series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: 'inherit' }} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} width={72} />
              <Tooltip formatter={formatTooltipCurrency} />
              <Legend />
              <Bar dataKey="income_cents" name={t("income")} fill="#059669" radius={[2, 2, 0, 0]} />
              <Bar
                dataKey="expenses_cents"
                name={t("expenses")}
                fill="#dc2626"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Expenses by category */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("expensesByCategory")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.expenses_by_category.slice(0, 10).map((cat) => (
            <CategoryBar
              key={cat.category_id ?? "none"}
              name={cat.category_name}
              amountCents={cat.amount_cents}
              pct={cat.percent_of_total}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Fiscal Tab
// ─────────────────────────────────────────────────────────────

function FiscalTab({ year }: { year: number }) {
  const t = useTranslations("reports");
  const { data, isLoading } = useFiscalReportQuery(year);
  const downloadPdf = useDownloadPdf();

  const handleDownloadPdf = () => {
    downloadPdf.mutate(
      { type: "fiscal", year },
      {
        onSuccess: () => toast.success(t("pdfDownloaded")),
        onError: (e) => toast.error(e instanceof Error ? e.message : t("downloadError")),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3" aria-busy="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="h-28 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPdf}
          disabled={downloadPdf.isPending}
          aria-busy={downloadPdf.isPending}
          className="min-h-[44px] gap-2"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          {downloadPdf.isPending ? t("generating") : t("downloadFiscalPdf")}
        </Button>
      </div>

      {/* Capital gains */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("capitalGains")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label={t("gains")}
              value={formatCurrency(data.capital_gains.total_gains_cents)}
            />
            <MetricCard
              label={t("losses")}
              value={formatCurrency(data.capital_gains.total_losses_cents)}
            />
            <MetricCard
              label={t("netResult")}
              value={formatCurrency(data.capital_gains.net_cents)}
            />
          </div>

          {data.capital_gains.operations.length > 0 && (
            <div className="divide-y divide-border">
              <div className="grid grid-cols-4 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>{t("ticker")}</span>
                <span className="text-right">{t("saleDate")}</span>
                <span className="text-right">{t("salePrice")}</span>
                <span className="text-right">{t("gainLoss")}</span>
              </div>
              {data.capital_gains.operations.map((op, i) => (
                <div
                  key={`${op.ticker}-${i}`}
                  className="grid grid-cols-4 items-center py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium">{op.ticker}</p>
                    <p className="truncate text-xs text-muted-foreground">{op.investment_name}</p>
                  </div>
                  <p className="text-right text-muted-foreground">
                    {new Date(op.operation_date).toLocaleDateString("es-ES")}
                  </p>
                  <p className="text-right">{formatCurrency(op.sell_price_cents)}</p>
                  <p
                    className={`text-right font-medium ${op.is_gain ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {op.gross_gain_cents >= 0 ? "+" : ""}
                    {formatCurrency(op.gross_gain_cents)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {data.capital_gains.operations.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("noSales")}</p>
          )}
        </CardContent>
      </Card>

      {/* Dividends */}
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("dividends")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label={t("grossDividends")}
              value={formatCurrency(data.dividends.gross_total_cents)}
            />
            <MetricCard
              label={t("withholding")}
              value={formatCurrency(data.dividends.withheld_total_cents)}
            />
            <MetricCard
              label={t("netDividends")}
              value={formatCurrency(data.dividends.net_total_cents)}
            />
          </div>

          {data.dividends.rows.length > 0 && (
            <div className="divide-y divide-border">
              <div className="grid grid-cols-4 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>{t("ticker")}</span>
                <span className="text-right">{t("date")}</span>
                <span className="text-right">{t("grossAmount")}</span>
                <span className="text-right">{t("netAmount")}</span>
              </div>
              {data.dividends.rows.map((div, i) => (
                <div
                  key={`${div.ticker}-${i}`}
                  className="grid grid-cols-4 items-center py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium">{div.ticker}</p>
                    <p className="truncate text-xs text-muted-foreground">{div.investment_name}</p>
                  </div>
                  <p className="text-right text-muted-foreground">
                    {new Date(div.operation_date).toLocaleDateString("es-ES")}
                  </p>
                  <p className="text-right">{formatCurrency(div.gross_amount_cents)}</p>
                  <p className="text-right font-medium text-emerald-600">
                    {formatCurrency(div.net_amount_cents)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div
        className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
        role="note"
        aria-label={t("disclaimerLabel")}
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>{data.disclaimer}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GDPR Section
// ─────────────────────────────────────────────────────────────

function GdprSection() {
  const t = useTranslations("reports");
  const downloadGdpr = useDownloadGdpr();
  const [confirmed, setConfirmed] = useState(false);
  const confirmId = useId();

  const handleDownload = () => {
    downloadGdpr.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("gdprDownloaded"));
        setConfirmed(false);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : t("downloadError")),
    });
  };

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {t("gdprTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("gdprDescription")}</p>
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li>{t("gdprIncludes.profile")}</li>
          <li>{t("gdprIncludes.transactions")}</li>
          <li>{t("gdprIncludes.investments")}</li>
          <li>{t("gdprIncludes.commitments")}</li>
          <li>{t("gdprIncludes.budgets")}</li>
        </ul>
        <div className="flex items-start gap-2.5">
          <input
            id={confirmId}
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-describedby={`${confirmId}-desc`}
          />
          <label htmlFor={confirmId} id={`${confirmId}-desc`} className="cursor-pointer text-sm">
            {t("gdprConfirmLabel")}
          </label>
        </div>
        <Button
          variant="outline"
          onClick={handleDownload}
          disabled={!confirmed || downloadGdpr.isPending}
          aria-busy={downloadGdpr.isPending}
          className="min-h-[44px] gap-2"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {downloadGdpr.isPending ? t("generating") : t("gdprDownloadButton")}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page Client
// ─────────────────────────────────────────────────────────────

export function ReportsPageClient() {
  const t = useTranslations("reports");
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [tab, setTab] = useState<"monthly" | "annual" | "fiscal" | "gdpr">("monthly");

  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const monthSelectId = useId();
  const yearSelectId = useId();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Period selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor={monthSelectId} className="whitespace-nowrap text-sm font-medium">
            <CalendarDays
              className="mr-1 inline h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            {t("month")}
          </label>
          <select
            id={monthSelectId}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={t("selectMonth")}
          >
            {MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={yearSelectId} className="text-sm font-medium">
            {t("year")}
          </label>
          <select
            id={yearSelectId}
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={t("selectYear")}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
          <TabsTrigger value="monthly" className="min-h-[44px]">
            {t("tabMonthly")}
          </TabsTrigger>
          <TabsTrigger value="annual" className="min-h-[44px]">
            {t("tabAnnual")}
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="min-h-[44px]">
            {t("tabFiscal")}
          </TabsTrigger>
          <TabsTrigger value="gdpr" className="min-h-[44px]">
            {t("tabGdpr")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <MonthlyTab month={selectedMonth} year={selectedYear} />
        </TabsContent>

        <TabsContent value="annual">
          <AnnualTab year={selectedYear} />
        </TabsContent>

        <TabsContent value="fiscal">
          <FiscalTab year={selectedYear} />
        </TabsContent>

        <TabsContent value="gdpr">
          <GdprSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
