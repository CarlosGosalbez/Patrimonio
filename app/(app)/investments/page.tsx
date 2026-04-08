import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { InvestmentsPageClient } from "@/components/investments/InvestmentsPageClient";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("investments");

  return {
    title: `${t("title")} — Patrimio`,
  };
}

export default async function InvestmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <InvestmentsPageClient />;
}
