"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

/**
 * GDPR Article 17 — Account Deletion Dialog
 * Double confirmation + password verification
 * 
 * Security requirements:
 * - User must type "ELIMINAR" exactly
 * - User must provide current password
 * - Cannot be undone (GDPR compliance)
 */
interface DeleteAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
    const t = useTranslations("privacy");
    const tCommon = useTranslations("common");
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [confirmText, setConfirmText] = useState("");
    const [isPending, setIsPending] = useState(false);

    const passwordId = useId();
    const confirmId = useId();

    async function handleDelete() {
        if (confirmText !== "ELIMINAR") {
            toast.error(t("deleteAccount.confirmError"));
            return;
        }

        if (!password) {
            toast.error(t("deleteAccount.passwordRequired"));
            return;
        }

        setIsPending(true);
        try {
            const res = await fetch("/api/privacy/delete-account", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, confirmation: confirmText }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || "Failed to delete account");
            }

            toast.success(t("deleteAccount.success"));
            router.push("/login");
        } catch (error) {
            console.error("Delete account error:", error);
            toast.error(
                error instanceof Error ? error.message : t("deleteAccount.error")
            );
        } finally {
            setIsPending(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                        {t("deleteAccount.title")}
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        {t("deleteAccount.warning")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor={passwordId}>{t("deleteAccount.passwordLabel")}</Label>
                        <Input
                            id={passwordId}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-2 min-h-[44px]"
                            aria-required
                            disabled={isPending}
                        />
                    </div>

                    <div>
                        <Label htmlFor={confirmId}>
                            {t("deleteAccount.confirmLabel")}
                        </Label>
                        <p className="mb-2 text-xs text-muted-foreground">
                            {t("deleteAccount.confirmHint")}
                        </p>
                        <Input
                            id={confirmId}
                            placeholder="ELIMINAR"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="mt-2 min-h-[44px] font-mono"
                            aria-required
                            disabled={isPending}
                        />
                    </div>
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-row">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        {tCommon("cancel")}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isPending || confirmText !== "ELIMINAR" || !password}
                        className="w-full sm:w-auto"
                    >
                        {isPending ? tCommon("processing") : t("deleteAccount.confirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
