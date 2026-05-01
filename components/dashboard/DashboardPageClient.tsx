"use client";

import { memo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
  EyeOff,
  GripVertical,
  LayoutDashboard,
  PiggyBank,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedList, AnimatedItem } from "@/components/ui/AnimatedList";
import { useDashboardSummaryQuery, useCategoriesQuery } from "@/hooks/usePhaseThree";
import { formatCurrency } from "@/lib/financial/formatters";
import type { DashboardWidgetId } from "@/lib/dashboard/types";
import { useDashboardPreferencesStore } from "@/stores/useDashboardPreferencesStore";
import { SwipeableTransactionRow } from "@/components/ui/SwipeableTransactionRow";
import { useDeleteTransaction } from "@/hooks/useDeleteTransaction";
import { QuickActionButtons } from "@/components/dashboard/QuickActionButtons";

const widgetLabels: Record<DashboardWidgetId, string> = {
  "active-alerts": "activeAlerts",
  "monthly-balance": "monthBalance",
  portfolio: "portfolio",
  "projected-flow": "projectedFlow",
  "recent-transactions": "recentTransactions",
  "top-categories": "topCategories",
  "upcoming-commitments": "upcomingCommitments",
  "upcoming-deadlines": "upcomingDeadlines",
};

function formatTooltipValue(value: unknown) {
  if (typeof value === "number") {
    return formatCurrency(value);
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value ?? "");
}

