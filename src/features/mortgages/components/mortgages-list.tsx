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
import { getMortgageStatusLabel } from "@/shared/constants/database-enums";
import { Home, Pencil, Trash2 } from "lucide-react";
import { EditMortgageDialog } from "./edit-mortgage-dialog";
import { DeleteMortgageDialog } from "./delete-mortgage-dialog";
import { useToast } from "@/shared/hooks/use-toast";

interface MortgagesListProps {
    userId: string;
}

export function MortgagesList({ userId }: MortgagesListProps) {
    const [editMortgage, setEditMortgage] = useState<any>(null);
    const [deleteMortgage, setDeleteMortgage] = useState<any>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const supabase = createClient();

    const { data: mortgages, isLoading } = useQuery({
        queryKey: ["mortgages", userId],
        queryFn: async () => {
            const { data } = await supabase
                .from("mortgages")
                .select("*")
                .eq("user_id", userId)
                .is("deleted_at", null)
                .order("created_at", { ascending: false });
            return data || [];
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("mortgages")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mortgages", userId] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-overview", userId] });
            toast({ title: "Hipoteca eliminada" });
            setDeleteMortgage(null);
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

    const calculateProgress = (paid: number, total: number) => {
        return (paid / total) * 100;
    };

    return (
        <>
            <div className="grid gap-6 md:grid-cols-2">
                {mortgages?.map((mortgage) => {
                    const progress = calculateProgress(
                        Number(mortgage.current_balance),
                        Number(mortgage.original_amount)
                    );
                    const remaining = Number(mortgage.current_balance);

                    return (
                        <Card key={mortgage.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Home className="h-8 w-8 text-primary" />
                                        <div>
                                            <CardTitle>{mortgage.property_name}</CardTitle>
                                            <CardDescription>
                                                {mortgage.institution} • {getMortgageStatusLabel(mortgage.status)}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setEditMortgage(mortgage)}
                                            aria-label="Editar hipoteca"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setDeleteMortgage(mortgage)}
                                            aria-label="Eliminar hipoteca"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Principal</p>
                                        <p className="font-medium">
                                            {formatCurrency(Number(mortgage.original_amount))}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Tasa de interés</p>
                                        <p className="font-medium">{Number(mortgage.interest_rate).toFixed(2)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Pagado</p>
                                        <p className="font-medium text-success">
                                            {formatCurrency(Number(mortgage.original_amount) - Number(mortgage.current_balance))}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Restante</p>
                                        <p className="font-medium text-destructive">
                                            {formatCurrency(remaining)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Inicio</p>
                                        <p className="font-medium">{formatDate(mortgage.start_date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Fin</p>
                                        <p className="font-medium">{formatDate(mortgage.end_date)}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Progreso</span>
                                        <span className="font-medium">{progress.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t">
                                    <span className="text-sm text-muted-foreground">Estado</span>
                                    <span
                                        className={`text-sm font-medium ${mortgage.status === "active"
                                            ? "text-success"
                                            : mortgage.status === "paid_off"
                                                ? "text-primary"
                                                : "text-muted-foreground"
                                            }`}
                                    >
                                        {mortgage.status === "active"
                                            ? "Activa"
                                            : mortgage.status === "paid_off"
                                                ? "Pagada"
                                                : "Refinanciada"}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {(!mortgages || mortgages.length === 0) && (
                <Card>
                    <CardContent className="py-8">
                        <p className="text-center text-muted-foreground">
                            No hay hipotecas registradas. Añade tu primera hipoteca para comenzar.
                        </p>
                    </CardContent>
                </Card>
            )}

            {editMortgage && (
                <EditMortgageDialog
                    mortgage={editMortgage}
                    open={!!editMortgage}
                    onOpenChange={(open) => !open && setEditMortgage(null)}
                />
            )}

            {deleteMortgage && (
                <DeleteMortgageDialog
                    mortgage={deleteMortgage}
                    open={!!deleteMortgage}
                    onOpenChange={(open) => !open && setDeleteMortgage(null)}
                    onConfirm={() => deleteMutation.mutate(deleteMortgage.id)}
                    isPending={deleteMutation.isPending}
                />
            )}
        </>
    );
}
