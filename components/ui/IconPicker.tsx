"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Lazy-load the heavy modal (loads lucide icon list only when needed)
const IconPickerModal = dynamic(() => import("@/components/ui/IconPickerModal"), {
  loading: () => <div className="h-96 w-full animate-pulse rounded-xl bg-muted" />,
  ssr: false,
});

// Preload function for hover trigger
const preloadModal = () => {
  void import("@/components/ui/IconPickerModal");
};

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  label?: string;
}

export function IconPicker({ value, onChange, label }: IconPickerProps) {
  const t = useTranslations("iconPicker");
  const [open, setOpen] = useState(false);

  // Resolve current icon component for preview
  const CurrentIcon = value
    ? (
        LucideIcons as unknown as Record<
          string,
          React.FC<{ className?: string; "aria-hidden"?: boolean }>
        >
      )[value]
    : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-[44px] gap-2"
        aria-label={label ?? t("triggerAriaLabel")}
        onMouseEnter={preloadModal}
        onFocus={preloadModal}
        onClick={() => setOpen(true)}
      >
        {CurrentIcon ? (
          <CurrentIcon className="h-5 w-5" aria-hidden />
        ) : (
          <span className="text-sm text-muted-foreground">{t("placeholder")}</span>
        )}
        {value && <span className="text-sm">{value}</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <IconPickerModal
            value={value}
            onSelect={(iconName) => {
              onChange(iconName);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
