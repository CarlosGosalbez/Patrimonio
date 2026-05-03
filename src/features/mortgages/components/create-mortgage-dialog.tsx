"use client";

import { useState } from "react";
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
    DialogTrigger,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";
import { Plus } from "lucide-react";

interface CreateMortgageDialogProps {
    userId: string;
}

export function CreateMortgageDialog({ userId }: CreateMortgageDialogProps) {
    const [open, setOpen] = useState(false);
    const [propertyName, setPropertyName] = useState("");
    const [institution, setInstitution] = useState("");
    const [originalAmount, setOriginalAmount] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [monthlyPayment, setMonthlyPayment] = useState("");

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const supabase = createClient();

    const createMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase
                .from("mortgages")
                .insert({
                    user_id: userId,
                    property_name: propertyName,
                    institution,
                    original_amount: parseFloat(originalAmount),
                    current_balance: parseFloat(originalAmount),
                    interest_rate: parseFloat(interestRate),
                    start_date: startDate,
                    end_date: endDate,
                    monthly_payment: parseFloat(monthlyPayment),
                    status: "active",
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mortgages", userId] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-overview", userId] });
            toast({ title: "Hipoteca creada" });
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
        setPropertyName("");
        setInstitution("");
        setOriginalAmount("");
        setInterestRate("");
        setStartDate("");
        setEndDate("");
        setMonthlyPayment("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button aria-label="Añadir hipoteca">
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir Hipoteca
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nueva Hipoteca</DialogTitle>
                    <DialogDescription>Registra un nuevo préstamo hipotecario</DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        createMutation.mutate();
                    }}
                >
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="property">Dirección de la propiedad *</Label>
                            <Input
                                id="property"
                                value={propertyAddress}
                                onChange={(e) => setPropertyAddress(e.target.value)}
                                placeholder="Calle Principal, 123"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lender">Entidad bancaria *</Label>
                            <Input
                                id="lender"
                                value={lender}
                                onChange={(e) => setLender(e.target.value)}
                                placeholder="Banco XYZ"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="principal">Importe principal *</Label>
                            <Input
                                id="principal"
                                type="number"
                                step="0.01"
                                value={principalAmount}
                                onChange={(e) => setPrincipalAmount(e.target.value)}
                                placeholder="250000"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="rate">Tasa de interés (%) *</Label>
                            <Input
                                id="rate"
                                type="number"
                                step="0.01"
                                value={interestRate}
                                onChange={(e) => setInterestRate(e.target.value)}
                                placeholder="2.5"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="monthly">Pago mensual *</Label>
                            <Input
                                id="monthly"
                                type="number"
                                step="0.01"
                                value={monthlyPayment}
                                onChange={(e) => setMonthlyPayment(e.target.value)}
                                placeholder="1200"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start">Fecha inicio *</Label>
                                <Input
                                    id="start"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end">Fecha fin *</Label>
                                <Input
                                    id="end"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="currency">Moneda</Label>
                            <select
                                id="currency"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="EUR">EUR</option>
                                <option value="USD">USD</option>
                                <option value="GBP">GBP</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
