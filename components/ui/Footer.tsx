"use client";

import { useState } from "react";
import { Bug } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ReportProblemDialog } from "@/components/ui/ReportProblemDialog";

export function Footer() {
  const t = useTranslations("footer");
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
      <footer className="border-t border-border/70 bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <p className="text-xs text-muted-foreground">
            {t("designedBy")}{" "}
            <strong className="font-semibold text-foreground">{t("designerName")}</strong>
          </p>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[36px] gap-2 text-xs"
            onClick={() => setReportOpen(true)}
          >
            <Bug className="h-3.5 w-3.5" aria-hidden />
            {t("reportButton")}
          </Button>
        </div>
      </footer>

      <ReportProblemDialog open={reportOpen} onOpenChange={setReportOpen} />
    </>
  );
}
