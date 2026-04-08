import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export async function generateMetadata() {
  const t = await getTranslations("settings.security");

  return {
    title: `${t("title")} — Patrimio`,
  };
}

// This page is a server component shell — the actual interactive UI
// (TwoFactorSetup, RecoveryCodes) is rendered via client components.
export default async function SecuritySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if user has any TOTP factor enrolled
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totpFactor = factors?.totp?.[0];

  const { SecuritySettingsClient } = await import("./client");

  return <SecuritySettingsClient tfaEnabled={!!totpFactor} factorId={totpFactor?.id} />;
}
