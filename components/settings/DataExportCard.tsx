"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * GDPR Article 20 — Data Export Card
 * Allows users to download all their data as JSON
 */
export function DataExportCard() {
    const t = useTranslations("privacy");
    const [isExporting, setIsExporting] = useState(false);

    async function handleExport() {
        setIsExporting(true);
        try {
            const res = await fetch("/api/privacy/export", { method: "GET" });

            if (!res.ok) {
                throw new Error(await res.text());
            }

            // Trigger download
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `patrimio-export-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success(t("exportSuccess"));
        } catch (error) {
            console.error("Export error:", error);
            toast.error(t("exportError"));
        } finally {
            setIsExporting(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("export.title")}</CardTitle>
                <CardDescription>{t("export.description")}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">{t("export.warning")}</p>
                <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full sm:w-auto"
                    variant="outline"
                >
                    {isExporting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("export.exporting")}
                        </>
                    ) : (
                        <>
                            <Download className="mr-2 h-4 w-4" />
                            {t("export.button")}
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
