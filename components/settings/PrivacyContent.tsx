"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { DataExportCard } from "@/components/settings/DataExportCard";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";

export function PrivacyContent() {
    const t = useTranslations("privacy");
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">{t("pageTitle")}</h1>
                <p className="mt-2 text-muted-foreground">{t("pageDescription")}</p>
            </div>

            <DataExportCard />

            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">{t("deleteAccount.title")}</CardTitle>
                    <CardDescription>{t("deleteAccount.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-4 text-sm text-muted-foreground">
                        {t("deleteAccount.warning")}
                    </p>
                    <Button
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                        className="w-full sm:w-auto"
                    >
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        {t("deleteAccount.button")}
                    </Button>
                </CardContent>
            </Card>

            <DeleteAccountDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
            />
        </div>
    );
}
