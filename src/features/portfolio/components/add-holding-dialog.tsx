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

interface AddHoldingDialogProps {
    userId: string;
}

export function AddHoldingDialog({ userId }: AddHoldingDialogProps) {
    const [open, setOpen] = useState(false);
    const [ticker, setTicker] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [shares, setShares] = useState("");
    const [averageCost, setAverageCost] = useState("");
    const [purchaseDate, setPurchaseDate] = useState("");
    const [accountId, setAccountId] = useState("");

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const supabase = createClient();

    const { data: accounts } = useQuery({
        queryKey: ["investment-accounts", userId],
        queryFn: async () => {
            const { data } = await supabase
                .from("accounts")
                .select("*")
                .eq("user_id", userId)
                .eq("type", "investment")
                .is("deleted_at", null);
            return data || [];
        },
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase
                .from("stock_holdings")
                .insert({
                    user_id: userId,
                    account_id: accountId,
                    ticker: ticker.toUpperCase(),
                    company_name: companyName,
                    shares: parseFloat(shares),
                    average_cost: parseFloat(averageCost),
                    purchase_date: purchaseDate || null,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portfolio-summary", userId] });
            toast({
                title: "Posición añadida",
                description: "La inversión ha sido registrada exitosamente",
            });
            setOpen(false);
            setTicker("");
            setCompanyName("");
            setShares("");
            setAverageCost("");
            setPurchaseDate("");
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button aria-label="Añadir inversión">
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir Inversión
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Añadir Inversión</DialogTitle>
                    <DialogDescription>
                        Registra una nueva posición en tu cartera
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!accountId) {
                            toast({
                                variant: "destructive",
                                title: "Error",
                                description: "Selecciona una cuenta de inversión",
                            });
                            return;
                        }
                        createMutation.mutate();
                    }}
                >
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="account">Cuenta de inversión *</Label>
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
                            {accounts?.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Primero crea una cuenta de inversión en la sección Cuentas
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ticker">Ticker *</Label>
                            <Input
                                id="ticker"
                                value={ticker}
                                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                                placeholder="AAPL, MSFT, TSLA..."
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="companyName">Nombre de la empresa *</Label>
                            <Input
                                id="companyName"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="Apple Inc."
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="shares">Número de acciones *</Label>
                            <Input
                                id="shares"
                                type="number"
                                step="0.0001"
                                value={shares}
                                onChange={(e) => setShares(e.target.value)}
                                placeholder="10.5"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="averageCost">Coste medio (USD) *</Label>
                            <Input
                                id="averageCost"
                                type="number"
                                step="0.01"
                                value={averageCost}
                                onChange={(e) => setAverageCost(e.target.value)}
                                placeholder="150.25"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="purchaseDate">Fecha de compra</Label>
                            <Input
                                id="purchaseDate"
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
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
                        <Button
                            type="submit"
                            disabled={createMutation.isPending || !accounts || accounts.length === 0}
                        >
                            {createMutation.isPending ? "Añadiendo..." : "Añadir"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
