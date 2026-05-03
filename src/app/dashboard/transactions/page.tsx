import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { TransactionsList } from "@/features/transactions/components/transactions-list";
import { CreateTransactionDialog } from "@/features/transactions/components/create-transaction-dialog";
import { TransactionFilters } from "@/features/transactions/components/transaction-filters";

export default async function TransactionsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Transacciones</h1>
                    <p className="text-muted-foreground">
                        Gestiona todos tus movimientos financieros
                    </p>
                </div>
                <CreateTransactionDialog userId={user.id} />
            </div>

            <TransactionFilters />
            <TransactionsList userId={user.id} />
        </div>
    );
}
