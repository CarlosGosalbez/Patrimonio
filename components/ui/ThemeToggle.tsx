"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("common");

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-lg border border-border/60",
          className,
        )}
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border/60 bg-background/60 transition-colors",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "[-webkit-tap-highlight-color:transparent]",
        className,
      )}
      aria-label={isDark ? t("theme.light") : t("theme.dark")}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-foreground" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-foreground" aria-hidden="true" />
      )}
    </button>
  );
}
