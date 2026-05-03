"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/shared/lib/supabase/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import { Download } from "lucide-react";

interface DataExportProps {
    userId: string;
}

export function DataExport({ userId }: DataExportProps) {
    const { toast } = useToast();
    const supabase = createClient();

    const exportMutation = useMutation({
        mutationFn: async () => {
            const { data: accounts } = await supabase
                .from("accounts")
                .select("*")
                .eq("user_id", userId)
                .is("deleted_at", null);

            const { data: transactions } = await supabase
                .from("transactions")
                .select("*")
                .eq("user_id", userId)
                .is("deleted_at", null);

            const { data: holdings } = await supabase
                .from("stock_holdings")
                .select("*")
                .eq("user_id", userId)
                .is("deleted_at", null);

            const { data: mortgages } = await supabase
                .from("mortgages")
                .select("*")
                .eq("user_id", userId)
                .is("deleted_at", null);

            const exportData = {
                accounts,
                transactions,
                holdings,
                mortgages,
                exported_at: new Date().toISOString(),
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `patrimonio-export-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return exportData;
        },
        onSuccess: () => {
            toast({
                title: "Datos exportados",
                description: "Tu archivo ha sido descargado",
            });
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
        <Card>
            <CardHeader>
                <CardTitle>Exportar Datos</CardTitle>
                <CardDescription>
                    Descarga una copia de todos tus datos (GDPR compliance)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Exporta todas tus cuentas, transacciones, inversiones e hipotecas en formato JSON.
                </p>
                <Button
                    onClick={() => exportMutation.mutate()}
                    disabled={exportMutation.isPending}
                >
                    <Download className="h-4 w-4 mr-2" />
                    {exportMutation.isPending ? "Exportando..." : "Exportar todos los datos"}
                </Button>
            </CardContent>
        </Card>
    );
}
