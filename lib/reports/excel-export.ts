import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { formatCurrency } from "@/lib/financial/formatters";

export async function generateFinancialReport(
  supabase: SupabaseClient<Database>,
  userId: string,
  year: number,
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Patrimio";
  workbook.created = new Date();
  workbook.modified = new Date();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*,account:accounts(name),category:categories(name)")
    .eq("user_id", userId)
    .gte("transaction_date", `${year}-01-01`)
    .lte("transaction_date", `${year}-12-31`)
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false });

  const summary = workbook.addWorksheet("Resumen Anual");
  summary.columns = [
    { header: "Mes", key: "month", width: 15 },
    { header: "Ingresos", key: "income", width: 15 },
    { header: "Gastos", key: "expenses", width: 15 },
    { header: "Balance", key: "balance", width: 15 },
  ];

  const monthlyData = new Map<string, { income: number; expenses: number }>();
  for (let m = 1; m <= 12; m++) {
    const month = `${year}-${String(m).padStart(2, "0")}`;
    monthlyData.set(month, { income: 0, expenses: 0 });
  }

  for (const tx of transactions ?? []) {
    const month = tx.transaction_date.slice(0, 7);
    const data = monthlyData.get(month);
    if (data) {
      if (tx.amount_cents > 0) data.income += tx.amount_cents;
      else data.expenses += Math.abs(tx.amount_cents);
    }
  }

  for (const [month, data] of monthlyData) {
    summary.addRow({
      month,
      income: formatCurrency(data.income),
      expenses: formatCurrency(data.expenses),
      balance: formatCurrency(data.income - data.expenses),
    });
  }

  const txSheet = workbook.addWorksheet("Transacciones");
  txSheet.columns = [
    { header: "Fecha", key: "date", width: 12 },
    { header: "Descripción", key: "description", width: 40 },
    { header: "Categoría", key: "category", width: 20 },
    { header: "Cuenta", key: "account", width: 20 },
    { header: "Importe", key: "amount", width: 15 },
  ];

  for (const tx of transactions ?? []) {
    txSheet.addRow({
      date: tx.transaction_date,
      description: tx.description,
      category: (tx.category as unknown as { name: string })?.name ?? "Sin categoría",
      account: (tx.account as unknown as { name: string })?.name ?? "Sin cuenta",
      amount: formatCurrency(tx.amount_cents),
    });
  }

  const { data: investments } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null);

  const invSheet = workbook.addWorksheet("Inversiones");
  invSheet.columns = [
    { header: "Ticker", key: "ticker", width: 12 },
    { header: "Nombre", key: "name", width: 30 },
    { header: "Tipo", key: "type", width: 15 },
    { header: "Moneda", key: "currency", width: 10 },
  ];

  for (const inv of investments ?? []) {
    invSheet.addRow({
      ticker: inv.ticker,
      name: inv.name,
      type: inv.investment_type,
      currency: inv.currency,
    });
  }

  const { data: budgets } = await supabase
    .from("budgets")
    .select("*,category:categories(name)")
    .eq("user_id", userId)
    .gte("start_date", `${year}-01-01`)
    .lte("end_date", `${year}-12-31`)
    .is("deleted_at", null);

  const budgetSheet = workbook.addWorksheet("Presupuestos");
  budgetSheet.columns = [
    { header: "Categoría", key: "category", width: 25 },
    { header: "Presupuesto", key: "budget", width: 15 },
    { header: "Gastado", key: "spent", width: 15 },
    { header: "Disponible", key: "available", width: 15 },
  ];

  for (const budget of budgets ?? []) {
    const spent = (transactions ?? [])
      .filter((tx) => tx.category_id === budget.category_id && tx.amount_cents < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0);

    budgetSheet.addRow({
      category: (budget.category as unknown as { name: string })?.name ?? "Sin categoría",
      budget: formatCurrency(budget.limit_cents),
      spent: formatCurrency(spent),
      available: formatCurrency(budget.limit_cents - spent),
    });
  }

  return await workbook.xlsx.writeBuffer();
}
