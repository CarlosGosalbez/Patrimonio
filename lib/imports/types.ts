import type { TransactionCategorySummary } from "@/lib/commitments/types";

export type ImportFileFormat = "xlsx" | "xls" | "csv" | "ofx" | "qif";

export type SupportedBank = "santander" | "bbva" | "caixabank" | "ing" | "sabadell" | "generic";

export type ImportBatchStatus = "processing" | "confirmed" | "rolled_back" | "failed";

export type ImportTargetField =
  | "transaction_date"
  | "value_date"
  | "description"
  | "amount"
  | "credit"
  | "debit"
  | "type"
  | "notes"
  | "external_id";

export interface ParsedStatementFile {
  fileName: string;
  headers: string[];
  rawRows: string[][];
  sheetName: string | null;
  sourceBank: SupportedBank;
  sourceFormat: ImportFileFormat;
}

export type ColumnMapping = Partial<Record<ImportTargetField, number>>;

export interface NormalizedImportRowInput {
  amount_cents: number;
  description: string;
  external_id: string | null;
  is_income: boolean;
  merchant_key: string | null;
  notes: string | null;
  source_row_index: number;
  transaction_date: string;
  value_date: string | null;
}

export interface ImportDuplicateCandidate {
  confidence: number;
  existing_amount_cents: number;
  existing_description: string;
  existing_id: string;
  existing_transaction_date: string;
  reason: "exact" | "fuzzy_date" | "fuzzy_description";
}

export interface ImportUnexpectedChargeMatch {
  cancelled_at: string;
  commitment_id: string;
  commitment_name: string;
  service_name: string;
}

export interface ImportCategorySuggestion {
  category_id: string | null;
  confidence: number;
  matched_pattern: string | null;
  source: "rule" | "merchant" | null;
}

export interface ImportPreviewRow extends NormalizedImportRowInput {
  category: TransactionCategorySummary | null;
  duplicate: ImportDuplicateCandidate | null;
  duplicate_in_file: boolean;
  should_import: boolean;
  unexpected_charge: ImportUnexpectedChargeMatch | null;
}

export interface ImportPreviewResponse {
  rows: ImportPreviewRow[];
  similar_merchants: Array<{
    label: string;
    merchant_key: string;
    row_count: number;
  }>;
  summary: {
    category_suggestion_count: number;
    duplicate_count: number;
    duplicate_in_file_count: number;
    expected_income_gap_count: number;
    imported_candidate_count: number;
    row_count: number;
    source_range_end: string | null;
    source_range_start: string | null;
    unexpected_charge_count: number;
  };
}

export interface ConfirmImportRowInput extends NormalizedImportRowInput {
  category_id: string | null;
  should_import?: boolean;
}

export interface ConfirmImportResponse {
  batch: ImportBatchListItem;
  imported_transaction_count: number;
  notification_count: number;
}

export interface ImportBatchListItem {
  account: {
    color: string | null;
    currency: string;
    id: string;
    name: string;
  } | null;
  completed_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  duplicate_count: number;
  expected_income_gap_count: number;
  file_name: string;
  id: string;
  imported_count: number;
  row_count: number;
  rolled_back_at: string | null;
  source_bank: string | null;
  source_format: ImportFileFormat;
  source_range_end: string | null;
  source_range_start: string | null;
  status: ImportBatchStatus;
  unexpected_charge_count: number;
}

export interface ImportBatchesResponse {
  batches: ImportBatchListItem[];
}
