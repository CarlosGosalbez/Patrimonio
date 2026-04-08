import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { CategoryManager } from "@/components/settings/CategoryManager";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("categories");
    return {
        title: t("pageTitle"),
        description: t("pageDescription"),
    };
}

export default function CategoriesPage() {
    return <CategoryManager />;
}
