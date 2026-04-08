"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslations } from "next-intl";
import * as LucideIcons from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

// ─── Icon registry ────────────────────────────────────────────────────────────
// Build a stable list of icon names from lucide-react (excludes non-component exports)
const ICON_NAMES: string[] = Object.keys(LucideIcons).filter(
  (key) => key[0] === key[0].toUpperCase() && key !== "createLucideIcon" && key !== "default",
);

const COLS = 6;
const CELL_PX = 48;

interface IconPickerModalProps {
  value?: string;
  onSelect: (iconName: string) => void;
}

export default function IconPickerModal({ value, onSelect }: IconPickerModalProps) {
  const t = useTranslations("iconPicker");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.toLowerCase().trim(), 300);

  const filtered = useMemo(
    () =>
      debouncedQuery
        ? ICON_NAMES.filter((name) => name.toLowerCase().includes(debouncedQuery))
        : ICON_NAMES,
    [debouncedQuery],
  );

  // Group into rows of COLS
  const rows = useMemo(() => {
    const result: string[][] = [];
    for (let i = 0; i < filtered.length; i += COLS) {
      result.push(filtered.slice(i, i + COLS));
    }
    return result;
  }, [filtered]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CELL_PX,
    overscan: 5,
  });

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder={t("searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="min-h-[44px]"
        aria-label={t("searchAriaLabel")}
      />

      <div
        ref={parentRef}
        className="overflow-y-auto rounded-xl border border-border"
        style={{ height: CELL_PX * 7 }}
        role="listbox"
        aria-label={t("listAriaLabel")}
      >
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: CELL_PX,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "grid",
                  gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                }}
              >
                {row.map((iconName) => {
                  const Icon = (
                    LucideIcons as unknown as Record<
                      string,
                      React.FC<{ className?: string; "aria-hidden"?: boolean }>
                    >
                  )[iconName];
                  const isSelected = value === iconName;
                  return (
                    <Button
                      key={iconName}
                      type="button"
                      variant={isSelected ? "default" : "ghost"}
                      role="option"
                      aria-selected={isSelected}
                      aria-label={iconName}
                      title={iconName}
                      style={{ height: CELL_PX, minWidth: CELL_PX }}
                      className="rounded-none p-0"
                      onClick={() => onSelect(iconName)}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </Button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">{t("noResults")}</p>
      )}
    </div>
  );
}
