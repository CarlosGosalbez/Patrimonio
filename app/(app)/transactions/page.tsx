import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

const TransactionsPageClient = dynamic(
    () =>
        import("@/components/transactions/TransactionsPageClient").then(mod => ({
            default: mod.TransactionsPageClient,
        })),
    {
        loading: () => (
            <div className="container mx-auto max-w-7xl space-y-6 p-6">
                <div className="h-12 w-48 animate-pulse rounded-xl bg-muted" />
                <div className="grid gap-4">
                    <div className="h-16 animate-pulse rounded-xl bg-muted" />
                    <div className="h-16 animate-pulse rounded-xl bg-muted" />
                    <div className="h-16 animate-pulse rounded-xl bg-muted" />
                </div>
            </div>
        ),
    }
);

export async function generateMetadata() {
    const t = await getTranslations("transactions");

    return {
        title: `${t("title")} — Patrimio`,
    };
}

export default async function TransactionsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return <TransactionsPageClient />;
}
