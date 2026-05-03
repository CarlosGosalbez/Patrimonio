import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { MortgagesList } from "@/features/mortgages/components/mortgages-list";
import { CreateMortgageDialog } from "@/features/mortgages/components/create-mortgage-dialog";

export default async function MortgagesPage() {
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
                    <h1 className="text-3xl font-bold">Hipotecas</h1>
                    <p className="text-muted-foreground">
                        Gestiona tus préstamos hipotecarios
                    </p>
                </div>
                <CreateMortgageDialog userId={user.id} />
            </div>

            <MortgagesList userId={user.id} />
        </div>
    );
}
