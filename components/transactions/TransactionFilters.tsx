"use client";

import { useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAccountsQuery } from "@/hooks/useAccounts";
import { useCategoriesQuery } from "@/hooks/useCategories";
import type { TransactionQueryFilters } from "@/hooks/useTransactions";
import { centsToDec, decToCents } from "@/lib/financial/formatters";

interface TransactionFiltersProps {
    filters: TransactionQueryFilters;
    onChange: (filters: TransactionQueryFilters) => void;
    open: boolean;
    onToggle: () => void;
}

function getActiveFilterCount(filters: TransactionQueryFilters): number {
    return Object.values(filters).filter((v) => v !== undefined && v !== "").length;
}

export function TransactionFilters({
    filters,
    onChange,
    open,
    onToggle,
}: TransactionFiltersProps) {
    const t = useTranslations("transactions");
    const idDate = useId();
    const idAmount = useId();

    const { data: accounts = [] } = useAccountsQuery();
    const { data: categories = [] } = useCategoriesQuery();

    const activeCount = getActiveFilterCount(filters);

    const removeFilter = (key: keyof TransactionQueryFilters) => {
        const next = { ...filters };
        delete next[key];
        onChange(next);
    };

    const resetAll = () => onChange({});

    return (
        <div className="space-y-2">
            {/* Toggle bar */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onToggle}
                    aria-expanded={open}
                    aria-controls="transaction-filters-panel"
                    className="flex min-h-[44px] items-center gap-1.5 focus-visible:ring-2"
                >
                    {t("filters.label")}
                    {activeCount > 0 && (
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                            {activeCount}
                        </Badge>
                    )}
                    <ChevronDown
                        className={`ml-1 h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                        aria-hidden="true"
                    />
                </Button>
                {activeCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetAll}
                        className="min-h-[44px] text-muted-foreground focus-visible:ring-2"
                    >
                        {t("filters.resetAll")}
                    </Button>
                )}
            </div>

            {/* Active chips */}
            {activeCount > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {filters.is_income !== undefined && (
                        <Badge variant="secondary" className="flex items-center gap-1 pl-2 pr-1">
                            {filters.is_income ? t("filters.income") : t("filters.expense")}
                            <button
                                onClick={() => removeFilter("is_income")}
                                className="ml-0.5 rounded-full p-0.5 hover:bg-muted focus-visible:ring-2"
                                aria-label={t("filters.removeFilter")}
                            >
                                <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                        </Badge>
                    )}
                    {filters.account_id && (
                        <Badge variant="secondary" className="flex items-center gap-1 pl-2 pr-1">
                            {accounts.find((a) => a.id === filters.account_id)?.name ?? t("filters.account")}
                            <button
                                onClick={() => removeFilter("account_id")}
                                className="ml-0.5 rounded-full p-0.5 hover:bg-muted focus-visible:ring-2"
                                aria-label={t("filters.removeFilter")}
                            >
                                <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                        </Badge>
                    )}
                    {filters.category_id && (
                        <Badge variant="secondary" className="flex items-center gap-1 pl-2 pr-1">
                            {categories.find((c) => c.id === filters.category_id)?.name ?? t("filters.category")}
                            <button
                                onClick={() => removeFilter("category_id")}
                                className="ml-0.5 rounded-full p-0.5 hover:bg-muted focus-visible:ring-2"
                                aria-label={t("filters.removeFilter")}
                            >
                                <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                        </Badge>
                    )}
                    {filters.date_from && (
                        <Badge variant="secondary" className="flex items-center gap-1 pl-2 pr-1">
                            {t("filters.from")}: {filters.date_from}
                            <button
                                onClick={() => removeFilter("date_from")}
                                className="ml-0.5 rounded-full p-0.5 hover:bg-muted focus-visible:ring-2"
                                aria-label={t("filters.removeFilter")}
                            >
                                <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                        </Badge>
                    )}
                    {filters.date_to && (
                        <Badge variant="secondary" className="flex items-center gap-1 pl-2 pr-1">
                            {t("filters.to")}: {filters.date_to}
                            <button
                                onClick={() => removeFilter("date_to")}
                                className="ml-0.5 rounded-full p-0.5 hover:bg-muted focus-visible:ring-2"
                                aria-label={t("filters.removeFilter")}
                            >
                                <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                        </Badge>
                    )}
                </div>
            )}

            {/* Collapsible panel */}
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        id="transaction-filters-panel"
                        key="filters"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-1 gap-4 rounded-xl border border-border/60 bg-card/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
                            {/* Type */}
                            <div className="space-y-1.5">
                                <Label htmlFor={`${idDate}-type`}>{t("filters.type")}</Label>
                                <Select
                                    value={
                                        filters.is_income === undefined
                                            ? "all"
                                            : filters.is_income
                                                ? "income"
                                                : "expense"
                                    }
                                    onValueChange={(val) => {
                                        if (val === "all") {
                                            removeFilter("is_income");
                                        } else {
                                            onChange({ ...filters, is_income: val === "income" });
                                        }
                                    }}
                                >
                                    <SelectTrigger
                                        id={`${idDate}-type`}
                                        className="min-h-[44px] focus-visible:ring-2"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t("filters.all")}</SelectItem>
                                        <SelectItem value="income">{t("filters.income")}</SelectItem>
                                        <SelectItem value="expense">{t("filters.expense")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Account */}
                            <div className="space-y-1.5">
                                <Label htmlFor={`${idDate}-account`}>{t("filters.account")}</Label>
                                <Select
                                    value={filters.account_id ?? "all"}
                                    onValueChange={(val) => {
                                        if (val === "all") {
                                            removeFilter("account_id");
                                        } else {
                                            onChange({ ...filters, account_id: val });
                                        }
                                    }}
                                >
                                    <SelectTrigger
                                        id={`${idDate}-account`}
                                        className="min-h-[44px] focus-visible:ring-2"
                                    >
                                        <SelectValue placeholder={t("filters.allAccounts")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t("filters.allAccounts")}</SelectItem>
                                        {accounts.map((a) => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Category */}
                            <div className="space-y-1.5">
                                <Label htmlFor={`${idDate}-category`}>{t("filters.category")}</Label>
                                <Select
                                    value={filters.category_id ?? "all"}
                                    onValueChange={(val) => {
                                        if (val === "all") {
                                            removeFilter("category_id");
                                        } else {
                                            onChange({ ...filters, category_id: val });
                                        }
                                    }}
                                >
                                    <SelectTrigger
                                        id={`${idDate}-category`}
                                        className="min-h-[44px] focus-visible:ring-2"
                                    >
                                        <SelectValue placeholder={t("filters.allCategories")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Date from */}
                            <div className="space-y-1.5">
                                <Label htmlFor={`${idDate}-date-from`}>{t("filters.dateFrom")}</Label>
                                <Input
                                    id={`${idDate}-date-from`}
                                    type="date"
                                    value={filters.date_from ?? ""}
                                    onChange={(e) =>
                                        onChange({ ...filters, date_from: e.target.value || undefined })
                                    }
                                    className="min-h-[44px] focus-visible:ring-2"
                                />
                            </div>

                            {/* Date to */}
                            <div className="space-y-1.5">
                                <Label htmlFor={`${idDate}-date-to`}>{t("filters.dateTo")}</Label>
                                <Input
                                    id={`${idDate}-date-to`}
                                    type="date"
                                    value={filters.date_to ?? ""}
                                    onChange={(e) =>
                                        onChange({ ...filters, date_to: e.target.value || undefined })
                                    }
                                    className="min-h-[44px] focus-visible:ring-2"
                                />
                            </div>

                            {/* Amount range */}
                            <div className="space-y-1.5">
                                <p id={`${idAmount}-label`} className="text-sm font-medium leading-none">
                                    {t("filters.amountRange")}
                                </p>
                                <div className="flex items-center gap-2" aria-labelledby={`${idAmount}-label`}>
                                    <Input
                                        id={`${idAmount}-min`}
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        placeholder={t("filters.min")}
                                        value={
                                            filters.amount_min_cents !== undefined
                                                ? centsToDec(filters.amount_min_cents)
                                                : ""
                                        }
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            onChange({
                                                ...filters,
                                                amount_min_cents: isNaN(val) ? undefined : decToCents(val),
                                            });
                                        }}
                                        className="min-h-[44px] focus-visible:ring-2"
                                        aria-label={t("filters.minAmount")}
                                    />
                                    <span className="text-muted-foreground" aria-hidden="true">
                                        –
                                    </span>
                                    <Input
                                        id={`${idAmount}-max`}
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        placeholder={t("filters.max")}
                                        value={
                                            filters.amount_max_cents !== undefined
                                                ? centsToDec(filters.amount_max_cents)
                                                : ""
                                        }
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            onChange({
                                                ...filters,
                                                amount_max_cents: isNaN(val) ? undefined : decToCents(val),
                                            });
                                        }}
                                        className="min-h-[44px] focus-visible:ring-2"
                                        aria-label={t("filters.maxAmount")}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
