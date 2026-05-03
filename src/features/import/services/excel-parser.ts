import ExcelJS from "exceljs";
import { ParsedTransaction } from "@/types/supabase-responses";

export async function parseINGExcel(file: File): Promise<ParsedTransaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          reject(new Error("No se encontró hoja de cálculo en el archivo"));
          return;
        }

        const transactions: ParsedTransaction[] = [];

        // Skip header row, start from row 2
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header

          const cells = row.values as (string | number | Date | null)[];
          // ING format: Fecha, Concepto, Importe, Saldo
          const fecha = cells[1];
          const concepto = cells[2];
          const importe = cells[3];

          if (!concepto || !importe) return;

          const amount = parseFloat(String(importe).replace(",", "."));
          const description = String(concepto).trim();
          const date = parseExcelDate(fecha);

          transactions.push({
            date,
            description,
            amount,
            type: amount >= 0 ? "income" : "expense",
            category: categorizeTransaction(description),
            currency: "EUR",
            notes: null,
          });
        });

        resolve(transactions);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        reject(new Error(`Error al parsear ING Excel: ${message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error al leer el archivo"));
    };

    reader.readAsArrayBuffer(file);
  });
}

export async function parseTradeRepublicExcel(file: File): Promise<ParsedTransaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          reject(new Error("Archivo CSV vacío o inválido"));
          return;
        }

        // TradeRepublic CSV format: Date,Type,Description,Amount
        const transactions: ParsedTransaction[] = lines
          .slice(1)
          .map((line) => {
            const values = line.split(",");
            const date = values[0]?.trim() || "";
            const type = values[1]?.trim() || "";
            const description = values[2]?.trim() || "";
            const amount = parseFloat(values[3]?.trim() || "0");

            return {
              date,
              description,
              amount,
              type: amount >= 0 ? ("income" as const) : ("expense" as const),
              category: categorizeTransaction(description),
              currency: "EUR",
              notes: `TradeRepublic - ${type}`,
            };
          })
          .filter((t) => t.description && !isNaN(t.amount));

        resolve(transactions);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        reject(new Error(`Error al parsear TradeRepublic CSV: ${message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error al leer el archivo"));
    };

    reader.readAsText(file);
  });
}

function parseExcelDate(serial: string | number | Date | null | undefined): string {
  // Handle null/undefined
  if (!serial) {
    return new Date().toISOString().split("T")[0] || "";
  }

  // Excel dates are serial numbers from 1900-01-01
  if (typeof serial === "number") {
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0] || "";
  }

  // Handle Date objects
  if (serial instanceof Date) {
    return serial.toISOString().split("T")[0] || "";
  }

  // Try to parse as string date
  const parsed = new Date(serial);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0] || "";
  }

  return new Date().toISOString().split("T")[0] || "";
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();

  if (desc.includes("mercadona") || desc.includes("carrefour") || desc.includes("supermercado")) {
    return "Alimentación";
  }
  if (desc.includes("gasolina") || desc.includes("repsol") || desc.includes("cepsa")) {
    return "Transporte";
  }
  if (
    desc.includes("alquiler") ||
    desc.includes("luz") ||
    desc.includes("agua") ||
    desc.includes("gas")
  ) {
    return "Vivienda";
  }
  if (desc.includes("netflix") || desc.includes("spotify") || desc.includes("amazon")) {
    return "Suscripciones";
  }
  if (desc.includes("nomina") || desc.includes("salario")) {
    return "Salario";
  }
  if (desc.includes("dividendo")) {
    return "Dividendos";
  }
  if (desc.includes("hipoteca")) {
    return "Hipoteca";
  }

  return "Otros";
}
