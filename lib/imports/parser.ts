import type {
  ColumnMapping,
  ImportFileFormat,
  ImportTargetField,
  NormalizedImportRowInput,
  ParsedStatementFile,
  SupportedBank,
} from "@/lib/imports/types";

const BANK_SIGNATURES: Array<{
  bank: SupportedBank;
  fileNamePatterns: RegExp[];
  headerPatterns: RegExp[];
}> = [
  {
    bank: "santander",
    fileNamePatterns: [/santander/i],
    headerPatterns: [/concepto/i, /importe/i, /fecha/i],
  },
  {
    bank: "bbva",
    fileNamePatterns: [/bbva/i],
    headerPatterns: [/fecha operaci/i, /descrip/i, /importe/i],
  },
  {
    bank: "caixabank",
    fileNamePatterns: [/caixa/i, /imagin/i],
    headerPatterns: [/descrip/i, /fecha valor/i, /importe/i],
  },
  {
    bank: "ing",
    fileNamePatterns: [/\bing\b/i],
    headerPatterns: [/f\..*valor|fecha valor/i, /descripci/i, /importe/i],
  },
  {
    bank: "sabadell",
    fileNamePatterns: [/sabadell/i],
    headerPatterns: [/fecha/i, /concepto/i, /importe/i],
  },
];

const FIELD_ALIASES: Record<ImportTargetField, RegExp[]> = {
  amount: [/importe/i, /\bamount\b/i, /\bcantidad\b/i, /\bmonto\b/i],
  credit: [/\babono\b/i, /\bhaber\b/i, /\bcredit\b/i, /\bingreso\b/i],
  debit: [/\bcargo\b/i, /\bdebe\b/i, /\bdebit\b/i, /\bgasto\b/i],
  description: [/\bconcepto\b/i, /\bdescrip/i, /\bdetalle\b/i, /\bmemo\b/i, /\bname\b/i],
  external_id: [/\bfitid\b/i, /\breferencia\b/i, /\boperation id\b/i, /\bid movimiento\b/i],
  notes: [/\bnota/i, /\bobserv/i, /\bnotes?\b/i],
  transaction_date: [/\bfecha\b/i, /\bdate\b/i, /\bposted\b/i, /\boperaci/i],
  type: [/\btipo\b/i, /\btype\b/i, /\btrntype\b/i],
  value_date: [/\bvalor\b/i, /\bsettlement\b/i],
};

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function parseIsoDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const ofxMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofxMatch) {
    return `${ofxMatch[1]}-${ofxMatch[2]}-${ofxMatch[3]}`;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const day = slashMatch[1]!.padStart(2, "0");
    const month = slashMatch[2]!.padStart(2, "0");
    const year = slashMatch[3]!.length === 2 ? `20${slashMatch[3]}` : slashMatch[3]!;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function parseAmount(value: string) {
  const cleaned = value.replace(/[^\d,.\-+()]/g, "").replace(/\s+/g, "");

  if (!cleaned) {
    return null;
  }

  let normalized = cleaned;

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  const decimalSeparator = lastComma > lastDot ? "," : ".";

  if (lastComma !== -1 || lastDot !== -1) {
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = normalized.split(thousandsSeparator).join("");
    if (decimalSeparator === ",") {
      normalized = normalized.replace(",", ".");
    }
  }

  if (normalized.startsWith("(") && normalized.endsWith(")")) {
    normalized = `-${normalized.slice(1, -1)}`;
  }

  const amount = Number.parseFloat(normalized);

  if (Number.isNaN(amount)) {
    return null;
  }

  return Math.round(amount * 100);
}

function inferType(value: string) {
  const normalized = normalizeHeader(value).toLowerCase();

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("abono") ||
    normalized.includes("ingreso") ||
    normalized.includes("credit") ||
    normalized.includes("deposit")
  ) {
    return true;
  }

  if (
    normalized.includes("cargo") ||
    normalized.includes("gasto") ||
    normalized.includes("debit") ||
    normalized.includes("withdraw")
  ) {
    return false;
  }

  return null;
}

function normalizeMerchantKey(description: string) {
  return normalizeHeader(description)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3)
    .slice(0, 3)
    .join(" ");
}

function getTextScore(values: string[]) {
  if (!values.length) {
    return 0;
  }

  const avgLength = values.reduce((sum, value) => sum + value.length, 0) / values.length;
  return Math.min(avgLength / 20, 1);
}

