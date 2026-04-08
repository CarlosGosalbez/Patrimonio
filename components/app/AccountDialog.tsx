"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateAccountMutation } from "@/hooks/usePhaseThree";

const ACCOUNT_TYPES = ["checking", "savings", "cash", "credit_card", "investment"] as const;
const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY"];

interface AccountDialogProps {
  onCreated?: (account: { id: string; name: string; currency: string }) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function AccountDialog({ onCreated, onOpenChange, open }: AccountDialogProps) {
  const t = useTranslations("accountDialog");
  const uid = useId();
  const createAccount = useCreateAccountMutation();

  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<(typeof ACCOUNT_TYPES)[number]>("checking");
  const [currency, setCurrency] = useState("EUR");
  const [bankName, setBankName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(value: boolean) {
    if (!value) {
      setName("");
      setAccountType("checking");
      setCurrency("EUR");
      setBankName("");
      setError(null);
    }
    onOpenChange(value);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const result = await createAccount.mutateAsync({
        name,
        account_type: accountType,
        currency,
        bank_name: bankName || null,
        initial_balance_cents: 0,
      });

      handleOpenChange(false);
      onCreated?.(result.account);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("toasts.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          {error ? (
            <p
              role="alert"
              className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`${uid}-name`}>{t("fields.name")}</Label>
            <Input
              id={`${uid}-name`}
              className="min-h-[44px]"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${uid}-type`}>{t("fields.type")}</Label>
              <select
                id={`${uid}-type`}
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as (typeof ACCOUNT_TYPES)[number])}
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`types.${type}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${uid}-currency`}>{t("fields.currency")}</Label>
              <select
                id={`${uid}-currency`}
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${uid}-bank`}>{t("fields.bankName")}</Label>
            <Input
              id={`${uid}-bank`}
              className="min-h-[44px]"
              placeholder={t("fields.bankNamePlaceholder")}
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-2xl"
              onClick={() => handleOpenChange(false)}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" className="rounded-2xl" disabled={createAccount.isPending}>
              {createAccount.isPending ? t("actions.creating") : t("actions.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
