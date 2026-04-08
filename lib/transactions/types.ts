import type { Database } from "@/types/database";
import type {
  TransactionAccountSummary,
  TransactionCategorySummary,
} from "@/lib/commitments/types";

export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];

export interface TransactionListItem extends TransactionRow {
  account: TransactionAccountSummary | null;
  category: TransactionCategorySummary | null;
}

export interface TransactionListResponse {
  items: TransactionListItem[];
  next_page: number | null;
  total: number;
}
