import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

const InvestmentsPageClient = dynamic(
  () =>
    import("@/components/investments/InvestmentsPageClient").then(mod => ({
      default: mod.InvestmentsPageClient,
    })),
  {
    loading: () => (
      <div className="container mx-auto max-w-7xl space-y-6 p-6">
        <div className="h-12 w-48 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    ),
  }
);

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
