import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { TransactionListItem, TransactionListResponse } from "@/lib/transactions/types";
import type {
  TransactionAccountSummary,
  TransactionCategorySummary,
} from "@/lib/commitments/types";

type ServerClient = SupabaseClient<Database>;

type TransactionSelectRow = Database["public"]["Tables"]["transactions"]["Row"] & {
  account: TransactionAccountSummary | null;
  category: TransactionCategorySummary | null;
};

const transactionSelect = `
  id,
  user_id,
  account_id,
  category_id,
  amount_cents,
  currency,
  description,
  notes,
  is_income,
  transaction_date,
  value_date,
  tags,
  receipt_url,
  recurring_id,
  is_recurring_instance,
  import_source,
  import_batch_id,
  transfer_id,
  created_at,
  updated_at,
  deleted_at,
  account:accounts(id,name,currency,color,icon),
  category:categories(id,name,color,icon,is_income,user_id)
`;

export interface TransactionFilters {
  limit?: number;
  page?: number;
  search?: string;
  category_id?: string;
  account_id?: string;
  is_income?: boolean;
  date_from?: string;
  date_to?: string;
  amount_min_cents?: number;
  amount_max_cents?: number;
}

export async function listTransactions({
  filters,
  supabase,
  userId,
}: {
  filters: TransactionFilters;
  supabase: ServerClient;
  userId: string;
}): Promise<TransactionListResponse> {
  const limit = filters.limit ?? 20;
  const page = filters.page ?? 0;

  let query = supabase
    .from("transactions")
    .select(transactionSelect, { count: "exact" })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (filters.search) {
    query = query.ilike("description", `%${filters.search}%`);
  }
  if (filters.category_id) {
    query = query.eq("category_id", filters.category_id);
  }
  if (filters.account_id) {
    query = query.eq("account_id", filters.account_id);
  }
  if (filters.is_income !== undefined) {
    query = query.eq("is_income", filters.is_income);
  }
  if (filters.date_from) {
    query = query.gte("transaction_date", filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte("transaction_date", filters.date_to);
  }
  if (filters.amount_min_cents !== undefined) {
    query = query.gte("amount_cents", filters.amount_min_cents);
  }
  if (filters.amount_max_cents !== undefined) {
    query = query.lte("amount_cents", filters.amount_max_cents);
  }

  const { data, error, count } = await query
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(page * limit, page * limit + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  return {
    items: (data ?? []) as TransactionListItem[],
    next_page: count && count > (page + 1) * limit ? page + 1 : null,
    total: count ?? 0,
  };
}
