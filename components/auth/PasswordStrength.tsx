"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import zxcvbn from "zxcvbn";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

const COLORS = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const t = useTranslations("passwordStrength");
  const result = useMemo(() => (password ? zxcvbn(password) : null), [password]);

  if (!password) return null;

  const score = result?.score ?? 0;
  const color = COLORS[score];
  const labels = [t("level0"), t("level1"), t("level2"), t("level3"), t("level4")];

  return (
    <div className={cn("space-y-1.5", className)} aria-live="polite" aria-atomic="true">
      <div
        className="flex gap-1"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-label={t("label")}
      >
        {COLORS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-300",
              i <= score ? color : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="flex justify-between text-xs text-muted-foreground">
        <span>
          {t("label")} <span className="font-medium text-foreground">{labels[score]}</span>
        </span>
        {result?.feedback?.warning && (
          <span className="text-orange-500">{result.feedback.warning}</span>
        )}
      </p>
    </div>
  );
}
