import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { PrivacyContent } from "@/components/settings/PrivacyContent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default function PrivacyPage() {
  return <PrivacyContent />;
}
