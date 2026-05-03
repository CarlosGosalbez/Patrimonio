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
import { formatDate } from "@/shared/lib/utils";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { ImportHistory as ImportHistoryType } from "@/types/supabase-responses";

interface ImportHistoryProps {
    userId: string;
}

export function ImportHistory({ userId }: ImportHistoryProps) {
    const supabase = createClient();

    const { data: history, isLoading } = useQuery<ImportHistoryType[]>({
        queryKey: ["import-history", userId],
        queryFn: async () => {
            const { data } = await supabase
                .from("import_history")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(20);
            return (data as ImportHistoryType[]) || [];
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

    const getStatusIcon = (status: string) => {
        if (status === "completed") return <CheckCircle className="h-5 w-5 text-success" />;
        if (status === "failed") return <XCircle className="h-5 w-5 text-destructive" />;
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    };

    const getStatusLabel = (status: string) => {
        if (status === "completed") return "Completado";
        if (status === "failed") return "Fallido";
        if (status === "processing") return "Procesando";
        return "Pendiente";
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Importaciones</CardTitle>
                <CardDescription>Últimas 20 importaciones realizadas</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {history?.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between border-b pb-4 last:border-0"
                        >
                            <div className="flex items-center gap-4">
                                {getStatusIcon(item.status)}
                                <div>
                                    <p className="font-medium">{item.filename}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {item.source?.toUpperCase() || "MANUAL"} • {formatDate(item.created_at)} •{" "}
                                        {item.processed_records || 0}/{item.total_records || 0} registros
                                    </p>
                                    {item.error_message && (
                                        <p className="text-sm text-destructive mt-1">
                                            Error: {item.error_message}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium">{getStatusLabel(item.status)}</p>
                            </div>
                        </div>
                    ))}

                    {(!history || history.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">
                            No hay importaciones registradas. Sube tu primer archivo para comenzar.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
