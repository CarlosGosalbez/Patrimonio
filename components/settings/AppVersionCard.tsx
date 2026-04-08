"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

export function AppVersionCard() {
    const t = useTranslations("privacy.appVersion");
    const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "—";

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    {t("title")}
                </CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{t("versionLabel")}</span>
                    <Badge variant="secondary" className="font-mono text-sm">
                        v{version}
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{t("semverHint")}</p>
            </CardContent>
        </Card>
    );
}
