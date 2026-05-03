import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { FileUpload } from "@/features/import/components/file-upload";
import { ImportHistory } from "@/features/import/components/import-history";

export default async function ImportPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Importar Transacciones</h1>
                <p className="text-muted-foreground">
                    Sube archivos Excel de ING o TradeRepublic
                </p>
            </div>

            <FileUpload userId={user.id} />
            <ImportHistory userId={user.id} />
        </div>
    );
}
