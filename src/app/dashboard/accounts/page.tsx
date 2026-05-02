import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { AccountsList } from "@/features/accounts/components/accounts-list";
import { CreateAccountDialog } from "@/features/accounts/components/create-account-dialog";

export default async function AccountsPage() {
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
                    <h1 className="text-3xl font-bold">Cuentas</h1>
                    <p className="text-muted-foreground">
                        Gestiona tus cuentas bancarias y de inversión
                    </p>
                </div>
                <CreateAccountDialog userId={user.id} />
            </div>

            <AccountsList userId={user.id} />
        </div>
    );
}
