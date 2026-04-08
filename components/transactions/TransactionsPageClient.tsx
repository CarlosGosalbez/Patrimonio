"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SwipeableTransactionRow } from "@/components/ui/SwipeableTransactionRow";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { QuickEntrySheet } from "@/components/transactions/QuickEntrySheet";
import { TransactionFormDialog } from "@/components/transactions/TransactionFormDialog";
import {
    useTransactionsQuery,
    useDeleteTransactionMutation,
    type TransactionQueryFilters,
} from "@/hooks/useTransactions";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatCurrency, formatDate } from "@/lib/financial/formatters";
import type { TransactionListItem } from "@/lib/transactions/types";

export function TransactionsPageClient() {
    const t = useTranslations("transactions");

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 400);
    const [filters, setFilters] = useState<TransactionQueryFilters>({});
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [quickEntryOpen, setQuickEntryOpen] = useState(false);
    const [editTransaction, setEditTransaction] = useState<TransactionListItem | null>(null);
    const [formDialogOpen, setFormDialogOpen] = useState(false);

    const activeFilters: TransactionQueryFilters = {
        ...filters,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
    };

    const { data, isFetchingNextPage, fetchNextPage, hasNextPage, isLoading, isError } =
        useTransactionsQuery(activeFilters);

    const deleteMutation = useDeleteTransactionMutation();

    // Infinite scroll sentinel
    const sentinelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    void fetchNextPage();
                }
            },
            { rootMargin: "200px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    const handleDelete = useCallback(
        async (id: string) => {
            try {
                await deleteMutation.mutateAsync(id);
                toast.success(t("toasts.deleted"));
            } catch {
                // mutation onError handles toast
            }
        },
        [deleteMutation, t],
    );

    const allItems = data?.pages.flatMap((p) => p.items) ?? [];
    const total = data?.pages[0]?.total ?? 0;

    return (
        <div className="relative flex h-full min-h-0 flex-col gap-4 px-4 pb-24 pt-4 sm:px-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">{t("title")}</h1>
                    {!isLoading && (
                        <p className="text-sm text-muted-foreground" aria-live="polite">
                            {t("totalCount", { count: total })}
                        </p>
                    )}
                </div>
                {/* Desktop new button */}
                <Button
                    onClick={() => { setEditTransaction(null); setFormDialogOpen(true); }}
                    className="hidden min-h-[44px] focus-visible:ring-2 sm:flex"
                >
                    <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t("actions.new")}
                </Button>
            </div>

            {/* Search bar */}
            <div className="relative">
                <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                />
                <Input
                    type="search"
                    placeholder={t("searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="min-h-[44px] pl-9 focus-visible:ring-2"
                    aria-label={t("searchPlaceholder")}
                />
            </div>

            {/* Filters */}
            <TransactionFilters
                filters={filters}
                onChange={setFilters}
                open={filtersOpen}
                onToggle={() => setFiltersOpen((v) => !v)}
            />

            {/* Error */}
            {isError && (
                <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {t("states.error")}
                </p>
            )}

            {/* Loading skeletons */}
            {isLoading && (
                <div className="space-y-2" aria-busy="true" aria-label={t("states.loading")}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 rounded-2xl" />
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && allItems.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <p className="text-lg font-medium">{t("states.empty")}</p>
                    <p className="text-sm text-muted-foreground">{t("states.emptyDetail")}</p>
                    <Button
                        onClick={() => setQuickEntryOpen(true)}
                        className="mt-2 min-h-[44px] focus-visible:ring-2"
                    >
                        <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                        {t("actions.new")}
                    </Button>
                </div>
            )}

            {/* Transaction list */}
            {allItems.length > 0 && (
                <ul className="space-y-2" aria-label={t("listAriaLabel")}>
                    {allItems.map((item) => (
                        <li key={item.id}>
                            <SwipeableTransactionRow onDelete={() => void handleDelete(item.id)}>
                                <Card
                                    className="cursor-pointer border-border/60 bg-card/80 shadow-sm hover:bg-card"
                                    onClick={() => { setEditTransaction(item); setFormDialogOpen(true); }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === "Enter") { setEditTransaction(item); setFormDialogOpen(true); } }}
                                    aria-label={`${item.description} — ${formatCurrency(Math.abs(item.amount_cents))}`}
                                >
                                    <CardContent className="flex items-center gap-3 px-4 py-3">
                                        <div
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.is_income
                                                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40"
                                                    : "bg-rose-100 text-rose-600 dark:bg-rose-950/40"
                                                }`}
                                            aria-hidden="true"
                                        >
                                            {item.is_income ? (
                                                <ArrowUpCircle className="h-4 w-4" />
                                            ) : (
                                                <ArrowDownCircle className="h-4 w-4" />
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{item.description}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>{formatDate(item.transaction_date, "short")}</span>
                                                {item.category && (
                                                    <>
                                                        <span aria-hidden="true">·</span>
                                                        <span>{item.category.name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <span
                                            className={`shrink-0 font-semibold ${item.is_income ? "text-emerald-600" : "text-foreground"
                                                }`}
                                        >
                                            {item.is_income ? "+" : "−"}
                                            {formatCurrency(Math.abs(item.amount_cents))}
                                        </span>
                                    </CardContent>
                                </Card>
                            </SwipeableTransactionRow>
                        </li>
                    ))}
                </ul>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} aria-hidden="true" />

            {isFetchingNextPage && (
                <div className="space-y-2" aria-live="polite" aria-label={t("states.loadingMore")}>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 rounded-2xl" />
                    ))}
                </div>
            )}

            {/* Mobile FAB */}
            <button
                onClick={() => setQuickEntryOpen(true)}
                className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg focus-visible:ring-2 sm:hidden"
                aria-label={t("actions.new")}
            >
                <Plus className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Quick Entry Sheet */}
            <QuickEntrySheet open={quickEntryOpen} onClose={() => setQuickEntryOpen(false)} />

            {/* Full Form Dialog */}
            <TransactionFormDialog
                open={formDialogOpen}
                onClose={() => { setFormDialogOpen(false); setEditTransaction(null); }}
                transaction={editTransaction}
            />
        </div>
    );
}