function getDateScore(values: string[]) {
  const hits = values.filter((value) => parseIsoDate(value)).length;
  return values.length ? hits / values.length : 0;
}

function getAmountScore(values: string[]) {
  const hits = values.filter((value) => parseAmount(value) !== null).length;
  return values.length ? hits / values.length : 0;
}

function scoreHeader(
  field: ImportTargetField,
  header: string,
  samples: string[],
  sourceBank: SupportedBank,
) {
  const normalized = normalizeHeader(header);
  let score = 0;

  if (FIELD_ALIASES[field].some((pattern) => pattern.test(normalized))) {
    score += 3;
  }

  if (field === "transaction_date" || field === "value_date") {
    score += getDateScore(samples) * 2;
  }

  if (field === "amount" || field === "credit" || field === "debit") {
    score += getAmountScore(samples) * 2;
  }

  if (field === "description" || field === "notes") {
    score += getTextScore(samples);
  }

  if (sourceBank !== "generic" && normalized.toLowerCase().includes(sourceBank)) {
    score += 0.5;
  }

  return score;
}

function pickBestColumn(
  field: ImportTargetField,
  headers: string[],
  rows: string[][],
  sourceBank: SupportedBank,
  usedColumns: Set<number>,
) {
  const scored = headers
    .map((header, index) => ({
      index,
      score: scoreHeader(
        field,
        header,
        rows
          .slice(0, 12)
          .map((row) => row[index] ?? "")
          .filter(Boolean),
        sourceBank,
      ),
    }))
    .filter((entry) => !usedColumns.has(entry.index))
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  return best && best.score >= 1 ? best.index : undefined;
}

function rowsFromArrayOfArrays(input: unknown[][]) {
  const nonEmptyRows = input
    .map((row) => row.map(normalizeCell))
    .filter((row) => row.some(Boolean));

  if (!nonEmptyRows.length) {
    return { headers: [], rawRows: [] };
  }

  const [headerRow, ...rows] = nonEmptyRows;
  return {
    headers: headerRow.map((value, index) => value || `column_${index + 1}`),
    rawRows: rows,
  };
}

export function detectImportFileFormat(fileName: string): ImportFileFormat {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".xls")) return "xls";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".ofx")) return "ofx";
  if (lower.endsWith(".qif")) return "qif";

  throw new Error(`Unsupported file format: ${fileName}`);
}

export function detectSourceBank(headers: string[], fileName: string): SupportedBank {
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const signature of BANK_SIGNATURES) {
    const fileNameMatch = signature.fileNamePatterns.some((pattern) => pattern.test(fileName));
    const headerMatches = signature.headerPatterns.filter((pattern) =>
      normalizedHeaders.some((header) => pattern.test(header)),
    ).length;

    if (fileNameMatch || headerMatches >= 2) {
      return signature.bank;
    }
  }

  return "generic";
}

export function detectColumnMapping(
  headers: string[],
  rows: string[][],
  sourceBank: SupportedBank,
): ColumnMapping {
  const usedColumns = new Set<number>();
  const mapping: ColumnMapping = {};

  for (const field of [
    "transaction_date",
    "description",
    "amount",
    "credit",
    "debit",
    "type",
    "value_date",
    "notes",
    "external_id",
  ] as const) {
    const index = pickBestColumn(field, headers, rows, sourceBank, usedColumns);

    if (index !== undefined) {
      mapping[field] = index;
      if (!["credit", "debit"].includes(field)) {
        usedColumns.add(index);
      }
    }
  }

  if (
    mapping.amount !== undefined &&
    (mapping.credit !== undefined || mapping.debit !== undefined)
  ) {
    delete mapping.credit;
    delete mapping.debit;
  }

  return mapping;
}

