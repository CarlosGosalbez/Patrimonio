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

interface CreateAccountDialogProps {
    userId: string;
}

export function CreateAccountDialog({ userId }: CreateAccountDialogProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [institution, setInstitution] = useState("");
    const [type, setType] = useState<"bank" | "investment">("bank");
    const [accountNumber, setAccountNumber] = useState("");
    const [currency, setCurrency] = useState("EUR");

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const supabase = createClient();

    const createMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.from("accounts").insert({
                user_id: userId,
                name,
                institution,
                type,
                account_number: accountNumber || null,
                currency,
                balance: 0,
            } as any).select().single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts", userId] });
            toast({
                title: "Cuenta creada",
                description: "La cuenta ha sido creada exitosamente",
            });
            setOpen(false);
            setName("");
            setInstitution("");
            setAccountNumber("");
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
                <Button aria-label="Crear nueva cuenta">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Cuenta
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear Nueva Cuenta</DialogTitle>
                    <DialogDescription>
                        Añade una cuenta bancaria o de inversión
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        createMutation.mutate();
                    }}
                >
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre de la cuenta *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Cuenta Corriente"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="institution">Institución *</Label>
                            <Input
                                id="institution"
                                value={institution}
                                onChange={(e) => setInstitution(e.target.value)}
                                placeholder="ING, TradeRepublic..."
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo *</Label>
                            <select
                                id="type"
                                value={type}
                                onChange={(e) => setType(e.target.value as "bank" | "investment")}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                <option value="bank">Cuenta Bancaria</option>
                                <option value="investment">Cuenta de Inversión</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="accountNumber">Número de cuenta</Label>
                            <Input
                                id="accountNumber"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                placeholder="Últimos 4 dígitos (opcional)"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="currency">Moneda *</Label>
                            <select
                                id="currency"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                <option value="EUR">EUR - Euro</option>
                                <option value="USD">USD - Dólar</option>
                                <option value="GBP">GBP - Libra</option>
                            </select>
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
                            {createMutation.isPending ? "Creando..." : "Crear Cuenta"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
