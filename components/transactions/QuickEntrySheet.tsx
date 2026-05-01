"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import { useAccountsQuery } from "@/hooks/useAccounts";
import { useCategoriesQuery } from "@/hooks/useCategories";
import { useCreateTransactionMutation } from "@/hooks/useTransactions";
import { decToCents } from "@/lib/financial/formatters";
import { safeString } from "@/lib/validation/safe-zod";

const QuickEntrySchema = z.object({
  is_income: z.boolean(),
  amount: z
    .string()
    .min(1)
    .regex(/^\d{1,12}([.,]\d{1,2})?$/, "Formato inválido"),
  description: z.string().trim().min(1).max(500),
  category_id: z.string().uuid().optional(),
  account_id: z.string().uuid({ message: "Selecciona una cuenta" }),
});

type QuickEntryForm = z.infer<typeof QuickEntrySchema>;

interface QuickEntrySheetProps {
  open: boolean;
  onClose: () => void;
}

export function QuickEntrySheet({ open, onClose }: QuickEntrySheetProps) {
  const t = useTranslations("transactions");
  const formId = useId();
  const [isIncome, setIsIncome] = useState(false);

  const { data: accounts = [] } = useAccountsQuery();
  const { data: categories = [] } = useCategoriesQuery(isIncome ? "income" : "expense");
  const createMutation = useCreateTransactionMutation();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickEntryForm>({
    resolver: zodResolver(QuickEntrySchema),
    defaultValues: { is_income: false },
  });

  const handleClose = () => {
    reset();
    setIsIncome(false);
    onClose();
  };

  const onSubmit = async (data: QuickEntryForm) => {
    const normalizedAmount = data.amount.replace(",", ".");
    const euroAmount = parseFloat(normalizedAmount);
    if (isNaN(euroAmount) || euroAmount <= 0) return;

    try {
      await createMutation.mutateAsync({
        account_id: data.account_id,
        category_id: data.category_id ?? null,
        amount_cents: decToCents(euroAmount),
        description: data.description,
        is_income: isIncome,
        transaction_date: new Date().toISOString().split("T")[0],
      });
      toast.success(t("toasts.created"));
      handleClose();
    } catch {
      // mutation onError handles toast
    }
  };

  const toggleType = (income: boolean) => {
    setIsIncome(income);
    setValue("is_income", income);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t("quickEntry.title")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-background shadow-2xl"
          >
            {/* Handle */}
            <div className="flex justify-center pb-1 pt-3" aria-hidden="true">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="flex items-center justify-between px-4 py-2">
              <h2 className="text-base font-semibold">{t("quickEntry.title")}</h2>
              <button
                onClick={handleClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:ring-2"
                aria-label={t("quickEntry.close")}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form
              id={formId}
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-4 px-4 pb-8 pt-2"
            >
              {/* Type toggle */}
              <div role="group" aria-label={t("quickEntry.type")}>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleType(false)}
                    aria-pressed={!isIncome}
                    className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 font-medium transition-colors focus-visible:ring-2 ${
                      !isIncome
                        ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <ArrowDownCircle className="h-4 w-4" aria-hidden="true" />
                    {t("quickEntry.expense")}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleType(true)}
                    aria-pressed={isIncome}
                    className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 font-medium transition-colors focus-visible:ring-2 ${
                      isIncome
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <ArrowUpCircle className="h-4 w-4" aria-hidden="true" />
                    {t("quickEntry.income")}
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-amount`} className="text-sm font-medium">
                  {t("fields.amount")}
                </Label>
                <Input
                  id={`${formId}-amount`}
                  inputMode="decimal"
                  placeholder="0,00"
                  autoComplete="off"
                  aria-required="true"
                  aria-invalid={!!errors.amount}
                  aria-describedby={errors.amount ? `${formId}-amount-err` : undefined}
                  className="min-h-[44px] text-xl font-semibold focus-visible:ring-2"
                  {...register("amount")}
                />
                {errors.amount && (
                  <p id={`${formId}-amount-err`} role="alert" className="text-xs text-destructive">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-description`} className="text-sm font-medium">
                  {t("fields.description")}
                </Label>
                <Input
                  id={`${formId}-description`}
                  placeholder={t("quickEntry.descriptionPlaceholder")}
                  aria-required="true"
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? `${formId}-desc-err` : undefined}
                  className="min-h-[44px] focus-visible:ring-2"
                  {...register("description")}
                />
                {errors.description && (
                  <p id={`${formId}-desc-err`} role="alert" className="text-xs text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Account */}
              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-account`} className="text-sm font-medium">
                  {t("fields.account")}
                </Label>
                <Select
                  onValueChange={(val) => setValue("account_id", val)}
                  defaultValue={accounts[0]?.id}
                >
                  <SelectTrigger
                    id={`${formId}-account`}
                    aria-required="true"
                    aria-invalid={!!errors.account_id}
                    className="min-h-[44px] focus-visible:ring-2"
                  >
                    <SelectValue placeholder={t("quickEntry.selectAccount")} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.account_id && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.account_id.message}
                  </p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-category`} className="text-sm font-medium">
                  {t("fields.category")}
                </Label>
                <Select
                  onValueChange={(val) =>
                    setValue("category_id", val === "_none" ? undefined : val)
                  }
                >
                  <SelectTrigger
                    id={`${formId}-category`}
                    className="min-h-[44px] focus-visible:ring-2"
                  >
                    <SelectValue placeholder={t("quickEntry.noCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{t("quickEntry.noCategory")}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className="min-h-[44px] w-full focus-visible:ring-2"
              >
                {isSubmitting || createMutation.isPending
                  ? t("quickEntry.saving")
                  : t("quickEntry.save")}
              </Button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
