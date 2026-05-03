"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/shared/lib/supabase/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface RecentTransactionsProps {
    userId: string;
}

export function RecentTransactions({ userId }: RecentTransactionsProps) {
    const supabase = createClient();

    const { data: transactions } = useQuery({
        queryKey: ["recent-transactions", userId],
        queryFn: async () => {
            const { data } = await supabase
                .from("transactions")
                .select("*, accounts(name)")
                .eq("user_id", userId)
                .is("deleted_at", null)
                .order("transaction_date", { ascending: false })
                .limit(10);
            return data || [];
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Transacciones Recientes</CardTitle>
                <CardDescription>Últimas 10 transacciones registradas</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {(transactions as any[] || []).map((tx: any) => (
                        <div
                            key={tx.id}
                            className="flex items-center justify-between border-b pb-4 last:border-0"
                        >
                            <div className="flex items-center gap-3">
                                {tx.type === "income" ? (
                                    <ArrowUpCircle className="h-8 w-8 text-success" />
                                ) : (
                                    <ArrowDownCircle className="h-8 w-8 text-destructive" />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {tx.description || tx.category}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {(tx.accounts as any)?.name} • {formatDate(tx.transaction_date)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p
                                    className={`font-semibold ${tx.type === "income" ? "text-success" : "text-destructive"
                                        }`}
                                >
                                    {tx.type === "income" ? "+" : "-"}
                                    {formatCurrency(Number(tx.amount))}
                                </p>
                            </div>
                        </div>
                    ))}

                    {(!transactions || transactions.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">
                            No hay transacciones registradas
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
