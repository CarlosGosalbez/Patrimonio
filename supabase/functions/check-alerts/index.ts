import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.6.0";
import { addDateDays, isMonday, parseDate, toDateString } from "../_shared/date-utils.ts";

interface CustomAlertRow {
  advance_notice_days: number;
  auto_deactivate: boolean;
  category_id: string | null;
  description: string | null;
  dismissed_until: string | null;
  due_date: string;
  expected_amount_cents: number | null;
  id: string;
  is_active: boolean;
  name: string;
  user_id: string;
}

interface RecurringCommitmentRow {
  account_id: string;
  advance_notice_days: number | null;
  amount_cents: number;
  category_id: string | null;
  id: string;
  is_active: boolean;
  is_income: boolean;
  name: string;
  next_due_date: string;
  tolerance_days: number | null;
  user_id: string;
}

interface ProfileRow {
  id: string;
  last_alert_digest_sent_at: string | null;
  locale: string;
  user_id: string;
  weekly_alert_digest_enabled: boolean;
}

interface ProjectionRow {
  month_date: string;
  net_cents: number;
}

interface BudgetRow {
  alert_threshold: number;
  category: { name: string | null } | null;
  category_id: string;
  end_date: string | null;
  id: string;
  is_active: boolean;
  limit_cents: number;
  period: "monthly" | "annual";
  start_date: string;
  user_id: string;
}

interface ExpenseTransactionRow {
  amount_cents: number;
  category_id: string | null;
  transaction_date: string;
  user_id: string;
}

interface CategoryMonthlyRow {
  category_id: string | null;
  month: string;
  total_cents: number | null;
  user_id: string;
}

interface CategoryRow {
  color: string | null;
  id: string;
  name: string;
}

interface InvestmentAlertRow {
  daily_price_alert_threshold_percent: number | null;
  id: string;
  name: string;
  ticker: string;
  user_id: string;
}

