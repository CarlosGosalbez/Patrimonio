import { getTranslations } from "next-intl/server";
import { TwoFactorForm } from "@/components/auth/TwoFactorForm";

export async function generateMetadata() {
  const t = await getTranslations("twoFactor");

  return {
    title: `${t("title")} — Patrimio`,
  };
}

export default function TwoFactorPage() {
  return <TwoFactorForm />;
}
