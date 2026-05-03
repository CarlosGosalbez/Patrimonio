"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import { ArrowLeft, Check } from "lucide-react";
import { ParsedTransaction } from "@/types/supabase-responses";

interface ImportPreviewProps {
    transactions: ParsedTransaction[];
    onBack: () => void;
    onConfirm: () => void;
    isPending: boolean;
}

export function ImportPreview({
    transactions,
    onBack,
    onConfirm,
    isPending,
}: ImportPreviewProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Previsualización</CardTitle>
                        <CardDescription>
                            Revisa las {transactions.length} transacciones antes de importar
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onBack} disabled={isPending}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Volver
                        </Button>
                        <Button onClick={onConfirm} disabled={isPending}>
                            <Check className="h-4 w-4 mr-2" />
                            {isPending ? "Importando..." : "Confirmar Importación"}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full">
                        <thead className="sticky top-0 bg-background border-b">
                            <tr>
                                <th className="text-left p-2">Fecha</th>
                                <th className="text-left p-2">Descripción</th>
                                <th className="text-left p-2">Categoría</th>
                                <th className="text-right p-2">Cantidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((transaction, index) => (
                                <tr key={index} className="border-b hover:bg-muted/50">
                                    <td className="p-2 text-sm">{formatDate(transaction.date)}</td>
                                    <td className="p-2 text-sm">{transaction.description}</td>
                                    <td className="p-2 text-sm">{transaction.category}</td>
                                    <td
                                        className={`p-2 text-sm text-right font-medium ${transaction.amount >= 0 ? "text-success" : "text-destructive"
                                            }`}
                                    >
                                        {transaction.amount >= 0 ? "+" : ""}
                                        {formatCurrency(transaction.amount, transaction.currency)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
