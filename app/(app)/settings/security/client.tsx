"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";

interface SecuritySettingsClientProps {
  tfaEnabled: boolean;
  factorId?: string;
}

export function SecuritySettingsClient({ tfaEnabled, factorId }: SecuritySettingsClientProps) {
  const router = useRouter();
  const t = useTranslations("settings.security");
  const [signingOut, setSigningOut] = useState(false);

  const handleChange = () => {
    router.refresh();
  };

  async function handleSignOut() {
    setSigningOut(true);
    await signOutAction();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-base font-medium">{t("twoFactorSection")}</h2>
        <TwoFactorSetup enabled={tfaEnabled} factorId={factorId} onChange={handleChange} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-base font-medium">{t("sessionSection")}</h2>
        <p className="text-sm text-muted-foreground">{t("sessionDescription")}</p>
        <Button
          variant="destructive"
          className="rounded-2xl"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          {signingOut ? t("signingOut") : t("signOut")}
        </Button>
      </section>
    </div>
  );
}
