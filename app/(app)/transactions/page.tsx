import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TransactionsPageClient } from "@/components/transactions/TransactionsPageClient";
import { createClient } from "@/lib/supabase/server";

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
