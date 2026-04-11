import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

const DashboardPageClient = dynamic(
  () =>
    import("@/components/dashboard/DashboardPageClient").then(mod => ({
      default: mod.DashboardPageClient,
    })),
  {
    loading: () => (
      <div className="container mx-auto max-w-7xl space-y-6 p-6">
        <div className="h-12 w-48 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    ),
  }
);

export async function generateMetadata() {
  const t = await getTranslations("dashboard");

  return {
    title: `${t("title")} — Patrimio`,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <DashboardPageClient />;
}
