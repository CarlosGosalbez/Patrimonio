import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import XLSX from "xlsx";
import { detectDuplicates } from "@/lib/imports/fuzzy-dedup";
import { parseCurrencyInput } from "@/lib/financial/formatters";
import { handleApiError } from "@/lib/errors/api-error-handler";

interface ParsedRow {
  amount_cents: number;
  description: string;
  transaction_date: string;
}

function detectBankFormat(rows: unknown[]): "santander" | "bbva" | "generic" {
  if (!Array.isArray(rows) || rows.length === 0) return "generic";

  const firstRow = rows[0] as Record<string, unknown>;
  const keys = Object.keys(firstRow).map((k) => k.toLowerCase());

  if (keys.some((k) => k.includes("santander") || k.includes("importe eur"))) return "santander";
  if (keys.some((k) => k.includes("bbva") || k.includes("saldo"))) return "bbva";

  return "generic";
}

function mapTransaction(row: Record<string, unknown>, format: string): ParsedRow | null {
  try {
    let date: string;
    let description: string;
    let amount: number;

    if (format === "santander") {
      date = String(row["Fecha"] || row["fecha"] || "");
      description = String(row["Concepto"] || row["concepto"] || row["Descripción"] || "");
      amount = parseCurrencyInput(String(row["Importe EUR"] || row["importe"] || "0"));
    } else if (format === "bbva") {
      date = String(row["Fecha"] || row["fecha"] || "");
      description = String(row["Concepto"] || row["concepto"] || "");
      amount = parseCurrencyInput(String(row["Importe"] || row["importe"] || "0"));
    } else {
      const dateKey = Object.keys(row).find(
        (k) => k.toLowerCase().includes("fecha") || k.toLowerCase().includes("date"),
      );
      const descKey = Object.keys(row).find(
        (k) =>
          k.toLowerCase().includes("concepto") ||
          k.toLowerCase().includes("descripcion") ||
          k.toLowerCase().includes("description"),
      );
      const amountKey = Object.keys(row).find(
        (k) => k.toLowerCase().includes("importe") || k.toLowerCase().includes("amount"),
      );

      date = dateKey ? String(row[dateKey]) : "";
      description = descKey ? String(row[descKey]) : "";
      amount = amountKey ? parseCurrencyInput(String(row[amountKey])) : 0;
    }

    if (!date || !description || amount === 0) return null;

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return null;

    return {
      amount_cents: amount,
      description: description.trim(),
      transaction_date: parsedDate.toISOString().split("T")[0],
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const fileName = file?.name;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return new Response("Unauthorized", { status: 401 });

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const format = detectBankFormat(rows);
    const mapped = rows
      .map((row) => mapTransaction(row as Record<string, unknown>, format))
      .filter((row): row is ParsedRow => row !== null);

    if (mapped.length === 0) {
      return NextResponse.json({ error: "No valid transactions found" }, { status: 400 });
    }

    const duplicates = await detectDuplicates(supabase, user.id, mapped);

    const batchId = crypto.randomUUID();

    return NextResponse.json({
      batchId,
      duplicates: duplicates.length,
      format,
      preview: mapped.slice(0, 10),
      total: mapped.length,
    });
  } catch (error) {
    return handleApiError({
      error,
      message: "Error al procesar el archivo Excel",
      statusCode: 500,
      context: { fileName },
    });
  }
}
