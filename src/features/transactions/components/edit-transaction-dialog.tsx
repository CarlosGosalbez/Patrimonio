"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/shared/lib/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";

interface EditTransactionDialogProps {
    transaction: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
    "Alimentación",
    "Transporte",
    "Vivienda",
    "Salud",
    "Ocio",
    "Compras",
    "Educación",
    "Seguros",
    "Impuestos",
    "Inversiones",
    "Salario",
    "Freelance",
    "Dividendos",
    "Alquiler",
    "Ventas",
    "Regalos",
    "Transferencias",
    "Hipoteca",
    "Servicios",
    "Suscripciones",
    "Otros",
];

export function EditTransactionDialog({
    transaction,
    open,
    onOpenChange,
}: EditTransactionDialogProps) {
    const [type, setType] = useState(transaction.type);
    const [accountId, setAccountId] = useState(transaction.account_id);
    const [amount, setAmount] = useState(Math.abs(transaction.amount).toString());
    const [description, setDescription] = useState(transaction.description);
    const [category, setCategory] = useState(transaction.category);
    const [date, setDate] = useState(transaction.date);
    const [notes, setNotes] = useState(transaction.notes || "");

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const supabase = createClient();

    useEffect(() => {
        if (transaction) {
            setType(transaction.type);
            setAccountId(transaction.account_id);
            setAmount(Math.abs(transaction.amount).toString());
            setDescription(transaction.description);
            setCategory(transaction.category);
            setDate(transaction.date);
            setNotes(transaction.notes || "");
        }
    }, [transaction]);

    const { data: accounts } = useQuery({
        queryKey: ["accounts", transaction.user_id],
        queryFn: async () => {
            const { data } = await supabase
                .from("accounts")
                .select("*")
                .eq("user_id", transaction.user_id)
                .eq("type", "bank")
                .is("deleted_at", null);
            return data || [];
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase
                .from("transactions")
                .update({
                    type,
                    account_id: accountId,
                    amount: type === "expense" ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount)),
                    description,
                    category,
                    transaction_date: date,
                    notes: notes || null,
                })
                .eq("id", transaction.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transactions", transaction.user_id] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-overview", transaction.user_id] });
            queryClient.invalidateQueries({ queryKey: ["recent-transactions", transaction.user_id] });
            toast({
                title: "Transacción actualizada",
                description: "Los cambios han sido guardados",
            });
            onOpenChange(false);
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Transacción</DialogTitle>
                    <DialogDescription>Modifica los datos de la transacción</DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        updateMutation.mutate();
                    }}
                >
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-type">Tipo *</Label>
                            <select
                                id="edit-type"
                                value={type}
                                onChange={(e) => setType(e.target.value as "income" | "expense")}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                <option value="expense">Gasto</option>
                                <option value="income">Ingreso</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-account">Cuenta *</Label>
                            <select
                                id="edit-account"
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                <option value="">Selecciona una cuenta...</option>
                                {accounts?.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.name} ({account.institution})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-amount">Cantidad (€) *</Label>
                            <Input
                                id="edit-amount"
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Descripción *</Label>
                            <Input
                                id="edit-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-category">Categoría *</Label>
                            <select
                                id="edit-category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-date">Fecha *</Label>
                            <Input
                                id="edit-date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-notes">Notas (opcional)</Label>
                            <textarea
                                id="edit-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? "Guardando..." : "Guardar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