interface MarketCacheAlertRow {
  change_percent: number | null;
  ticker: string;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
const resendFromName = Deno.env.get("RESEND_FROM_NAME") ?? "Patrimio";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

function getRunDate(request: Request) {
  const url = new URL(request.url);
  const queryDate = url.searchParams.get("date");

  if (queryDate) {
    return queryDate;
  }

  return new Date().toISOString().slice(0, 10);
}

function paymentWindowStart(dueDate: string) {
  return addDateDays(dueDate, -14);
}

function paymentWindowEnd(dueDate: string) {
  return addDateDays(dueDate, 30);
}

function monthStart(dateValue: string) {
  return `${dateValue.slice(0, 7)}-01`;
}

function monthEnd(dateValue: string) {
  const date = parseDate(monthStart(dateValue));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();

  return `${dateValue.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}

function yearStart(dateValue: string) {
  return `${dateValue.slice(0, 4)}-01-01`;
}

function yearEnd(dateValue: string) {
  return `${dateValue.slice(0, 4)}-12-31`;
}

function standardDeviation(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

async function upsertNotification({
  eventKey,
  message,
  severity,
  targetId,
  targetType,
  title,
  type,
  userId,
}: {
  eventKey: string;
  message: string;
  severity: "info" | "warning" | "critical";
  targetId: string | null;
  targetType: string | null;
  title: string;
  type:
    | "budget_exceeded"
    | "anomaly_detected"
    | "commitment_due"
    | "custom_alert_due"
    | "expected_income_unpaid"
    | "investment_alert"
    | "subscription_unexpected_charge";
  userId: string;
}) {
  const { error } = await supabase.from("notifications").upsert(
    {
      event_key: eventKey,
      message,
      severity,
      target_id: targetId,
      target_type: targetType,
      title,
      type,
      user_id: userId,
    },
    {
      ignoreDuplicates: true,
      onConflict: "user_id,event_key",
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function createBudgetAndAnomalyNotifications(runDate: string) {
  let created = 0;
  const currentMonth = monthStart(runDate);
  const [{ data: budgets, error: budgetsError }, { data: expenses, error: expensesError }] =
    await Promise.all([
      supabase
        .from("budgets")
        .select(
          "id,user_id,category_id,period,limit_cents,alert_threshold,start_date,end_date,is_active,category:categories(name)",
        )
        .eq("is_active", true)
        .is("deleted_at", null),
      supabase
        .from("transactions")
        .select("user_id,category_id,amount_cents,transaction_date")
        .eq("is_income", false)
        .gte("transaction_date", yearStart(runDate))
        .lte("transaction_date", monthEnd(runDate))
        .is("deleted_at", null),
    ]);

  if (budgetsError || expensesError) {
    throw new Error(budgetsError?.message ?? expensesError?.message ?? "Budget scan failed");
  }

  const expenseRows = (expenses ?? []) as ExpenseTransactionRow[];

  for (const budget of (budgets ?? []) as BudgetRow[]) {
    const windowStart = budget.period === "annual" ? yearStart(runDate) : currentMonth;
    const windowEnd = budget.period === "annual" ? yearEnd(runDate) : monthEnd(runDate);

    if (budget.start_date > windowEnd) {
      continue;
    }

    if (budget.end_date && budget.end_date < windowStart) {
      continue;
    }

    const spentCents = expenseRows.reduce((sum, transaction) => {
      if (
        transaction.user_id !== budget.user_id ||
        transaction.category_id !== budget.category_id ||
        transaction.transaction_date < windowStart ||
        transaction.transaction_date > windowEnd
      ) {
        return sum;
      }

      return sum + transaction.amount_cents;
    }, 0);

    const progressRatio = budget.limit_cents > 0 ? spentCents / budget.limit_cents : 0;

    if (progressRatio < budget.alert_threshold / 100) {
      continue;
    }

    const stage = progressRatio >= 1 ? "exceeded" : "warning";
    const percent = Math.round(progressRatio * 100);

    await upsertNotification({
      eventKey: `budget-threshold:${budget.id}:${windowStart}:${stage}`,
      message: `${
        budget.category?.name ?? "Categoría"
      } alcanza ${percent}% del presupuesto en el periodo actual.`,
      severity: progressRatio >= 1 ? "critical" : "warning",
      targetId: budget.id,
      targetType: "budget",
      title:
        progressRatio >= 1
          ? `Presupuesto excedido · ${budget.category?.name ?? "Categoría"}`
          : `Presupuesto en riesgo · ${budget.category?.name ?? "Categoría"}`,
      type: "budget_exceeded",
      userId: budget.user_id,
    });
    created += 1;
  }

  const anomalyStart = monthStart(addDateDays(currentMonth, -180));
  const { data: monthlySpending, error: monthlySpendingError } = await supabase
    .from("monthly_category_spending")
    .select("user_id,category_id,month,total_cents")
    .gte("month", anomalyStart)
    .lte("month", currentMonth);

  if (monthlySpendingError) {
    throw new Error(monthlySpendingError.message);
  }

  const monthlyRows = (monthlySpending ?? []) as CategoryMonthlyRow[];
  const categoryIds = [
    ...new Set(
      monthlyRows.map((row) => row.category_id).filter((row): row is string => Boolean(row)),
    ),
  ];
  const categoryMap = new Map<string, CategoryRow>();

  if (categoryIds.length) {
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("id,name,color")
      .in("id", categoryIds);

    if (categoriesError) {
      throw new Error(categoriesError.message);
    }

    for (const category of (categories ?? []) as CategoryRow[]) {
      categoryMap.set(category.id, category);
    }
  }
  const spendingByUserCategory = new Map<string, Map<string, number>>();

  for (const row of monthlyRows) {
    if (!row.category_id) {
      continue;
    }

    const key = `${row.user_id}:${row.category_id}`;

    if (!spendingByUserCategory.has(key)) {
      spendingByUserCategory.set(key, new Map());
    }

    spendingByUserCategory.get(key)!.set(row.month.slice(0, 7), row.total_cents ?? 0);
  }

  for (const [key, totalsByMonth] of spendingByUserCategory.entries()) {
    const [userId, categoryId] = key.split(":");
    const currentTotal = totalsByMonth.get(currentMonth.slice(0, 7)) ?? 0;
    const history = Array.from({ length: 6 }, (_, index) => {
      const date = parseDate(currentMonth);
      date.setUTCMonth(date.getUTCMonth() - (index + 1));
      return totalsByMonth.get(toDateString(date).slice(0, 7)) ?? 0;
    }).filter((value) => value > 0);

    if (currentTotal <= 0 || history.length < 3) {
      continue;
    }

    const mean = history.reduce((sum, value) => sum + value, 0) / history.length;
    const stdDev = standardDeviation(history);

    if (stdDev === 0 || currentTotal <= mean + stdDev * 2) {
      continue;
    }

    const category = categoryMap.get(categoryId);
    const percent = Math.round(((currentTotal - mean) / mean) * 100);

    await upsertNotification({
      eventKey: `spending-anomaly:${userId}:${categoryId}:${currentMonth}`,
      message: `${category?.name ?? "Categoría"} supera en ${percent}% su media histórica.`,
      severity: "critical",
      targetId: categoryId,
      targetType: "category",
      title: `Gasto inusual · ${category?.name ?? "Categoría"}`,
      type: "anomaly_detected",
      userId,
    });
    created += 1;
  }

  return created;
}

async function createInvestmentPriceAlerts(runDate: string) {
  const { data: investments, error: investmentsError } = await supabase
    .from("investments")
    .select("id,user_id,ticker,name,daily_price_alert_threshold_percent")
    .eq("is_active", true)
    .not("daily_price_alert_threshold_percent", "is", null)
    .is("deleted_at", null);

  if (investmentsError) {
    throw new Error(investmentsError.message);
  }

  const positionRows = (investments ?? []) as InvestmentAlertRow[];
  const tickers = [...new Set(positionRows.map((row) => row.ticker))];

  if (!tickers.length) {
    return 0;
  }

  const { data: marketRows, error: marketError } = await supabase
    .from("market_cache")
    .select("ticker,change_percent")
    .in("ticker", tickers);

  if (marketError) {
    throw new Error(marketError.message);
  }

  const marketMap = new Map<string, MarketCacheAlertRow>();
  for (const row of (marketRows ?? []) as MarketCacheAlertRow[]) {
    marketMap.set(row.ticker, row);
  }

  let created = 0;

  for (const position of positionRows) {
    const threshold = position.daily_price_alert_threshold_percent ?? null;
    const market = marketMap.get(position.ticker);
    const changePercent = market?.change_percent ?? null;

    if (threshold == null || changePercent == null || Math.abs(changePercent) < threshold) {
      continue;
    }

    const roundedChange = Math.round(changePercent * 10) / 10;
    const severity = Math.abs(changePercent) >= threshold * 1.5 ? "critical" : "warning";

    await upsertNotification({
      eventKey: `investment-alert:${position.id}:${runDate}`,
      message: `${position.name} (${position.ticker}) se mueve ${roundedChange}% en la sesión y supera tu umbral configurado.`,
      severity,
      targetId: position.id,
      targetType: "investment",
      title: `Movimiento relevante · ${position.ticker}`,
      type: "investment_alert",
      userId: position.user_id,
    });
    created += 1;
  }

  return created;
}

async function hasMatchingExpense(alert: CustomAlertRow) {
  if (!alert.category_id) {
    return false;
  }

  let query = supabase
    .from("transactions")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", alert.user_id)
    .eq("category_id", alert.category_id)
    .eq("is_income", false)
    .gte("transaction_date", paymentWindowStart(alert.due_date))
    .lte("transaction_date", paymentWindowEnd(alert.due_date))
    .is("deleted_at", null);

  if (alert.expected_amount_cents) {
    query = query.eq("amount_cents", alert.expected_amount_cents);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(count);
}

async function hasMatchingIncome(commitment: RecurringCommitmentRow, runDate: string) {
  const toleranceDays = commitment.tolerance_days ?? 3;
  let query = supabase
    .from("transactions")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", commitment.user_id)
    .eq("account_id", commitment.account_id)
    .eq("is_income", true)
    .gte("transaction_date", commitment.next_due_date)
    .lte("transaction_date", addDateDays(commitment.next_due_date, toleranceDays))
    .is("deleted_at", null);

  if (commitment.category_id) {
    query = query.eq("category_id", commitment.category_id);
  }

  const { count, error } = await query.eq("amount_cents", commitment.amount_cents);

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(count);
}

async function sendWeeklyDigest(profile: ProfileRow, runDate: string) {
  if (!resend || !resendFromEmail) {
    return false;
  }

  const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(
    profile.user_id,
  );

  if (userError || !userResult.user?.email) {
    return false;
  }

  const [{ data: alerts }, { data: notifications }] = await Promise.all([
    supabase
      .from("custom_alerts")
      .select("name,due_date")
      .eq("user_id", profile.user_id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .lte("due_date", addDateDays(runDate, 60))
      .order("due_date", { ascending: true })
      .limit(5),
    supabase
      .from("notifications")
      .select("title,message")
      .eq("user_id", profile.user_id)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const activeAlerts = alerts ?? [];
  const activeNotifications = notifications ?? [];

  if (!activeAlerts.length && !activeNotifications.length) {
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Resumen semanal de alertas</h2>
      <p>Tienes ${activeAlerts.length} alertas próximas y ${activeNotifications.length} notificaciones activas.</p>
      <ul>
        ${activeAlerts
          .map((alert) => `<li><strong>${alert.name}</strong> · vence el ${alert.due_date}</li>`)
          .join("")}
      </ul>
      <ul>
        ${activeNotifications
          .map(
            (notification) =>
              `<li><strong>${notification.title}</strong> · ${notification.message}</li>`,
          )
          .join("")}
      </ul>
    </div>
  `;

  await resend.emails.send({
    from: `${resendFromName} <${resendFromEmail}>`,
    html,
    subject: "Patrimio · Resumen semanal de alertas",
    to: userResult.user.email,
  });

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ last_alert_digest_sent_at: `${runDate}T00:00:00Z` })
    .eq("id", profile.id)
    .eq("user_id", profile.user_id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return true;
}