export function normalizeStatementRows({
  mapping,
  rawRows,
}: {
  mapping: ColumnMapping;
  rawRows: string[][];
}): NormalizedImportRowInput[] {
  return rawRows
    .map((row, index) => {
      const transactionDate =
        mapping.transaction_date !== undefined
          ? parseIsoDate(row[mapping.transaction_date] ?? "")
          : mapping.value_date !== undefined
            ? parseIsoDate(row[mapping.value_date] ?? "")
            : null;
      const valueDate =
        mapping.value_date !== undefined ? parseIsoDate(row[mapping.value_date] ?? "") : null;
      const description =
        mapping.description !== undefined ? normalizeCell(row[mapping.description]) : "";
      const notes = mapping.notes !== undefined ? normalizeCell(row[mapping.notes]) || null : null;
      const externalId =
        mapping.external_id !== undefined ? normalizeCell(row[mapping.external_id]) || null : null;
      const explicitAmount =
        mapping.amount !== undefined ? parseAmount(row[mapping.amount] ?? "") : null;
      const creditAmount =
        mapping.credit !== undefined ? parseAmount(row[mapping.credit] ?? "") : null;
      const debitAmount =
        mapping.debit !== undefined ? parseAmount(row[mapping.debit] ?? "") : null;
      const typedIncome = mapping.type !== undefined ? inferType(row[mapping.type] ?? "") : null;

      if (!transactionDate || !description) {
        return null;
      }

      let amountCents = explicitAmount;
      let isIncome = typedIncome;

      if (amountCents === null) {
        if (creditAmount !== null && creditAmount > 0) {
          amountCents = Math.abs(creditAmount);
          isIncome = true;
        } else if (debitAmount !== null && debitAmount !== 0) {
          amountCents = Math.abs(debitAmount);
          isIncome = false;
        }
      } else {
        if (isIncome === null) {
          isIncome = amountCents > 0;
        }
        amountCents = Math.abs(amountCents);
      }

      if (!amountCents || isIncome === null) {
        return null;
      }

      return {
        amount_cents: amountCents,
        description,
        external_id: externalId,
        is_income: isIncome,
        merchant_key: normalizeMerchantKey(description),
        notes,
        source_row_index: index,
        transaction_date: transactionDate,
        value_date: valueDate,
      };
    })
    .filter((row): row is NormalizedImportRowInput => Boolean(row));
}

export function parseOfxContent(content: string, fileName: string): ParsedStatementFile {
  const blocks = content.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) ?? [];

  const rawRows = blocks.map((block) => {
    const readTag = (tag: string) => {
      const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, "i"));
      return match?.[1]?.trim() ?? "";
    };

    return [
      readTag("DTPOSTED"),
      readTag("DTUSER"),
      readTag("TRNAMT"),
      readTag("TRNTYPE"),
      readTag("NAME") || readTag("MEMO"),
      readTag("MEMO"),
      readTag("FITID"),
    ];
  });

  const headers = [
    "posted_date",
    "value_date",
    "amount",
    "type",
    "description",
    "notes",
    "external_id",
  ];
  const sourceBank = detectSourceBank(headers, fileName);

  return {
    fileName,
    headers,
    rawRows,
    sheetName: null,
    sourceBank,
    sourceFormat: "ofx",
  };
}

export function parseQifContent(content: string, fileName: string): ParsedStatementFile {
  const rows: string[][] = [];
  const current: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line === "^") {
      rows.push([
        current.D ?? "",
        current.T ?? "",
        current.P ?? "",
        current.M ?? "",
        current.N ?? "",
      ]);
      Object.keys(current).forEach((key) => delete current[key]);
      continue;
    }

    current[line[0]!] = line.slice(1).trim();
  }

  const headers = ["transaction_date", "amount", "description", "notes", "type"];
  const sourceBank = detectSourceBank(headers, fileName);

  return {
    fileName,
    headers,
    rawRows: rows,
    sheetName: null,
    sourceBank,
    sourceFormat: "qif",
  };
}

export async function parseStatementFile(file: File): Promise<ParsedStatementFile> {
  const fileName = file.name;
  const sourceFormat = detectImportFileFormat(fileName);

  if (sourceFormat === "ofx" || sourceFormat === "qif") {
    const content = await file.text();
    return sourceFormat === "ofx"
      ? parseOfxContent(content, fileName)
      : parseQifContent(content, fileName);
  }

  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Statement file is empty");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const arrayRows = XLSX.utils.sheet_to_json(worksheet, {
    blankrows: false,
    defval: "",
    header: 1,
    raw: false,
  }) as unknown[][];

  const { headers, rawRows } = rowsFromArrayOfArrays(arrayRows);
  const sourceBank = detectSourceBank(headers, fileName);

  return {
    fileName,
    headers,
    rawRows,
    sheetName: firstSheetName,
    sourceBank,
    sourceFormat,
  };
}
