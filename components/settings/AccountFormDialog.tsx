"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateAccountMutation } from "../../hooks/useAccounts";
import { toast } from "sonner";
import { DEFAULT_CATEGORY_COLORS } from "@/lib/categories/types";
import { Check } from "lucide-react";
import type { Database } from "@/types/database";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface AccountFormDialogProps {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountFormDialog({ account, open, onOpenChange }: AccountFormDialogProps) {
  const t = useTranslations("accounts");
  const tCommon = useTranslations("common");
  const updateMutation = useUpdateAccountMutation();

  const [name, setName] = useState(account.name);
  const [color, setColor] = useState(account.color || DEFAULT_CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState(account.icon || "💰");
  const accountNameId = useId();
  const accountIconId = useId();

  async function handleSubmit() {
    try {
      await updateMutation.mutateAsync({
        id: account.id,
        name: name.trim(),
        color,
        icon,
      });
      toast.success(t("updated"));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("updateError"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>{t("editDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor={accountNameId}>{t("nameLabel")}</Label>
            <Input
              id={accountNameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2"
              maxLength={100}
            />
          </div>

          <div>
            <Label>{t("colorLabel")}</Label>
            <div className="mt-2 grid grid-cols-8 gap-2">
              {DEFAULT_CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="relative h-10 w-10 rounded-full transition-transform hover:scale-110 focus-visible:ring-2"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="absolute inset-0 m-auto h-5 w-5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor={accountIconId}>{t("iconLabel")}</Label>
            <Input
              id={accountIconId}
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="mt-2"
              maxLength={4}
              placeholder="💰"
            />
            <p className="mt-1 text-sm text-muted-foreground">{t("iconHint")}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending || !name.trim()}>
            {updateMutation.isPending ? tCommon("processing") : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
