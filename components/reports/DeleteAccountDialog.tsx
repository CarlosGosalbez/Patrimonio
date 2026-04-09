"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useDeleteAccountMutation, type Account } from "@/hooks/useAccounts";
import { toast } from "sonner";

interface DeleteAccountDialogProps {
    account: Account | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({
    account,
    open,
    onOpenChange,
}: DeleteAccountDialogProps) {
    const t = useTranslations("reports.deleteAccount");
    const tCommon = useTranslations("common");
    const [confirmed, setConfirmed] = useState(false);
    const deleteMutation = useDeleteAccountMutation();
    const confirmCheckboxId = useId();

    async function handleDelete() {
        if (!account || !confirmed) return;

        try {
            await deleteMutation.mutateAsync(account.id);
            toast.success(t("successToast"));
            onOpenChange(false);
            setConfirmed(false);
        } catch (err) {
            toast.error(t("errorToast"));
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(newOpen) => {
                onOpenChange(newOpen);
                if (!newOpen) setConfirmed(false);
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                        <DialogTitle>{t("title")}</DialogTitle>
                    </div>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>

                {account && (
                    <div className="space-y-4">
                        <p className="text-sm">
                            {t("accountName")}: <strong>{account.name}</strong>
                        </p>
                        <p className="text-sm text-muted-foreground">{t("warning")}</p>

                        <div className="flex items-start gap-2">
                            <Checkbox
                                id={confirmCheckboxId}
                                checked={confirmed}
                                onCheckedChange={(checked) => setConfirmed(checked === true)}
                                aria-required="true"
                            />
                            <Label
                                htmlFor={confirmCheckboxId}
                                className="text-sm font-normal leading-snug"
                            >
                                {t("confirmLabel")}
                            </Label>
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={deleteMutation.isPending}
                    >
                        {tCommon("cancel")}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={!confirmed || deleteMutation.isPending}
                        className="min-h-[44px]"
                    >
                        {deleteMutation.isPending ? tCommon("processing") : t("deleteButton")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
