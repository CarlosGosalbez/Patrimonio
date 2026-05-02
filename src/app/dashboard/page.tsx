import { createClient } from "@/shared/lib/supabase/server";
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";
import { RecentTransactions } from "@/features/dashboard/components/recent-transactions";
import { PortfolioSummary } from "@/features/dashboard/components/portfolio-summary";
import { MortgageSummary } from "@/features/dashboard/components/mortgage-summary";

export default async function DashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                    Visión general de tu patrimonio
                </p>
            </div>

            <DashboardOverview userId={user!.id} />

            <div className="grid gap-6 md:grid-cols-2">
                <PortfolioSummary userId={user!.id} />
                <MortgageSummary userId={user!.id} />
            </div>

            <RecentTransactions userId={user!.id} />
        </div>
    );
}
