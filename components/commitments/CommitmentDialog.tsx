"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { AccountDialog } from "@/components/app/AccountDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CommitmentListItem } from "@/lib/commitments/types";

const commitmentTypes = [
  "mortgage",
  "rent_income",
  "rent_expense",
  "subscription",
  "tax",
  "insurance",
  "utility",
  "other",
] as const;

const commitmentFrequencies = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "annual",
] as const;

type CommitmentType = (typeof commitmentTypes)[number];

// Fields visible per commitment type
const TYPE_VISIBILITY: Record<
  CommitmentType,
  {
    accountRequired: boolean;
    showCancelledAt: boolean;
    showMortgageFields: boolean;
    showServiceName: boolean;
    showToleranceDays: boolean;
  }
> = {
  mortgage: {
    accountRequired: true,
    showCancelledAt: false,
    showMortgageFields: true,
    showServiceName: false,
    showToleranceDays: false,
  },
  rent_income: {
    accountRequired: false,
    showCancelledAt: false,
    showMortgageFields: false,
    showServiceName: false,
    showToleranceDays: true,
  },
  rent_expense: {
    accountRequired: true,
    showCancelledAt: false,
    showMortgageFields: false,
    showServiceName: false,
    showToleranceDays: false,
  },
  subscription: {
    accountRequired: true,
    showCancelledAt: true,
    showMortgageFields: false,
    showServiceName: true,
    showToleranceDays: false,
  },
  tax: {
    accountRequired: true,
    showCancelledAt: false,
    showMortgageFields: false,
    showServiceName: false,
    showToleranceDays: false,
  },
  insurance: {
    accountRequired: true,
    showCancelledAt: true,
    showMortgageFields: false,
    showServiceName: true,
    showToleranceDays: false,
  },
  utility: {
    accountRequired: true,
    showCancelledAt: false,
    showMortgageFields: false,
    showServiceName: true,
    showToleranceDays: false,
  },
  other: {
    accountRequired: false,
    showCancelledAt: true,
    showMortgageFields: false,
    showServiceName: true,
    showToleranceDays: true,
  },
};

interface CommitmentDialogProps {
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; is_income: boolean; name: string }>;
  commitment: CommitmentListItem | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: Record<string, unknown>, id?: string) => Promise<void>;
  open: boolean;
}

function buildInitialState(commitment?: CommitmentListItem | null) {
  return {
    account_id: commitment?.account_id ?? "",
    advance_notice_days: commitment?.advance_notice_days ?? 7,
    allows_early_repayment: commitment?.allows_early_repayment ?? false,
    amount_input: commitment
      ? String((commitment.amount_cents / 100).toFixed(2)).replace(".", ",")
      : "",
    cancelled_at: commitment?.cancelled_at ?? "",
    category_id: commitment?.category_id ?? "",
    commitment_type: (commitment?.commitment_type ?? "other") as CommitmentType,
    description: commitment?.description ?? "",
    frequency: commitment?.frequency ?? "monthly",
    interest_rate_input: commitment?.interest_rate?.toString() ?? "",
    is_active: commitment?.is_active ?? true,
    is_automated: commitment?.is_automated ?? true,
    is_income: commitment?.is_income ?? false,
    is_variable_rate: commitment?.is_variable_rate ?? false,
    maturity_year: commitment?.maturity_year?.toString() ?? "",
    name: commitment?.name ?? "",
    next_due_date: commitment?.next_due_date ?? new Date().toISOString().slice(0, 10),
    service_name: commitment?.service_name ?? "",
    start_date: commitment?.start_date ?? new Date().toISOString().slice(0, 10),
    tolerance_days: commitment?.tolerance_days ?? 3,
  };
}

type CommitmentFormState = ReturnType<typeof buildInitialState>;

