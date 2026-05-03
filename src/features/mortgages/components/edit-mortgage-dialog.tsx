"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

interface EditMortgageDialogProps {
    mortgage: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditMortgageDialog({
    mortgage,
    open,
    onOpenChange,
}: EditMortgageDialogProps) {
    const [propertyAddress, setPropertyAddress] = useState(mortgage.property_address);
    const [lender, setLender] = useState(mortgage.lender);
    const [principalAmount, setPrincipalAmount] = useState(String(mortgage.principal_amount));
    const [interestRate, setInterestRate] = useState(String(mortgage.interest_rate));
    const [startDate, setStartDate] = useState(mortgage.start_date);
    const [endDate, setEndDate] = useState(mortgage.end_date);
    const [monthlyPayment, setMonthlyPayment] = useState(String(mortgage.monthly_payment));
    const [amountPaid, setAmountPaid] = useState(String(mortgage.amount_paid));
    const [status, setStatus] = useState(mortgage.status);

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const supabase = createClient();

    useEffect(() => {
        if (mortgage) {
            setPropertyAddress(mortgage.property_address);
            setLender(mortgage.lender);
            setPrincipalAmount(String(mortgage.principal_amount));
            setInterestRate(String(mortgage.interest_rate));
            setStartDate(mortgage.start_date);
            setEndDate(mortgage.end_date);
            setMonthlyPayment(String(mortgage.monthly_payment));
            setAmountPaid(String(mortgage.amount_paid));
            setStatus(mortgage.status);
        }
    }, [mortgage]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase
                .from("mortgages")
                .update({
                    property_name: propertyName,
                    institution,
                    original_amount: parseFloat(originalAmount),
                    current_balance: parseFloat(currentBalance),
                    interest_rate: parseFloat(interestRate),
                    start_date: startDate,
                    end_date: endDate,
                    monthly_payment: parseFloat(monthlyPayment),
                    status,
                })
                .eq("id", mortgage.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mortgages", mortgage.user_id] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-overview", mortgage.user_id] });
            toast({ title: "Hipoteca actualizada" });
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
                    <DialogTitle>Editar Hipoteca</DialogTitle>
                    <DialogDescription>Modifica los datos de la hipoteca</DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        updateMutation.mutate();
                    }}
                >
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-property">Dirección *</Label>
                            <Input
                                id="edit-property"
                                value={propertyAddress}
                                onChange={(e) => setPropertyAddress(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-lender">Entidad bancaria *</Label>
                            <Input
                                id="edit-lender"
                                value={lender}
                                onChange={(e) => setLender(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-principal">Importe principal *</Label>
                            <Input
                                id="edit-principal"
                                type="number"
                                step="0.01"
                                value={principalAmount}
                                onChange={(e) => setPrincipalAmount(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-rate">Tasa de interés (%) *</Label>
                            <Input
                                id="edit-rate"
                                type="number"
                                step="0.01"
                                value={interestRate}
                                onChange={(e) => setInterestRate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-monthly">Pago mensual *</Label>
                            <Input
                                id="edit-monthly"
                                type="number"
                                step="0.01"
                                value={monthlyPayment}
                                onChange={(e) => setMonthlyPayment(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-paid">Importe pagado *</Label>
                            <Input
                                id="edit-paid"
                                type="number"
                                step="0.01"
                                value={amountPaid}
                                onChange={(e) => setAmountPaid(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-start">Fecha inicio *</Label>
                                <Input
                                    id="edit-start"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-end">Fecha fin *</Label>
                                <Input
                                    id="edit-end"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-status">Estado</Label>
                            <select
                                id="edit-status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="active">Activa</option>
                                <option value="paid_off">Pagada</option>
                                <option value="refinanced">Refinanciada</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
