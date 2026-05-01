import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAccountExcel } from "@/lib/reports/excel";
import { handleApiError } from "@/lib/errors/api-error-handler";

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

  try {
    // Verify account belongs to user (RLS enforces this, but explicit check for clarity)
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id,name")
      .eq("id", account_id)
      .is("deleted_at", null)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Fetch transactions for the account
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select(
        "transaction_date,description,amount_cents,is_income,currency,notes,category:categories(name)",
      )
      .eq("account_id", account_id)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false });

    if (txError) {
      return handleApiError({
        error: txError,
        message: "Error al obtener las transacciones",
        statusCode: 500,
        context: { accountId: account_id },
      });
    }

    const buffer = buildAccountExcel(account.name, transactions ?? []);
    const fileName = `patrimio-cuenta-${account.name.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return handleApiError({
      error,
      message: "Error al generar el reporte de cuenta",
      statusCode: 500,
      context: { accountId: account_id },
    });
  }
}
