"use client";

import { useState } from "react";
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
    DialogTrigger,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus } from "lucide-react";

interface CreateTransactionDialogProps {
    userId: string;
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

export function CreateTransactionDialog({ userId }: CreateTransactionDialogProps) {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<"income" | "expense">("expense");
    const [accountId, setAccountId] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Otros");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [notes, setNotes] = useState("");

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const supabase = createClient();

    const { data: accounts } = useQuery({
        queryKey: ["accounts", userId],
        queryFn: async () => {
            const { data } = await supabase
                .from("accounts")
                .select("*")
                .eq("user_id", userId)
                .eq("type", "bank")
                .is("deleted_at", null);
            return data || [];
        },
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase
                .from("transactions")
                .insert({
                    user_id: userId,
                    account_id: accountId,
                    type,
                    amount: type === "expense" ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount)),
                    description,
                    category,
                    transaction_date: date,
                    notes: notes || null,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-overview", userId] });
            queryClient.invalidateQueries({ queryKey: ["recent-transactions", userId] });
            toast({
                title: "Transacción creada",
                description: "La transacción ha sido registrada exitosamente",
            });
            setOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        },
    });

    const resetForm = () => {
        setType("expense");
        setAccountId("");
        setAmount("");
        setDescription("");
        setCategory("Otros");
        setDate(new Date().toISOString().split("T")[0]);
        setNotes("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button aria-label="Añadir transacción">
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir Transacción
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nueva Transacción</DialogTitle>
                    <DialogDescription>
                        Registra un ingreso o gasto en tu cuenta
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!accountId || !amount || !description) {
                            toast({
                                variant: "destructive",
                                title: "Error",
                                description: "Completa todos los campos obligatorios",
                            });
                            return;
                        }
                        createMutation.mutate();
                    }}
                >
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo *</Label>
                            <select
                                id="type"
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
                            <Label htmlFor="account">Cuenta *</Label>
                            <select
                                id="account"
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
                            <Label htmlFor="amount">Cantidad (€) *</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción *</Label>
                            <Input
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ej: Compra supermercado"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Categoría *</Label>
                            <select
                                id="category"
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
                            <Label htmlFor="date">Fecha *</Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas (opcional)</Label>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Información adicional..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? "Creando..." : "Crear"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
