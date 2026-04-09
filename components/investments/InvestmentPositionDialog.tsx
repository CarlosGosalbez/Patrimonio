"use client";

import { useDeferredValue, useEffect, useId, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { AccountDialog } from "@/components/app/AccountDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTickerSearchQuery } from "@/hooks/usePhaseSix";
import { centsToDec } from "@/lib/financial/formatters";
import type { InvestmentListItem } from "@/lib/investments/types";

interface InvestmentPositionDialogProps {
  accounts: Array<{ currency: string; id: string; name: string }>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: Record<string, unknown>, id?: string) => Promise<void>;
  open: boolean;
  position: InvestmentListItem | null;
}

function formatMoneyInput(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }

  return centsToDec(value).toFixed(2).replace(".", ",");
}

function buildInitialState(position: InvestmentListItem | null) {
  return {
    account_id: position?.account_id ?? position?.account?.id ?? "",
    annual_dividend_per_share_input:
      formatMoneyInput(position?.annual_dividend_per_share_cents) || "0",
    currency: position?.currency ?? "EUR",
    daily_price_alert_threshold_percent:
      position?.daily_price_alert_threshold_percent == null
        ? ""
        : String(position.daily_price_alert_threshold_percent),
    dividend_frequency: position?.dividend_frequency ?? "annual",
    investment_type: position?.investment_type ?? "stock",
    market: position?.market ?? "",
    name: position?.name ?? "",
    next_dividend_date: position?.next_dividend_date ?? "",
    notes: position?.notes ?? "",
    opening_date: new Date().toISOString().slice(0, 10),
    opening_price_input: "",
    opening_quantity_input: "",
    sector: position?.sector ?? "",
    ticker: position?.ticker ?? "",
  };
}

type PositionFormState = ReturnType<typeof buildInitialState>;