const SummaryCard = memo(function SummaryCard({
  amount,
  icon: Icon,
  label,
  tone,
}: {
  amount: number;
  icon: typeof ArrowUpCircle;
  label: string;
  tone: "income" | "expense" | "neutral";
}) {
  const accent =
    tone === "income" ? "text-emerald-600" : tone === "expense" ? "text-rose-600" : "text-blue-600";

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`mt-2 text-2xl font-semibold tracking-tight ${accent}`}>
              {formatCurrency(amount)}
            </p>
          </div>
          <div className="rounded-2xl bg-muted p-3">
            <Icon className={`h-5 w-5 ${accent}`} aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export function DashboardPageClient() {
  const t = useTranslations("dashboard");
  const { data, isLoading } = useDashboardSummaryQuery();
  const categoriesQuery = useCategoriesQuery();
  const hidden = useDashboardPreferencesStore((state) => state.hidden);
  const order = useDashboardPreferencesStore((state) => state.order);
  const deleteTransactionMutation = useDeleteTransaction();
  const moveWidget = useDashboardPreferencesStore((state) => state.moveWidget);
  const toggleWidget = useDashboardPreferencesStore((state) => state.toggleWidget);
  const reset = useDashboardPreferencesStore((state) => state.reset);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<DashboardWidgetId | null>(null);

  const visibleOrder = order.filter((widgetId) => !hidden.includes(widgetId));

  const categoryMap: Record<string, string> = Object.fromEntries(
    (categoriesQuery.data ?? []).map((c) => [c.name, c.id]),
  );

  const widgets: Record<DashboardWidgetId, React.ReactNode> = {
    "monthly-balance": (
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          amount={data?.monthly_balance.balance_cents ?? 0}
          icon={PiggyBank}
          label={t("monthBalance")}
          tone="neutral"
        />
        <SummaryCard
          amount={data?.monthly_balance.income_cents ?? 0}
          icon={ArrowUpCircle}
          label={t("monthIncome")}
          tone="income"
        />
        <SummaryCard
          amount={-(data?.monthly_balance.expense_cents ?? 0)}
          icon={ArrowDownCircle}
          label={t("monthExpense")}
          tone="expense"
        />
      </div>
    ),
    "projected-flow": (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{t("projectedFlow")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {(data?.projected_flow.buckets ?? []).map((bucket) => (
              <div key={bucket.label} className="rounded-2xl bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {bucket.label}
                </p>
                <p className="mt-2 text-xl font-semibold">{formatCurrency(bucket.net_cents)}</p>
              </div>
            ))}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.projected_flow.points ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month_date" tickFormatter={(value) => value.slice(5, 7)} />
                <YAxis tickFormatter={(value) => `${Math.round(value / 100)}€`} />
                <Tooltip formatter={formatTooltipValue} />
                <Bar dataKey="net_cents" radius={[8, 8, 0, 0]}>
                  {(data?.projected_flow.points ?? []).map((point) => (
                    <Cell
                      key={point.month_date}
                      fill={point.net_cents >= 0 ? "hsl(142 72% 45%)" : "hsl(0 84% 60%)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    ),
    "top-categories": (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{t("topCategories")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[220px,1fr]">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.top_categories ?? []}
                  dataKey="total_cents"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={3}
                >
                  {(data?.top_categories ?? []).map((category, index) => (
                    <Cell
                      key={category.category_id ?? index}
                      fill={
                        category.color ??
                        ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][index % 5]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={formatTooltipValue} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {(data?.top_categories ?? []).map((category) => (
              <div
                key={category.category_id ?? category.name}
                className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: category.color ?? "#2563eb" }}
                  />
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.transaction_count} {t("movements")}
                    </p>
                  </div>
                </div>
                <p className="font-semibold">{formatCurrency(category.total_cents)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    ),
    "upcoming-commitments": (
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t("upcomingCommitments")}</CardTitle>
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/commitments">{t("openCommitments")}</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.upcoming_commitments ?? []).map((commitment) => (
            <div
              key={commitment.id}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-4 py-3"
            >
              <div>
                <p className="font-medium">{commitment.name}</p>
                <p className="text-xs text-muted-foreground">{commitment.next_due_date}</p>
              </div>
              <p
                className={
                  commitment.is_income ? "font-semibold text-emerald-600" : "font-semibold"
                }
              >
                {formatCurrency(
                  commitment.is_income ? commitment.amount_cents : -commitment.amount_cents,
                )}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    ),
    "upcoming-deadlines": (
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t("upcomingDeadlines")}</CardTitle>
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/alerts">{t("openAlerts")}</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.upcoming_deadlines ?? []).map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-4 py-3"
            >
              <div>
                <p className="font-medium">{alert.name}</p>
                <p className="text-xs text-muted-foreground">{alert.next_due_date}</p>
              </div>
              <p className="font-semibold">
                {alert.expected_amount_cents !== null
                  ? formatCurrency(alert.expected_amount_cents)
                  : ""}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    ),
    portfolio: (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{t("portfolio")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">{t("portfolioValue")}</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(data?.portfolio_summary.total_value_cents ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">{t("dayPnL")}</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(data?.portfolio_summary.day_pnl_cents ?? 0)}
            </p>
          </div>
        </CardContent>
      </Card>
    ),
    "active-alerts": (
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t("activeAlerts")}</CardTitle>
          <Badge variant="secondary" className="rounded-full">
            {data?.active_alerts.total ?? 0}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.active_alerts.items ?? []).map((alert) => (
            <Link
              key={alert.id}
              href={alert.href}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 transition hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={
                    alert.severity === "critical"
                      ? "mt-0.5 h-4 w-4 text-rose-600"
                      : alert.severity === "warning"
                        ? "mt-0.5 h-4 w-4 text-amber-500"
                        : "mt-0.5 h-4 w-4 text-blue-600"
                  }
                />
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.detail}</p>
                </div>
              </div>
              <p className="text-sm font-semibold">
                {alert.amount_cents !== null ? formatCurrency(alert.amount_cents) : ""}
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>
    ),
    "recent-transactions": (
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t("recentTransactions")}</CardTitle>
          <Badge variant="secondary" className="rounded-full">
            <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {t("liveBadge")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.recent_transactions ?? []).map((transaction) => (
            <SwipeableTransactionRow
              key={transaction.id}
              onDelete={() => deleteTransactionMutation.mutate(transaction.id)}
            >
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {transaction.category?.name ?? t("uncategorized")} ·{" "}
                    {transaction.transaction_date}
                  </p>
                </div>
                <p
                  className={
                    transaction.is_income ? "font-semibold text-emerald-600" : "font-semibold"
                  }
                >
                  {formatCurrency(
                    transaction.is_income ? transaction.amount_cents : -transaction.amount_cents,
                  )}
                </p>
              </div>
            </SwipeableTransactionRow>
          ))}
        </CardContent>
      </Card>
    ),
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-border/70 bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(16,185,129,0.06),rgba(255,255,255,0.92))] p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              <LayoutDashboard className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              {t("liveBadge")}
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => setCustomizeOpen((open) => !open)}
            >
              <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("customize")}
            </Button>
            <Button asChild size="lg" className="min-h-[48px] rounded-2xl">
              <Link href="/commitments">{t("openCommitments")}</Link>
            </Button>
          </div>
        </div>

        <AnimatedList className="mt-6 grid gap-4 md:grid-cols-3">
          <AnimatedItem>
            <SummaryCard
              amount={data?.hero.total_cents ?? 0}
              icon={PiggyBank}
              label={t("netWorth")}
              tone="neutral"
            />
          </AnimatedItem>
          <AnimatedItem>
            <SummaryCard
              amount={data?.hero.cash_cents ?? 0}
              icon={ArrowUpCircle}
              label={t("cashPosition")}
              tone="income"
            />
          </AnimatedItem>
          <AnimatedItem>
            <SummaryCard
              amount={data?.hero.monthly_delta_cents ?? 0}
              icon={
                data?.hero.monthly_delta_cents && data.hero.monthly_delta_cents < 0
                  ? ArrowDownCircle
                  : ArrowUpCircle
              }
              label={t("monthlyDelta")}
              tone={
                data?.hero.monthly_delta_cents && data.hero.monthly_delta_cents < 0
                  ? "expense"
                  : "income"
              }
            />
          </AnimatedItem>
        </AnimatedList>
      </section>

      <section aria-label={t("quickActions.ariaLabel")}>
        <QuickActionButtons categoryMap={categoryMap} />
      </section>

      {customizeOpen ? (
        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{t("customize")}</CardTitle>
            <Button type="button" variant="outline" onClick={() => reset()}>
              {t("resetLayout")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {order.map((widgetId, index) => (
              <div
                key={widgetId}
                draggable
                onDragStart={() => setDraggingId(widgetId)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggingId) {
                    moveWidget(draggingId, index);
                  }
                }}
                className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium">{t(`widgets.${widgetLabels[widgetId]}`)}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleWidget(widgetId)}
                  aria-label={hidden.includes(widgetId) ? t("showWidget") : t("hideWidget")}
                  aria-pressed={hidden.includes(widgetId)}
                >
                  {hidden.includes(widgetId) ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : (
        visibleOrder.map((widgetId) => <div key={widgetId}>{widgets[widgetId]}</div>)
      )}
    </div>
  );
}
