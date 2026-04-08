"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function OfflinePage() {
  const t = useTranslations("offline");

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Button
        onClick={() => window.location.reload()}
        className="min-h-[44px] gap-2"
        aria-label={t("retry")}
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        {t("retry")}
      </Button>

      <p className="text-xs text-muted-foreground">{t("cached")}</p>
    </div>
  );
}
