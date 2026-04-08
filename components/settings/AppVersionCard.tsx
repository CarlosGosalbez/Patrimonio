"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const SEGMENTS = [
    { valueKey: 0, labelKey: "majorLabel" as const, descKey: "majorDesc" as const },
    { valueKey: 1, labelKey: "minorLabel" as const, descKey: "minorDesc" as const },
    { valueKey: 2, labelKey: "patchLabel" as const, descKey: "patchDesc" as const },
] as const;

export function AppVersionCard() {
    const t = useTranslations("privacy.appVersion");
    const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
    const parts = version.split(".");

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-base">{t("title")}</CardTitle>
                        <CardDescription className="mt-0.5">{t("description")}</CardDescription>
                    </div>
                    <span
                        className="select-all rounded-md bg-muted px-2.5 py-1 font-mono text-sm font-medium tabular-nums"
                        aria-label={`v${version}`}
                    >
                        v{version}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Separator className="mb-4" />
                <div className="grid grid-cols-3 gap-2" role="list" aria-label="Semver">
                    {SEGMENTS.map(({ valueKey, labelKey, descKey }) => (
                        <div
                            key={labelKey}
                            className="flex flex-col items-center gap-1 rounded-lg border bg-muted/40 px-3 py-3 text-center"
                            role="listitem"
                        >
                            <span className="text-3xl font-bold tabular-nums leading-none text-foreground">
                                {parts[valueKey] ?? "0"}
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t(labelKey)}
                            </span>
                            <span className="text-[11px] leading-tight text-muted-foreground">
                                {t(descKey)}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
