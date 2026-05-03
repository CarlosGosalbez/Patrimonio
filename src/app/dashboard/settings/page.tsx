import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ProfileSettings } from "@/features/settings/components/profile-settings";
import { PasswordChange } from "@/features/settings/components/password-change";
import { AppPreferences } from "@/features/settings/components/app-preferences";
import { DataExport } from "@/features/settings/components/data-export";

export default async function SettingsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Configuración</h1>
                <p className="text-muted-foreground">
                    Gestiona tu perfil y preferencias
                </p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="profile">Perfil</TabsTrigger>
                    <TabsTrigger value="password">Contraseña</TabsTrigger>
                    <TabsTrigger value="preferences">Preferencias</TabsTrigger>
                    <TabsTrigger value="data">Datos</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    <ProfileSettings user={user} profile={profile} />
                </TabsContent>

                <TabsContent value="password">
                    <PasswordChange />
                </TabsContent>

                <TabsContent value="preferences">
                    <AppPreferences userId={user.id} />
                </TabsContent>

                <TabsContent value="data">
                    <DataExport userId={user.id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