export function InvestmentPositionDialog({
  accounts: accountsProp,
  onOpenChange,
  onSubmit,
  open,
  position,
}: InvestmentPositionDialogProps) {
  const t = useTranslations("investments");
  const tAccount = useTranslations("accountDialog");
  const uid = useId();
  const [state, setState] = useState<PositionFormState>(() => buildInitialState(position));
  const [searchTerm, setSearchTerm] = useState(position?.ticker ?? position?.name ?? "");
  const [accounts, setAccounts] = useState(accountsProp);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const deferredSearch = useDeferredValue(searchTerm);
  const searchQuery = useTickerSearchQuery(deferredSearch);

  useEffect(() => {
    setState(buildInitialState(position));
    setSearchTerm(position?.ticker ?? position?.name ?? "");
  }, [position]);

  useEffect(() => {
    setAccounts(accountsProp);
  }, [accountsProp]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit(
      {
        ...state,
        market: state.market || null,
        next_dividend_date: state.next_dividend_date || null,
        notes: state.notes || null,
        sector: state.sector || null,
      },
      position?.id,
    );
  }

  function applySearchResult(result: {
    currency: string;
    exchange: string | null;
    name: string;
    ticker: string;
  }) {
    setState((current) => ({
      ...current,
      currency: result.currency || current.currency,
      market: result.exchange ?? current.market,
      name: result.name,
      ticker: result.ticker,
    }));
    setSearchTerm(`${result.ticker} · ${result.name}`);
  }

  const actionLabel = position ? t("dialogs.position.save") : t("dialogs.position.create");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {position ? t("dialogs.position.editTitle") : t("dialogs.position.newTitle")}
            </DialogTitle>
          </DialogHeader>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!position ? (
              <section className="space-y-3 rounded-3xl border border-border/60 bg-muted/20 p-4">
                <div className="space-y-2">
                  <Label htmlFor={`${uid}-search`}>{t("fields.search")}</Label>
                  <div className="relative">
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id={`${uid}-search`}
                      className="min-h-[44px] pl-9"
                      minLength={2}
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{t("fields.searchHint")}</p>
                </div>

                {searchQuery.isFetching ? (
                  <p className="text-xs text-muted-foreground">{t("dialogs.position.searching")}</p>
                ) : null}

                {searchQuery.data?.length ? (
                  <div className="grid gap-2">
                    {searchQuery.data.map((result) => (
                      <button
                        key={`${result.ticker}-${result.exchange ?? result.currency}`}
                        className="flex min-h-[44px] items-center justify-between rounded-2xl border border-border/60 bg-background px-4 py-3 text-left transition hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        type="button"
                        onClick={() => applySearchResult(result)}
                      >
                        <span>
                          <span className="block font-medium">{result.ticker}</span>
                          <span className="block text-xs text-muted-foreground">{result.name}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {result.exchange ?? result.currency}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${uid}-ticker`}>{t("fields.ticker")}</Label>
                <Input
                  className="min-h-[44px]"
                  id={`${uid}-ticker`}
                  required
                  value={state.ticker}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      ticker: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${uid}-name`}>{t("fields.name")}</Label>
                <Input
                  className="min-h-[44px]"
                  id={`${uid}-name`}
                  required
                  value={state.name}
                  onChange={(event) =>
                    setState((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${uid}-type`}>{t("fields.type")}</Label>
                <select
                  id={`${uid}-type`}
                  className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={state.investment_type}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      investment_type: event.target.value as PositionFormState["investment_type"],
                    }))
                  }
                >
                  {["stock", "etf", "fund", "crypto", "deposit", "bond", "reit", "other"].map(
                    (value) => (
                      <option key={value} value={value}>
                        {t(`types.${value}`)}
                      </option>
                    ),
                  )}
                </select>
                <p className="text-xs text-muted-foreground">{t("fields.typeHint")}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${uid}-account`}>
                    {t("fields.account")}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({t("fields.optionalLabel")})
                    </span>
                  </Label>
                  {accounts.length === 0 ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() => setAccountDialogOpen(true)}
                    >
                      <Plus className="h-3 w-3" aria-hidden="true" />
                      {tAccount("actions.create")}
                    </button>
                  ) : null}
                </div>
                <select
                  id={`${uid}-account`}
                  className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={state.account_id}
                  onChange={(event) =>
                    setState((current) => ({ ...current, account_id: event.target.value }))
                  }
                >
                  <option value="">{t("fields.selectAccount")}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${uid}-currency`}>{t("fields.currency")}</Label>
                <Input
                  className="min-h-[44px]"
                  id={`${uid}-currency`}
                  maxLength={3}
                  required
                  value={state.currency}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      currency: event.target.value.toUpperCase().slice(0, 3),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">{t("fields.currencyHint")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${uid}-market`}>{t("fields.market")}</Label>
                <Input
                  className="min-h-[44px]"
                  id={`${uid}-market`}
                  value={state.market}
                  onChange={(event) =>
                    setState((current) => ({ ...current, market: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${uid}-sector`}>{t("fields.sector")}</Label>
                <Input
                  className="min-h-[44px]"
                  id={`${uid}-sector`}
                  value={state.sector}
                  onChange={(event) =>
                    setState((current) => ({ ...current, sector: event.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">{t("fields.sectorHint")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${uid}-threshold`}>{t("fields.alertThreshold")}</Label>
                <Input
                  className="min-h-[44px]"
                  id={`${uid}-threshold`}
                  inputMode="decimal"
                  placeholder={t("fields.alertThresholdPlaceholder")}
                  value={state.daily_price_alert_threshold_percent}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      daily_price_alert_threshold_percent: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">{t("fields.alertThresholdHint")}</p>
              </div>
            </div>

            {!position ? (
              <section className="grid gap-4 rounded-3xl border border-border/60 bg-muted/20 p-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`${uid}-opening-quantity`}>{t("fields.initialQuantity")}</Label>
                  <Input
                    className="min-h-[44px]"
                    id={`${uid}-opening-quantity`}
                    inputMode="decimal"
                    required
                    value={state.opening_quantity_input}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        opening_quantity_input: event.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">{t("fields.initialQuantityHint")}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${uid}-opening-price`}>{t("fields.initialPrice")}</Label>
                  <Input
                    className="min-h-[44px]"
                    id={`${uid}-opening-price`}
                    inputMode="decimal"
                    required
                    value={state.opening_price_input}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        opening_price_input: event.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">{t("fields.initialPriceHint")}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${uid}-opening-date`}>{t("fields.openingDate")}</Label>
                  <Input
                    className="min-h-[44px]"
                    id={`${uid}-opening-date`}
                    required
                    type="date"
                    value={state.opening_date}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        opening_date: event.target.value,
                      }))
                    }
                  />
                </div>
              </section>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`${uid}-annual-dividend`}>{t("fields.annualDividend")}</Label>
                <Input
                  className="min-h-[44px]"
                  id={`${uid}-annual-dividend`}
                  inputMode="decimal"
                  value={state.annual_dividend_per_share_input}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      annual_dividend_per_share_input: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${uid}-next-dividend`}>{t("fields.nextDividendDate")}</Label>
                <Input
                  className="min-h-[44px]"
                  id={`${uid}-next-dividend`}
                  type="date"
                  value={state.next_dividend_date}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      next_dividend_date: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${uid}-frequency`}>{t("fields.dividendFrequency")}</Label>
                <select
                  id={`${uid}-frequency`}
                  className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={state.dividend_frequency}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      dividend_frequency: event.target
                        .value as PositionFormState["dividend_frequency"],
                    }))
                  }
                >
                  {["monthly", "quarterly", "semiannual", "annual"].map((value) => (
                    <option key={value} value={value}>
                      {t(`frequencies.${value}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${uid}-notes`}>{t("fields.notes")}</Label>
              <Textarea
                id={`${uid}-notes`}
                value={state.notes}
                onChange={(event) =>
                  setState((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px]"
                onClick={() => onOpenChange(false)}
              >
                {t("actions.cancel")}
              </Button>
              <Button type="submit" className="min-h-[44px]">
                {actionLabel}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        onCreated={(account) => {
          setAccounts((current) => [...current, { ...account, currency: account.currency }]);
          setState((current) => ({ ...current, account_id: account.id }));
        }}
      />
    </>
  );
}
