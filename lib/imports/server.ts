import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  buildImportDedupeKey,
  detectDuplicateRowsInFile,
  detectPossibleDuplicate,
  detectUnexpectedCharge,
  findExpectedIncomeGapsAfterImport,
  suggestCategory,
  type AutoCategorizationRuleMatch,
  type CancelledSubscriptionMatch,
  type ExistingTransactionMatch,
  type IncomeCommitmentGapCandidate,
} from "@/lib/imports/matching";
import type {
  ConfirmImportResponse,
  ConfirmImportRowInput,
  ImportBatchListItem,
  ImportBatchesResponse,
  ImportPreviewResponse,
  ImportPreviewRow,
  NormalizedImportRowInput,
} from "@/lib/imports/types";
import type { TransactionCategorySummary } from "@/lib/commitments/types";

type ServerClient = SupabaseClient<Database>;
type ImportClient = SupabaseClient<any>;
type Translator = (key: string, values?: any) => string;

type TransactionListRow = Pick<
  Database["public"]["Tables"]["transactions"]["Row"],
  | "account_id"
  | "amount_cents"
  | "category_id"
  | "description"
  | "id"
  | "import_dedupe_key"
  | "is_income"
  | "recurring_id"
  | "transaction_date"
>;

interface ImportBatchRow {
  account: ImportBatchListItem["account"];
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
  source_format: ImportBatchListItem["source_format"];
  source_range_end: string | null;
  source_range_start: string | null;
  status: ImportBatchListItem["status"];
  unexpected_charge_count: number;
}

interface ImportAnalysisResult {
  expectedIncomeGaps: IncomeCommitmentGapCandidate[];
  rows: ImportPreviewRow[];
  summary: ImportPreviewResponse["summary"];
}

function asImportClient(supabase: ServerClient) {
  return supabase as unknown as ImportClient;
}

function getImportBatchSelect() {
  return `
    id,
    file_name,
    source_format,
    source_bank,
    status,
    row_count,
    imported_count,
    duplicate_count,
    unexpected_charge_count,
    expected_income_gap_count,
    source_range_start,
    source_range_end,
    created_at,
    confirmed_at,
    completed_at,
    rolled_back_at,
    account:accounts(id,name,currency,color)
  `;
}

function mapBatch(row: ImportBatchRow): ImportBatchListItem {
  return {
    account: row.account,
    completed_at: row.completed_at,
    confirmed_at: row.confirmed_at,
    created_at: row.created_at,
    duplicate_count: row.duplicate_count,
    expected_income_gap_count: row.expected_income_gap_count,
    file_name: row.file_name,
    id: row.id,
    imported_count: row.imported_count,
    row_count: row.row_count,
    rolled_back_at: row.rolled_back_at,
    source_bank: row.source_bank,
    source_format: row.source_format,
    source_range_end: row.source_range_end,
    source_range_start: row.source_range_start,
    status: row.status,
    unexpected_charge_count: row.unexpected_charge_count,
  };
}

function getDateRange(rows: NormalizedImportRowInput[]) {
  const orderedDates = [...rows.map((row) => row.transaction_date)].sort();
  return {
    end: orderedDates.at(-1) ?? null,
    start: orderedDates[0] ?? null,
  };
}

