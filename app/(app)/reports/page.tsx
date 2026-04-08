import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ReportsPageClient } from "@/components/reports/ReportsPageClient";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("reports");
  return {
    title: `${t("title")} — Patrimio`,
  };
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <ReportsPageClient />;
}
