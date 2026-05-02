import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { DashboardNav } from "@/features/dashboard/components/dashboard-nav";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    return (
        <div className="min-h-screen bg-muted/40">
            <DashboardNav user={user} />
            <main className="container mx-auto p-4 safe-area-inset-top safe-area-inset-bottom">
                {children}
            </main>
        </div>
    );
}
