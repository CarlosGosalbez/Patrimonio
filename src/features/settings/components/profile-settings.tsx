"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/shared/lib/supabase/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/hooks/use-toast";
import { User } from "@supabase/supabase-js";

interface ProfileSettingsProps {
    user: User;
    profile: any;
}

export function ProfileSettings({ user, profile }: ProfileSettingsProps) {
    const [fullName, setFullName] = useState(profile?.full_name || "");
    const { toast } = useToast();
    const supabase = createClient();

    const updateMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from("profiles")
                .update({ full_name: fullName })
                .eq("id", user.id);

            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Perfil actualizado" });
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Perfil</CardTitle>
                <CardDescription>Actualiza tu información personal</CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        updateMutation.mutate();
                    }}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={user.email} disabled />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fullName">Nombre completo</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Tu nombre"
                        />
                    </div>

                    <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
