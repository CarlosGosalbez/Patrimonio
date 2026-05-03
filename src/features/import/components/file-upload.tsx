"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/shared/lib/supabase/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/hooks/use-toast";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { ImportPreview } from "./import-preview";
import { parseINGExcel, parseTradeRepublicExcel } from "../services/excel-parser";
import { Account, ParsedTransaction, TransactionInsert, ImportHistoryInsert, ImportHistoryUpdate } from "@/types/supabase-responses";

interface FileUploadProps {
    userId: string;
}

export function FileUpload({ userId }: FileUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [accountId, setAccountId] = useState("");
    const [source, setSource] = useState<"ing" | "traderepublic">("ing");
    const [preview, setPreview] = useState<ParsedTransaction[] | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const supabase = createClient();

    const { data: accounts } = useQuery<Account[]>({
        queryKey: ["accounts", userId],
        queryFn: async () => {
            const { data } = await supabase
                .from("accounts")
                .select("*")
                .eq("user_id", userId)
                .is("deleted_at", null);
            return (data as Account[]) || [];
        },
    });

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragging(true);
        } else if (e.type === "dragleave") {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const file = files[0];

        if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".csv"))) {
            setFile(file);
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Solo se permiten archivos Excel (.xlsx) o CSV",
            });
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            setFile(files[0]);
        }
    };

    const parseFile = async () => {
        if (!file) return;

        try {
            const transactions = source === "ing"
                ? await parseINGExcel(file)
                : await parseTradeRepublicExcel(file);

            setPreview(transactions);
            toast({
                title: "Archivo procesado",
                description: `${transactions.length} transacciones encontradas`,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            toast({
                variant: "destructive",
                title: "Error al procesar",
                description: message,
            });
        }
    };

    const importMutation = useMutation({
        mutationFn: async (transactions: ParsedTransaction[]) => {
            // Create import history record
            const importData: ImportHistoryInsert = {
                user_id: userId,
                filename: file!.name,
                source,
                status: "processing",
                total_records: transactions.length,
            };

            const { data: importRecord, error: importError } = await supabase
                .from("import_history")
                .insert(importData)
                .select()
                .single();

            if (importError) throw importError;
            if (!importRecord) throw new Error("No se pudo crear el registro de importación");

            // Insert transactions
            const transactionsWithMeta: TransactionInsert[] = transactions.map((t) => ({
                user_id: userId,
                account_id: accountId,
                import_id: importRecord.id,
                transaction_date: t.date,
                description: t.description,
                amount: t.amount,
                type: t.type,
                category: t.category as TransactionInsert["category"],
                notes: t.notes,
            }));

            const { error: transError } = await supabase
                .from("transactions")
                .insert(transactionsWithMeta);

            if (transError) {
                // Update import status to failed
                const updateFailed: ImportHistoryUpdate = {
                    status: "failed",
                    error_message: transError.message
                };
                await supabase
                    .from("import_history")
                    .update(updateFailed)
                    .eq("id", importRecord.id);
                throw transError;
            }

            // Update import status to completed
            const updateCompleted: ImportHistoryUpdate = {
                status: "completed",
                processed_records: transactions.length
            };
            await supabase
                .from("import_history")
                .update(updateCompleted)
                .eq("id", importRecord.id);

            return importRecord;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
            queryClient.invalidateQueries({ queryKey: ["import-history", userId] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-overview", userId] });
            toast({
                title: "Importación exitosa",
                description: "Las transacciones han sido importadas",
            });
            setFile(null);
            setPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: "Error al importar",
                description: error.message,
            });
        },
    });

    if (preview) {
        return (
            <ImportPreview
                transactions={preview}
                onBack={() => setPreview(null)}
                onConfirm={() => importMutation.mutate(preview)}
                isPending={importMutation.isPending}
            />
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Subir Archivo</CardTitle>
                <CardDescription>
                    Arrastra un archivo Excel o haz clic para seleccionar
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="source">Origen del archivo *</Label>
                    <select
                        id="source"
                        value={source}
                        onChange={(e) => setSource(e.target.value as "ing" | "traderepublic")}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="ing">ING (Excel)</option>
                        <option value="traderepublic">TradeRepublic (CSV)</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="account">Cuenta destino *</Label>
                    <select
                        id="account"
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="">Selecciona una cuenta...</option>
                        {accounts?.map((account) => (
                            <option key={account.id} value={account.id}>
                                {account.name} ({account.institution})
                            </option>
                        ))}
                    </select>
                </div>

                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-muted-foreground/50"
                        }`}
                >
                    {file ? (
                        <div className="space-y-4">
                            <FileSpreadsheet className="h-12 w-12 mx-auto text-primary" />
                            <div>
                                <p className="font-medium">{file.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {(file.size / 1024).toFixed(2)} KB
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Eliminar
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                            <div>
                                <p className="font-medium">Arrastra tu archivo aquí</p>
                                <p className="text-sm text-muted-foreground">
                                    o haz clic para seleccionar
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Seleccionar archivo
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                    )}
                </div>

                {file && (
                    <Button
                        onClick={parseFile}
                        disabled={!accountId}
                        className="w-full"
                    >
                        Procesar y previsualizar
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
