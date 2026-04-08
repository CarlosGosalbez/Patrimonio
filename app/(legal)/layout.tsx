import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
    const t = await getTranslations("common");

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b px-4 py-4 sm:px-6">
                <nav className="mx-auto flex max-w-3xl items-center justify-between">
                    <Link href="/" className="text-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                        {t("brandName")}
                    </Link>
                    <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                        {t("backToApp")}
                    </Link>
                </nav>
            </header>
            <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
                {children}
            </main>
            <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground">
                © {new Date().getFullYear()} {t("brandName")}
            </footer>
        </div>
    );
}