async function getImportContext({
  accountId,
  rows,
  supabase,
  userId,
}: {
  accountId: string;
  rows: NormalizedImportRowInput[];
  supabase: ServerClient;
  userId: string;
}) {
  const dateRange = getDateRange(rows);
  const duplicateWindowStart = dateRange.start
    ? new Date(`${dateRange.start}T00:00:00`)
    : new Date();
  const duplicateWindowEnd = dateRange.end ? new Date(`${dateRange.end}T00:00:00`) : new Date();

  duplicateWindowStart.setDate(duplicateWindowStart.getDate() - 2);
  duplicateWindowEnd.setDate(duplicateWindowEnd.getDate() + 2);

  const importRangeStart = duplicateWindowStart.toISOString().slice(0, 10);
  const importRangeEnd = duplicateWindowEnd.toISOString().slice(0, 10);

  const [{ data: incomeCommitmentsData, error: incomeCommitmentsError }] = await Promise.all([
    supabase
      .from("recurring_commitments")
      .select(
        "id,name,account_id,amount_cents,is_income,next_due_date,tolerance_days,is_active,deleted_at",
      )
      .eq("user_id", userId)
      .eq("is_income", true)
      .is("deleted_at", null),
  ]);

  if (incomeCommitmentsError) {
    throw new Error(incomeCommitmentsError.message);
  }

  const incomeCommitments = (
    (incomeCommitmentsData ?? []) as Array<{
      account_id: string;
      amount_cents: number;
      deleted_at: string | null;
      id: string;
      is_active: boolean;
      is_income: boolean;
      name: string;
      next_due_date: string;
      tolerance_days: number | null;
    }>
  ).map((commitment) => ({
    account_id: commitment.account_id,
    amount_cents: commitment.amount_cents,
    id: commitment.id,
    is_income: commitment.is_income,
    name: commitment.name,
    next_due_date: commitment.next_due_date,
    status: commitment.is_active ? "active" : "paused",
    tolerance_days: commitment.tolerance_days,
  })) satisfies IncomeCommitmentGapCandidate[];

  const earliestIncomeDate =
    incomeCommitments.length > 0
      ? [...incomeCommitments.map((commitment) => commitment.next_due_date)].sort()[0]
      : importRangeStart;

  const [
    { data: existingTransactionsData, error: existingTransactionsError },
    { data: incomeTransactionsData, error: incomeTransactionsError },
    { data: cancelledSubscriptionsData, error: cancelledSubscriptionsError },
    { data: rulesData, error: rulesError },
    { data: categoriesData, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("id,account_id,amount_cents,description,transaction_date")
      .eq("user_id", userId)
      .gte("transaction_date", importRangeStart)
      .lte("transaction_date", importRangeEnd)
      .is("deleted_at", null),
    supabase
      .from("transactions")
      .select("account_id,amount_cents,is_income,recurring_id,transaction_date")
      .eq("user_id", userId)
      .eq("is_income", true)
      .gte("transaction_date", earliestIncomeDate)
      .is("deleted_at", null),
    supabase
      .from("recurring_commitments")
      .select("id,name,service_name,cancelled_at")
      .eq("user_id", userId)
      .eq("commitment_type", "subscription")
      .not("cancelled_at", "is", null)
      .not("service_name", "is", null)
      .is("deleted_at", null),
    supabase
      .from("auto_categorization_rules")
      .select("category_id,pattern,is_regex,is_case_sensitive,priority")
      .eq("user_id", userId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("priority", { ascending: false }),
    supabase
      .from("categories")
      .select("id,name,color,icon,is_income,user_id")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (existingTransactionsError) {
    throw new Error(existingTransactionsError.message);
  }

  if (incomeTransactionsError) {
    throw new Error(incomeTransactionsError.message);
  }

  if (cancelledSubscriptionsError) {
    throw new Error(cancelledSubscriptionsError.message);
  }

  if (rulesError) {
    throw new Error(rulesError.message);
  }

  if (categoriesError) {
    throw new Error(categoriesError.message);
  }

  return {
    cancelledSubscriptions: (cancelledSubscriptionsData ?? []) as CancelledSubscriptionMatch[],
    categories: (categoriesData ?? []) as TransactionCategorySummary[],
    existingTransactions: (existingTransactionsData ?? []) as ExistingTransactionMatch[],
    incomeCommitments,
    incomeTransactions: (incomeTransactionsData ?? []) as Array<
      Pick<
        TransactionListRow,
        "account_id" | "amount_cents" | "is_income" | "recurring_id" | "transaction_date"
      >
    >,
    rules: (rulesData ?? []) as AutoCategorizationRuleMatch[],
  };
}

async function analyzeImportRows({
  accountId,
  rows,
  supabase,
  userId,
}: {
  accountId: string;
  rows: NormalizedImportRowInput[];
  supabase: ServerClient;
  userId: string;
}): Promise<ImportAnalysisResult> {
  const context = await getImportContext({ accountId, rows, supabase, userId });
  const duplicateKeys = detectDuplicateRowsInFile(rows);
  const categoryMap = new Map(context.categories.map((category) => [category.id, category]));

  const previewRows = rows.map<ImportPreviewRow>((row) => {
    const duplicate = detectPossibleDuplicate(accountId, row, context.existingTransactions);
    const duplicateInFileKey = `${row.transaction_date}:${row.amount_cents}:${row.description
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()}`;
    const duplicate_in_file = (duplicateKeys.get(duplicateInFileKey) ?? 0) > 1;
    const categorySuggestion = suggestCategory(row, context.rules, context.categories);
    const category = categorySuggestion.category_id
      ? (categoryMap.get(categorySuggestion.category_id) ?? null)
      : null;
    const unexpected_charge = detectUnexpectedCharge(row, context.cancelledSubscriptions);
    const should_import = !duplicate_in_file && (duplicate?.confidence ?? 0) < 0.9;

    return {
      ...row,
      category,
      duplicate,
      duplicate_in_file,
      should_import,
      unexpected_charge,
    };
  });

  const importedCandidateTransactions = previewRows
    .filter((row) => row.should_import)
    .map((row) => ({
      account_id: accountId,
      amount_cents: row.amount_cents,
      is_income: row.is_income,
      recurring_id: null,
      transaction_date: row.transaction_date,
    }));

  const expectedIncomeGaps = findExpectedIncomeGapsAfterImport(context.incomeCommitments, [
    ...context.incomeTransactions,
    ...importedCandidateTransactions,
  ]);

  const dateRange = getDateRange(rows);

  return {
    expectedIncomeGaps,
    rows: previewRows,
    summary: {
      category_suggestion_count: previewRows.filter((row) => row.category).length,
      duplicate_count: previewRows.filter((row) => row.duplicate).length,
      duplicate_in_file_count: previewRows.filter((row) => row.duplicate_in_file).length,
      expected_income_gap_count: expectedIncomeGaps.length,
      imported_candidate_count: previewRows.filter((row) => row.should_import).length,
      row_count: previewRows.length,
      source_range_end: dateRange.end,
      source_range_start: dateRange.start,
      unexpected_charge_count: previewRows.filter((row) => row.unexpected_charge).length,
    },
  };
}

export async function previewImport({
  accountId,
  rows,
  supabase,
  userId,
}: {
  accountId: string;
  rows: NormalizedImportRowInput[];
  supabase: ServerClient;
  userId: string;
}): Promise<ImportPreviewResponse> {
  const analysis = await analyzeImportRows({ accountId, rows, supabase, userId });
  const similarMerchantMap = new Map<string, number>();

  for (const row of analysis.rows) {
    if (!row.merchant_key) {
      continue;
    }

    similarMerchantMap.set(row.merchant_key, (similarMerchantMap.get(row.merchant_key) ?? 0) + 1);
  }

  return {
    rows: analysis.rows,
    similar_merchants: [...similarMerchantMap.entries()]
      .map(([merchant_key, row_count]) => ({
        label: merchant_key,
        merchant_key,
        row_count,
      }))
      .filter((entry) => entry.row_count > 1)
      .sort((left, right) => right.row_count - left.row_count),
    summary: analysis.summary,
  };
}

async function createNotification(
  supabase: ServerClient,
  payload: {
    event_key: string;
    message: string;
    severity: Database["public"]["Enums"]["alert_severity"];
    target_id: string | null;
    target_type: string | null;
    title: string;
    type: Database["public"]["Enums"]["notification_type"];
  },
) {
  const client = asImportClient(supabase);
  const { error } = await client.rpc("create_user_notification", {
    p_event_key: payload.event_key,
    p_message: payload.message,
    p_severity: payload.severity,
    p_target_id: payload.target_id,
    p_target_type: payload.target_type,
    p_title: payload.title,
    p_type: payload.type,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function markBatchFailed(supabase: ServerClient, batchId: string, reason: string) {
  const client = asImportClient(supabase);

  await client
    .from("transaction_import_batches")
    .update({
      completed_at: new Date().toISOString(),
      metadata: {
        failure_reason: reason,
      },
      status: "failed",
    })
    .eq("id", batchId);
}

export async function confirmImport({
  accountId,
  fileChecksum,
  fileName,
  rows,
  sourceBank,
  sourceFormat,
  supabase,
  t,
  userId,
}: {
  accountId: string;
  fileChecksum: string;
  fileName: string;
  rows: ConfirmImportRowInput[];
  sourceBank: string;
  sourceFormat: ImportBatchListItem["source_format"];
  supabase: ServerClient;
  t: Translator;
  userId: string;
}): Promise<ConfirmImportResponse> {
  const normalizedRows = rows.map<NormalizedImportRowInput>((row) => ({
    amount_cents: row.amount_cents,
    description: row.description,
    external_id: row.external_id,
    is_income: row.is_income,
    merchant_key: row.merchant_key,
    notes: row.notes,
    source_row_index: row.source_row_index,
    transaction_date: row.transaction_date,
    value_date: row.value_date,
  }));

  const analysis = await analyzeImportRows({ accountId, rows: normalizedRows, supabase, userId });
  const importClient = asImportClient(supabase);
  const rowsToPersist = rows.filter((row) => row.should_import !== false);
  const dateRange = getDateRange(normalizedRows);

  const dedupeKeyRows = rowsToPersist.map((row) => ({
    dedupe_key: createHash("sha256").update(buildImportDedupeKey(accountId, row)).digest("hex"),
    row,
  }));

  const { data: existingDedupeRows, error: existingDedupeError } = await supabase
    .from("transactions")
    .select("import_dedupe_key")
    .eq("user_id", userId)
    .in(
      "import_dedupe_key",
      dedupeKeyRows.map((entry) => entry.dedupe_key),
    )
    .is("deleted_at", null);

  if (existingDedupeError) {
    throw new Error(existingDedupeError.message);
  }

  const existingDedupeKeys = new Set(
    (existingDedupeRows ?? [])
      .map((row) => row.import_dedupe_key)
      .filter((key): key is string => Boolean(key)),
  );

  const insertableRows = dedupeKeyRows.filter((entry) => !existingDedupeKeys.has(entry.dedupe_key));

  const { data: rawBatchData, error: batchError } = await importClient
    .from("transaction_import_batches")
    .insert({
      account_id: accountId,
      duplicate_count: analysis.summary.duplicate_count + analysis.summary.duplicate_in_file_count,
      expected_income_gap_count: analysis.summary.expected_income_gap_count,
      file_checksum: fileChecksum,
      file_name: fileName,
      imported_count: 0,
      metadata: {
        preview_row_count: rows.length,
        source_bank: sourceBank,
      },
      row_count: rows.length,
      source_bank: sourceBank === "generic" ? null : sourceBank,
      source_format: sourceFormat,
      source_range_end: dateRange.end,
      source_range_start: dateRange.start,
      status: "processing",
      unexpected_charge_count: analysis.summary.unexpected_charge_count,
      user_id: userId,
    })
    .select(getImportBatchSelect())
    .single();

  const batchData = rawBatchData as unknown as ImportBatchRow | null;

  if (batchError || !batchData) {
    throw new Error(batchError?.message ?? "Failed to create import batch");
  }

  const batchId = batchData.id;

  try {
    const insertPayload = insertableRows.map(({ dedupe_key, row }) => ({
      account_id: accountId,
      amount_cents: row.amount_cents,
      category_id: row.category_id,
      description: row.description,
      import_batch_id: batchId,
      import_dedupe_key: dedupe_key,
      import_source: sourceBank === "generic" ? sourceFormat : sourceBank,
      is_income: row.is_income,
      notes: row.notes,
      transaction_date: row.transaction_date,
      user_id: userId,
      value_date: row.value_date,
    }));

    const { data: insertedTransactions, error: insertError } = await supabase
      .from("transactions")
      .insert(insertPayload)
      .select("id,account_id,amount_cents,description,transaction_date,is_income");

    if (insertError) {
      await markBatchFailed(supabase, batchId, insertError.message);
      throw new Error(insertError.message);
    }

    let notificationCount = 0;

    for (const previewRow of analysis.rows.filter(
      (row) => row.should_import && row.unexpected_charge,
    )) {
      await createNotification(supabase, {
        event_key: `subscription_unexpected_charge:${batchId}:${previewRow.source_row_index}`,
        message: t("notifications.subscriptionUnexpectedChargeMessage", {
          date: previewRow.transaction_date,
          description: previewRow.description,
          service: previewRow.unexpected_charge?.service_name ?? "",
        }),
        severity: "warning",
        target_id: previewRow.unexpected_charge?.commitment_id ?? null,
        target_type: "commitment",
        title: t("notifications.subscriptionUnexpectedChargeTitle"),
        type: "subscription_unexpected_charge",
      });
      notificationCount += 1;
    }

    for (const gap of analysis.expectedIncomeGaps) {
      await createNotification(supabase, {
        event_key: `expected_income_unpaid:${gap.id}:${gap.next_due_date}`,
        message: t("notifications.expectedIncomeUnpaidMessage", {
          dueDate: gap.next_due_date,
          name: gap.name,
        }),
        severity: "warning",
        target_id: gap.id,
        target_type: "commitment",
        title: t("notifications.expectedIncomeUnpaidTitle"),
        type: "expected_income_unpaid",
      });
      notificationCount += 1;
    }

    const { data: rawUpdatedBatchData, error: updatedBatchError } = await importClient
      .from("transaction_import_batches")
      .update({
        completed_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        duplicate_count:
          analysis.summary.duplicate_count +
          analysis.summary.duplicate_in_file_count +
          existingDedupeKeys.size,
        expected_income_gap_count: analysis.expectedIncomeGaps.length,
        imported_count: insertedTransactions?.length ?? 0,
        metadata: {
          notification_count: notificationCount,
          skipped_existing_dedupe_count: existingDedupeKeys.size,
        },
        status: "confirmed",
        unexpected_charge_count: analysis.summary.unexpected_charge_count,
      })
      .eq("id", batchId)
      .select(getImportBatchSelect())
      .single();

    const updatedBatchData = rawUpdatedBatchData as unknown as ImportBatchRow | null;

    if (updatedBatchError || !updatedBatchData) {
      throw new Error(updatedBatchError?.message ?? "Failed to update import batch");
    }

    return {
      batch: mapBatch(updatedBatchData),
      imported_transaction_count: insertedTransactions?.length ?? 0,
      notification_count: notificationCount,
    };
  } catch (error) {
    await markBatchFailed(
      supabase,
      batchId,
      error instanceof Error ? error.message : "Unknown import failure",
    );
    throw error;
  }
}

export async function listImportBatches({
  supabase,
  userId,
}: {
  supabase: ServerClient;
  userId: string;
}): Promise<ImportBatchesResponse> {
  const client = asImportClient(supabase);
  const { data: rawData, error } = await client
    .from("transaction_import_batches")
    .select(getImportBatchSelect())
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(12);

  const data = rawData as unknown as ImportBatchRow[] | null;

  if (error) {
    throw new Error(error.message);
  }

  return {
    batches: (data ?? []).map(mapBatch),
  };
}

export async function rollbackImportBatch({
  batchId,
  supabase,
}: {
  batchId: string;
  supabase: ServerClient;
}) {
  const client = asImportClient(supabase);
  const { data, error } = await client.rpc("rollback_import_batch", {
    p_batch_id: batchId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rolledBackCount =
    Array.isArray(data) && data[0]?.rolled_back_count ? Number(data[0].rolled_back_count) : 0;

  return {
    rolled_back_count: rolledBackCount,
  };
}
