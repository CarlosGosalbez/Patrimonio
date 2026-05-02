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
import { formatCurrency, formatPercentage } from "@/shared/lib/utils";
import { Building2 } from "lucide-react";

interface MortgageSummaryProps {
    userId: string;
}

export function MortgageSummary({ userId }: MortgageSummaryProps) {
    const supabase = createClient();

    const { data: mortgages } = useQuery({
        queryKey: ["mortgages", userId],
        queryFn: async () => {
            const { data } = await supabase
                .from("mortgages")
                .select("*")
                .eq("user_id", userId)
                .eq("status", "active")
                .is("deleted_at", null);
            return data || [];
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Hipotecas Activas
                </CardTitle>
                <CardDescription>Estado de tus propiedades</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {mortgages?.map((mortgage) => {
                        const paidPercentage =
                            ((Number(mortgage.original_amount) - Number(mortgage.current_balance)) /
                                Number(mortgage.original_amount)) *
                            100;

                        return (
                            <div key={mortgage.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{mortgage.property_name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {mortgage.institution}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">
                                            {formatCurrency(Number(mortgage.current_balance))}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatPercentage(Number(mortgage.interest_rate) * 100)}
                                        </p>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${paidPercentage}%` }}
                                        role="progressbar"
                                        aria-valuenow={paidPercentage}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-label={`${paidPercentage.toFixed(1)}% pagado`}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {formatPercentage(paidPercentage, 1)} pagado •{" "}
                                    Pago mensual: {formatCurrency(Number(mortgage.monthly_payment))}
                                </p>
                            </div>
                        );
                    })}

                    {(!mortgages || mortgages.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">
                            No hay hipotecas activas
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