export function CommitmentDialog({
  accounts: accountsProp,
  categories,
  commitment,
  onOpenChange,
  onSubmit,
  open,
}: CommitmentDialogProps) {
  const t = useTranslations("commitments");
  const tAccount = useTranslations("accountDialog");
  const [state, setState] = useState<CommitmentFormState>(() => buildInitialState(commitment));
  const [accounts, setAccounts] = useState(accountsProp);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  const visibility = TYPE_VISIBILITY[state.commitment_type];
  const filteredCategories = categories.filter(
    (category) => category.is_income === state.is_income,
  );

  useEffect(() => {
    setState(buildInitialState(commitment));
  }, [commitment]);

  useEffect(() => {
    setAccounts(accountsProp);
  }, [accountsProp]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit(
      {
        ...state,
        account_id: state.account_id || null,
        cancelled_at: state.cancelled_at || null,
        category_id: state.category_id || null,
        interest_rate_input: state.interest_rate_input || null,
        maturity_year: state.maturity_year ? Number(state.maturity_year) : null,
        service_name: state.service_name || null,
      },
      commitment?.id,
    );
  }

  function handleTypeChange(type: CommitmentType) {
    const isIncome = type === "rent_income";
    setState((current) => ({
      ...current,
      commitment_type: type,
      is_income: isIncome,
      category_id: "",
      // Clear account for income types
      account_id: TYPE_VISIBILITY[type].accountRequired ? current.account_id : "",
    }));
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{commitment ? t("editTitle") : t("newTitle")}</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            {commitment?.mortgage_projection ? (
              <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                <p className="text-sm font-medium">{t("mortgageProjection.title")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("mortgageProjection.detail", {
                    months: commitment.mortgage_projection.remaining_months,
                    years: commitment.mortgage_projection.remaining_years,
                  })}
                </p>
              </div>
            ) : null}

            {/* ── Core fields ── */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="commitment-name">{t("fields.name")}</Label>
                <Input
                  id="commitment-name"
                  className="min-h-[44px]"
                  required
                  value={state.name}
                  onChange={(event) =>
                    setState((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commitment-type">{t("fields.type")}</Label>
                <select
                  id="commitment-type"
                  className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={state.commitment_type}
                  onChange={(event) => handleTypeChange(event.target.value as CommitmentType)}
                >
                  {commitmentTypes.map((value) => (
                    <option key={value} value={value}>
                      {t(`types.${value}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commitment-amount">{t("fields.amount")}</Label>
                <Input
                  id="commitment-amount"
                  className="min-h-[44px]"
                  inputMode="decimal"
                  required
                  value={state.amount_input}
                  onChange={(event) =>
                    setState((current) => ({ ...current, amount_input: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commitment-frequency">{t("fields.frequency")}</Label>
                <select
                  id="commitment-frequency"
                  className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={state.frequency}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      frequency: event.target.value as (typeof commitmentFrequencies)[number],
                    }))
                  }
                >
                  {commitmentFrequencies.map((value) => (
                    <option key={value} value={value}>
                      {t(`frequencies.${value}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commitment-next-due">{t("fields.nextDueDate")}</Label>
                <Input
                  id="commitment-next-due"
                  className="min-h-[44px]"
                  type="date"
                  required
                  value={state.next_due_date}
                  onChange={(event) =>
                    setState((current) => ({ ...current, next_due_date: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commitment-start">{t("fields.startDate")}</Label>
                <Input
                  id="commitment-start"
                  className="min-h-[44px]"
                  type="date"
                  required
                  value={state.start_date}
                  onChange={(event) =>
                    setState((current) => ({ ...current, start_date: event.target.value }))
                  }
                />
              </div>
            </div>

            {/* ── Account selector (conditional) ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="commitment-account">
                  {t("fields.account")}
                  {!visibility.accountRequired ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({t("fields.optional")})
                    </span>
                  ) : null}
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
                id="commitment-account"
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required={visibility.accountRequired}
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
              {accounts.length === 0 && visibility.accountRequired ? (
                <p className="text-xs text-amber-600">{t("fields.noAccountsHint")}</p>
              ) : null}
            </div>

            {/* ── Category ── */}
            <div className="space-y-2">
              <Label htmlFor="commitment-category">{t("fields.category")}</Label>
              <select
                id="commitment-category"
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={state.category_id}
                onChange={(event) =>
                  setState((current) => ({ ...current, category_id: event.target.value }))
                }
              >
                <option value="">{t("fields.noCategory")}</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ── Mortgage-specific fields ── */}
            {visibility.showMortgageFields ? (
              <div className="grid gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="commitment-maturity-year">{t("fields.maturityYear")}</Label>
                  <Input
                    id="commitment-maturity-year"
                    className="min-h-[44px]"
                    inputMode="numeric"
                    value={state.maturity_year}
                    onChange={(event) =>
                      setState((current) => ({ ...current, maturity_year: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commitment-interest-rate">{t("fields.interestRate")}</Label>
                  <Input
                    id="commitment-interest-rate"
                    className="min-h-[44px]"
                    inputMode="decimal"
                    value={state.interest_rate_input}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        interest_rate_input: event.target.value,
                      }))
                    }
                  />
                </div>
                <label className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-border/60 px-4 py-3 text-sm md:col-span-2">
                  <input
                    type="checkbox"
                    checked={state.allows_early_repayment}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        allows_early_repayment: event.target.checked,
                      }))
                    }
                  />
                  {t("fields.allowsEarlyRepayment")}
                </label>
              </div>
            ) : null}

            {/* ── Subscription / service name ── */}
            {visibility.showServiceName ? (
              <div className="space-y-2">
                <Label htmlFor="commitment-service-name">{t("fields.serviceName")}</Label>
                <Input
                  id="commitment-service-name"
                  className="min-h-[44px]"
                  value={state.service_name}
                  onChange={(event) =>
                    setState((current) => ({ ...current, service_name: event.target.value }))
                  }
                />
              </div>
            ) : null}

            {/* ── Cancellation date (for subscriptions) ── */}
            {visibility.showCancelledAt ? (
              <div className="space-y-2">
                <Label htmlFor="commitment-cancelled-at">{t("fields.cancelledAt")}</Label>
                <Input
                  id="commitment-cancelled-at"
                  className="min-h-[44px]"
                  type="date"
                  value={state.cancelled_at}
                  onChange={(event) =>
                    setState((current) => ({ ...current, cancelled_at: event.target.value }))
                  }
                />
              </div>
            ) : null}

            {/* ── Tolerance days (for income / rent_income) ── */}
            {visibility.showToleranceDays ? (
              <div className="space-y-2">
                <Label htmlFor="commitment-tolerance-days">{t("fields.toleranceDays")}</Label>
                <Input
                  id="commitment-tolerance-days"
                  className="min-h-[44px]"
                  inputMode="numeric"
                  value={state.tolerance_days}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      tolerance_days: Number(event.target.value),
                    }))
                  }
                />
              </div>
            ) : null}

            {/* ── Description ── */}
            <div className="space-y-2">
              <Label htmlFor="commitment-description">{t("fields.description")}</Label>
              <Textarea
                id="commitment-description"
                value={state.description}
                onChange={(event) =>
                  setState((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>

            {/* ── Checkboxes ── */}
            <div className="flex flex-wrap gap-3">
              <label className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-border/60 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={state.is_automated}
                  onChange={(event) =>
                    setState((current) => ({ ...current, is_automated: event.target.checked }))
                  }
                />
                {t("fields.isAutomated")}
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                onClick={() => onOpenChange(false)}
              >
                {t("actions.cancel")}
              </Button>
              <Button type="submit" className="rounded-2xl">
                {commitment ? t("actions.save") : t("actions.create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        onCreated={(account) => {
          setAccounts((current) => [...current, account]);
          setState((current) => ({ ...current, account_id: account.id }));
        }}
      />
    </>
  );
}
