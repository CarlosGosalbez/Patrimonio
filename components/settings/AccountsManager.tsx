"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Pencil } from "lucide-react";
import { useAccountsQuery, useUpdateAccountMutation } from "../../hooks/useAccounts";
import { AccountFormDialog } from "@/components/settings/AccountFormDialog";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

export function AccountsManager() {
  const t = useTranslations("accounts");
  const tCommon = useTranslations("common");
  const accountsQuery = useAccountsQuery();
  const updateMutation = useUpdateAccountMutation();

  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const accounts = accountsQuery.data || [];

  async function handleToggleVisibility(accountId: string, currentIsHidden: boolean) {
    try {
      await updateMutation.mutateAsync({
        id: accountId,
        is_hidden: !currentIsHidden,
      });
      toast.success(t(currentIsHidden ? "shown" : "hidden"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("updateError"));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="space-y-4">
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t("noAccounts")}</p>
            </CardContent>
          </Card>
        ) : (
          accounts.map((account: Account) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {account.color && (
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: account.color }}
                      >
                        {account.icon || "💰"}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{account.name}</CardTitle>
                      <CardDescription>
                        {account.bank_name} · {account.account_type}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {account.is_default && <Badge variant="secondary">{t("defaultAccount")}</Badge>}
                    {account.is_hidden && <Badge variant="outline">{t("hidden")}</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingAccount(account)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("edit")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleVisibility(account.id, account.is_hidden)}
                  >
                    {account.is_hidden ? (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        {t("show")}
                      </>
                    ) : (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        {t("hide")}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {editingAccount && (
        <AccountFormDialog
          account={editingAccount}
          open={!!editingAccount}
          onOpenChange={(open: boolean) => !open && setEditingAccount(null)}
        />
      )}
    </div>
  );
}