Deno.serve(async (request) => {
  if (!["GET", "POST"].includes(request.method)) {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const runDate = getRunDate(request);
  let createdNotifications = 0;
  let deactivatedAlerts = 0;
  let sentDigests = 0;

  const [{ data: alerts, error: alertsError }, { data: commitments, error: commitmentsError }] =
    await Promise.all([
      supabase
        .from("custom_alerts")
        .select(
          "id,user_id,name,description,category_id,due_date,advance_notice_days,expected_amount_cents,dismissed_until,auto_deactivate,is_active",
        )
        .eq("is_active", true)
        .is("deleted_at", null),
      supabase
        .from("recurring_commitments")
        .select(
          "id,user_id,account_id,category_id,name,next_due_date,advance_notice_days,tolerance_days,amount_cents,is_income,is_active",
        )
        .eq("is_active", true)
        .is("deleted_at", null),
    ]);

  if (alertsError || commitmentsError) {
    return Response.json(
      { error: alertsError?.message ?? commitmentsError?.message ?? "Unknown error" },
      { status: 500 },
    );
  }

  for (const alert of (alerts ?? []) as CustomAlertRow[]) {
    if (alert.auto_deactivate && alert.category_id && (await hasMatchingExpense(alert))) {
      const { error } = await supabase
        .from("custom_alerts")
        .update({ is_active: false })
        .eq("id", alert.id)
        .eq("user_id", alert.user_id);

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      deactivatedAlerts += 1;
      continue;
    }

    if (
      addDateDays(alert.due_date, -(alert.advance_notice_days ?? 0)) <= runDate &&
      alert.due_date >= runDate &&
      (!alert.dismissed_until || alert.dismissed_until < runDate)
    ) {
      await upsertNotification({
        eventKey: `custom-alert-due:${alert.id}:${alert.due_date}`,
        message: `${alert.name} vence el ${alert.due_date}.`,
        severity: "warning",
        targetId: alert.id,
        targetType: "custom_alert",
        title: `Próximo vencimiento · ${alert.name}`,
        type: "custom_alert_due",
        userId: alert.user_id,
      });
      createdNotifications += 1;
    }
  }

  const commitmentRows = (commitments ?? []) as RecurringCommitmentRow[];

  for (const commitment of commitmentRows) {
    const advanceNoticeDays = commitment.advance_notice_days ?? 7;

    if (
      addDateDays(commitment.next_due_date, -advanceNoticeDays) <= runDate &&
      commitment.next_due_date >= runDate
    ) {
      await upsertNotification({
        eventKey: `commitment-due:${commitment.id}:${commitment.next_due_date}`,
        message: `${commitment.name} vence el ${commitment.next_due_date}.`,
        severity: "warning",
        targetId: commitment.id,
        targetType: "commitment",
        title: `Compromiso próximo · ${commitment.name}`,
        type: "commitment_due",
        userId: commitment.user_id,
      });
      createdNotifications += 1;
    }

    const toleranceDays = commitment.tolerance_days ?? 3;

    if (
      commitment.is_income &&
      addDateDays(commitment.next_due_date, toleranceDays) < runDate &&
      !(await hasMatchingIncome(commitment, runDate))
    ) {
      await upsertNotification({
        eventKey: `expected-income-unpaid:${commitment.id}:${commitment.next_due_date}`,
        message: `${commitment.name} no se ha registrado dentro del margen esperado.`,
        severity: "critical",
        targetId: commitment.id,
        targetType: "commitment",
        title: `Ingreso esperado pendiente · ${commitment.name}`,
        type: "expected_income_unpaid",
        userId: commitment.user_id,
      });
      createdNotifications += 1;
    }
  }

  const usersWithCommitments = [...new Set(commitmentRows.map((row) => row.user_id))];

  for (const userId of usersWithCommitments) {
    const { data: projection, error: projectionError } = await supabase.rpc("project_cash_flow", {
      p_months: 12,
      p_user_id: userId,
    });

    if (projectionError) {
      return Response.json({ error: projectionError.message }, { status: 500 });
    }

    const negativeMonth = ((projection ?? []) as ProjectionRow[]).find(
      (entry) => entry.net_cents < 0,
    );

    if (!negativeMonth) {
      continue;
    }

    await upsertNotification({
      eventKey: `negative-projection:${userId}:${negativeMonth.month_date}`,
      message: `La proyección mensual cae por debajo de cero en ${negativeMonth.month_date}.`,
      severity: "critical",
      targetId: null,
      targetType: "projection",
      title: "Flujo proyectado negativo",
      type: "anomaly_detected",
      userId,
    });
    createdNotifications += 1;
  }

  createdNotifications += await createBudgetAndAnomalyNotifications(runDate);
  if (isMonday(runDate)) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id,user_id,locale,weekly_alert_digest_enabled,last_alert_digest_sent_at")
      .eq("weekly_alert_digest_enabled", true)
      .is("deleted_at", null);

    if (profilesError) {
      return Response.json({ error: profilesError.message }, { status: 500 });
    }

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      const lastSentDate = profile.last_alert_digest_sent_at
        ? toDateString(parseDate(profile.last_alert_digest_sent_at.slice(0, 10)))
        : null;

      if (lastSentDate && addDateDays(lastSentDate, 6) > runDate) {
        continue;
      }

      if (await sendWeeklyDigest(profile, runDate)) {
        sentDigests += 1;
      }
    }
  }

  return Response.json({
    createdNotifications,
    deactivatedAlerts,
    runDate,
    sentDigests,
  });
});
