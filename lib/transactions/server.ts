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

export async function listTransactions({
  filters,
  supabase,
  userId,
}: {
  filters: {
    limit?: number;
    page?: number;
  };
  supabase: ServerClient;
  userId: string;
}): Promise<TransactionListResponse> {
  const limit = filters.limit ?? 20;
  const page = filters.page ?? 0;

  const { data, error, count } = await supabase
    .from("transactions")
    .select(transactionSelect, { count: "exact" })
    .eq("user_id", userId)
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
