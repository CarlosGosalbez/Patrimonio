"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/shared/lib/supabase/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import { getCategoryLabel } from "@/shared/constants/database-enums";
import { ArrowUpCircle, ArrowDownCircle, Pencil, Trash2 } from "lucide-react";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { DeleteTransactionDialog } from "./delete-transaction-dialog";
import { useToast } from "@/shared/hooks/use-toast";

interface TransactionsListProps {
    userId: string;
}

export function TransactionsList({ userId }: TransactionsListProps) {
    const [editTransaction, setEditTransaction] = useState<any>(null);
    const [deleteTransaction, setDeleteTransaction] = useState<any>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const supabase = createClient();

    const { data: transactions, isLoading } = useQuery({
        queryKey: ["transactions", userId],
        queryFn: async () => {
            const { data } = await supabase
                .from("transactions")
                .select(`
          *,
          account:accounts(name, institution)
        `)
                .eq("user_id", userId)
                .is("deleted_at", null)
                .order("date", { ascending: false })
                .limit(100);
            return data || [];
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("transactions")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-overview", userId] });
            toast({ title: "Transacción eliminada" });
            setDeleteTransaction(null);
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        },
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cargando...</CardTitle>
                </CardHeader>
            </Card>
        );
    }

    const getTypeIcon = (type: string) => {
        if (type === "income") return <ArrowUpCircle className="h-8 w-8 text-success" />;
        return <ArrowDownCircle className="h-8 w-8 text-destructive" />;
    };



    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Todas las Transacciones</CardTitle>
                    <CardDescription>Historial completo de movimientos</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {transactions?.map((transaction) => (
                            <div
                                key={transaction.id}
                                className="flex items-center justify-between border-b pb-4 last:border-0"
                            >
                                <div className="flex items-center gap-4">
                                    {getTypeIcon(transaction.type)}
                                    <div>
                                        <p className="font-medium text-lg">{transaction.description}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {transaction.account?.name} • {getCategoryLabel(transaction.category)} •{" "}
                                            {formatDate(transaction.transaction_date)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p
                                            className={`text-xl font-bold ${transaction.type === "income" ? "text-success" : "text-destructive"
                                                }`}
                                        >
                                            {transaction.type === "income" ? "+" : "-"}
                                            {formatCurrency(Math.abs(transaction.amount))}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setEditTransaction(transaction)}
                                            aria-label="Editar transacción"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setDeleteTransaction(transaction)}
                                            aria-label="Eliminar transacción"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {(!transactions || transactions.length === 0) && (
                            <p className="text-center text-muted-foreground py-8">
                                No hay transacciones registradas. Añade tu primera transacción para comenzar.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {editTransaction && (
                <EditTransactionDialog
                    transaction={editTransaction}
                    open={!!editTransaction}
                    onOpenChange={(open) => !open && setEditTransaction(null)}
                />
            )}

            {deleteTransaction && (
                <DeleteTransactionDialog
                    transaction={deleteTransaction}
                    open={!!deleteTransaction}
                    onOpenChange={(open) => !open && setDeleteTransaction(null)}
                    onConfirm={() => deleteMutation.mutate(deleteTransaction.id)}
                    isPending={deleteMutation.isPending}
                />
            )}
        </>
    );
}
