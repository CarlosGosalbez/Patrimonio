import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("legal.terms");
    return { title: t("metaTitle") };
}

export default async function TermsPage() {
    const t = await getTranslations("legal.terms");

    return (
        <article className="prose prose-sm dark:prose-invert max-w-none">
            <h1>{t("title")}</h1>
            <p className="text-muted-foreground text-sm">{t("lastUpdated")}</p>

            <h2>{t("s1.title")}</h2>
            <p>{t("s1.body")}</p>

            <h2>{t("s2.title")}</h2>
            <p>{t("s2.body")}</p>

            <h2>{t("s3.title")}</h2>
            <p>{t("s3.body")}</p>

            <h2>{t("s4.title")}</h2>
            <p>{t("s4.body")}</p>
            <ul>
                <li>{t("s4.item1")}</li>
                <li>{t("s4.item2")}</li>
                <li>{t("s4.item3")}</li>
            </ul>

            <h2>{t("s5.title")}</h2>
            <p>{t("s5.body")}</p>

            <h2>{t("s6.title")}</h2>
            <p>{t("s6.body")}</p>

            <h2>{t("s7.title")}</h2>
            <p>{t("s7.body")}</p>

            <h2>{t("s8.title")}</h2>
            <p>{t("s8.body")}</p>
        </article>
    );
}
