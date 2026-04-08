"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/lib/actions/locale";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toggle = (newLocale: "es" | "en") => {
    if (newLocale === locale) return;
    startTransition(async () => {
      await setLocale(newLocale);
      router.refresh();
    });
  };

  return (
    <div
      className={cn("flex items-center gap-0.5 text-xs", className)}
      role="group"
      aria-label={t("label")}
    >
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => toggle(l)}
          disabled={isPending}
          aria-pressed={locale === l}
          className={cn(
            "min-h-[32px] rounded-md px-2 py-1 font-medium transition-colors",
            locale === l
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l === "es" ? "🇪🇸" : "🇬🇧"} {t(l)}
        </button>
      ))}
    </div>
  );
}
