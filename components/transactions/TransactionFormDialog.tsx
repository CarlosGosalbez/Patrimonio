"use client";

import { useId, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccountsQuery } from "@/hooks/useAccounts";
import { useCategoriesQuery } from "@/hooks/useCategories";
import {
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
} from "@/hooks/useTransactions";
import { decToCents, centsToDec } from "@/lib/financial/formatters";
import { safeString } from "@/lib/validation/safe-zod";
import type { TransactionListItem } from "@/lib/transactions/types";

const FormSchema = z.object({
  is_income: z.boolean(),
  amount: z
    .string()
    .min(1)
    .regex(/^\d{1,12}([.,]\d{1,2})?$/, "Formato inválido"),
  description: z.string().trim().min(1).max(500),
  notes: z.string().max(2000).optional(),
  category_id: z.string().optional(),
  account_id: z.string().uuid(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type FormValues = z.infer<typeof FormSchema>;

interface TransactionFormDialogProps {
  open: boolean;
  onClose: () => void;
  transaction?: TransactionListItem | null;
}

export function TransactionFormDialog({ open, onClose, transaction }: TransactionFormDialogProps) {
  const t = useTranslations("transactions");
  const formId = useId();
  const isEditing = !!transaction;

  const { data: accounts = [] } = useAccountsQuery();
  const createMutation = useCreateTransactionMutation();
  const updateMutation = useUpdateTransactionMutation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      is_income: false,
      transaction_date: new Date().toISOString().split("T")[0],
    },
  });

  const isIncomeValue = watch("is_income");
  const { data: categories = [] } = useCategoriesQuery(isIncomeValue ? "income" : "expense");

  useEffect(() => {
    if (transaction) {
      reset({
        is_income: transaction.is_income,
        amount: String(centsToDec(Math.abs(transaction.amount_cents))),
        description: transaction.description,
        notes: transaction.notes ?? "",
        category_id: transaction.category_id ?? undefined,
        account_id: transaction.account_id,
        transaction_date: transaction.transaction_date,
      });
    } else {
      reset({
        is_income: false,
        transaction_date: new Date().toISOString().split("T")[0],
      });
    }
  }, [transaction, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: FormValues) => {
    const normalizedAmount = data.amount.replace(",", ".");
    const euroAmount = parseFloat(normalizedAmount);
    if (isNaN(euroAmount) || euroAmount <= 0) return;

    const payload = {
      account_id: data.account_id,
      category_id: data.category_id && data.category_id !== "_none" ? data.category_id : null,
      amount_cents: decToCents(euroAmount),
      description: data.description,
      is_income: data.is_income,
      transaction_date: data.transaction_date,
      notes: data.notes || null,
    };

    try {
      if (isEditing && transaction) {
        await updateMutation.mutateAsync({ id: transaction.id, ...payload });
        toast.success(t("toasts.updated"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("toasts.created"));
      }
      handleClose();
    } catch {
      // mutation onError handles toast
    }
  };

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("form.editTitle") : t("form.newTitle")}</DialogTitle>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-2">
          {/* Income / Expense toggle */}
          <div className="flex items-center justify-between rounded-xl border p-3">
            <span className="text-sm font-medium">
              {isIncomeValue ? t("form.income") : t("form.expense")}
            </span>
            <Switch
              id={`${formId}-is-income`}
              checked={isIncomeValue}
              onCheckedChange={(v) => setValue("is_income", v)}
              aria-label={t("form.typeToggle")}
              className="focus-visible:ring-2"
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-amount`}>{t("fields.amount")}</Label>
            <Input
              id={`${formId}-amount`}
              inputMode="decimal"
              placeholder="0,00"
              aria-required="true"
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? `${formId}-amount-err` : undefined}
              className="min-h-[44px] focus-visible:ring-2"
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
            <Label htmlFor={`${formId}-description`}>{t("fields.description")}</Label>
            <Input
              id={`${formId}-description`}
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

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-date`}>{t("fields.date")}</Label>
            <Input
              id={`${formId}-date`}
              type="date"
              aria-required="true"
              aria-invalid={!!errors.transaction_date}
              aria-describedby={errors.transaction_date ? `${formId}-date-err` : undefined}
              className="min-h-[44px] focus-visible:ring-2"
              {...register("transaction_date")}
            />
            {errors.transaction_date && (
              <p id={`${formId}-date-err`} role="alert" className="text-xs text-destructive">
                {errors.transaction_date.message}
              </p>
            )}
          </div>

          {/* Account */}
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-account`}>{t("fields.account")}</Label>
            <Select
              value={watch("account_id")}
              onValueChange={(val) => setValue("account_id", val)}
            >
              <SelectTrigger
                id={`${formId}-account`}
                aria-required="true"
                aria-invalid={!!errors.account_id}
                className="min-h-[44px] focus-visible:ring-2"
              >
                <SelectValue placeholder={t("form.selectAccount")} />
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
            <Label htmlFor={`${formId}-category`}>{t("fields.category")}</Label>
            <Select
              value={watch("category_id") ?? "_none"}
              onValueChange={(val) => setValue("category_id", val === "_none" ? undefined : val)}
            >
              <SelectTrigger
                id={`${formId}-category`}
                className="min-h-[44px] focus-visible:ring-2"
              >
                <SelectValue placeholder={t("form.noCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">{t("form.noCategory")}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-notes`}>{t("fields.notes")}</Label>
            <Textarea
              id={`${formId}-notes`}
              rows={3}
              className="resize-none focus-visible:ring-2"
              {...register("notes")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="min-h-[44px] focus-visible:ring-2"
            >
              {t("form.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="min-h-[44px] focus-visible:ring-2"
            >
              {isPending ? t("form.saving") : isEditing ? t("form.save") : t("form.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
