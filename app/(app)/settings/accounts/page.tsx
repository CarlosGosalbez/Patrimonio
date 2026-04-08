import { getTranslations } from "next-intl/server";
import { AccountsManager } from "@/components/settings/AccountsManager";

export async function generateMetadata() {
    const t = await getTranslations("accounts");
    return {
        title: t("pageTitle"),
        description: t("pageDescription"),
    };
}

export default function AccountsSettingsPage() {
    return <AccountsManager />;
}
