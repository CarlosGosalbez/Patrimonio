import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { PortfolioOverview } from "@/features/portfolio/components/portfolio-overview";
import { PortfolioHoldings } from "@/features/portfolio/components/portfolio-holdings";
import { AddHoldingDialog } from "@/features/portfolio/components/add-holding-dialog";

export default async function PortfolioPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Cartera de Inversión</h1>
                    <p className="text-muted-foreground">
                        Gestiona tus acciones y sigue su rendimiento
                    </p>
                </div>
                <AddHoldingDialog userId={user.id} />
            </div>

            <PortfolioOverview userId={user.id} />
            <PortfolioHoldings userId={user.id} />
        </div>
    );
}
