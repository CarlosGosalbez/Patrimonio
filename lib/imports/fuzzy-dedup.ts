import Fuse from "fuse.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export async function detectDuplicates(
  supabase: SupabaseClient<Database>,
  userId: string,
  newTransactions: Array<{
    amount_cents: number;
    description: string;
    transaction_date: string;
  }>,
): Promise<
  Array<{
    confidence: number;
    newTransaction: (typeof newTransactions)[0];
    potentialDuplicates: Transaction[];
  }>
> {
  const { data: existing } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .gte(
      "transaction_date",
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    )
    .order("transaction_date", { ascending: false });

  if (!existing?.length) return [];

  const fuse = new Fuse(existing, {
    keys: ["description"],
    threshold: 0.3,
    minMatchCharLength: 3,
  });

  return newTransactions
    .map((newTx) => {
      const descriptionMatches = fuse.search(newTx.description);

      const potentialDuplicates = descriptionMatches
        .filter((match) => {
          const amountDiff = Math.abs(match.item.amount_cents - newTx.amount_cents);
          const amountTolerance = Math.abs(newTx.amount_cents) * 0.01;
          return amountDiff <= amountTolerance;
        })
        .map((m) => m.item);

      if (potentialDuplicates.length === 0) return null;

      const confidence =
        potentialDuplicates.length > 0 ? 1 - (descriptionMatches[0]?.score ?? 0.5) : 0;

      return {
        confidence,
        newTransaction: newTx,
        potentialDuplicates,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
