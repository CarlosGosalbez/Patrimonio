"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card";
import { useToast } from "@/shared/hooks/use-toast";

export default function SignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            toast({
                variant: "destructive",
                title: "Error al crear cuenta",
                description: error.message,
            });
            setLoading(false);
        } else if (data.user) {
            // Create profile
            const { error: profileError } = await supabase.from("profiles").insert({
                id: data.user.id,
                email: data.user.email!,
                full_name: fullName,
            });

            if (profileError) {
                toast({
                    variant: "destructive",
                    title: "Error al crear perfil",
                    description: profileError.message,
                });
                setLoading(false);
            } else {
                toast({
                    title: "¡Cuenta creada!",
                    description: "Redirigiendo al dashboard...",
                });
                router.push("/dashboard");
                router.refresh();
            }
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 safe-area-inset-top safe-area-inset-bottom">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-3xl font-bold">Crear Cuenta</CardTitle>
                    <CardDescription>
                        Comienza a gestionar tu patrimonio de forma profesional
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSignup}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Nombre completo</Label>
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="Juan Pérez"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                autoComplete="name"
                                aria-label="Nombre completo"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                aria-label="Correo electrónico"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete="new-password"
                                aria-label="Contraseña"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                            aria-label="Crear cuenta"
                        >
                            {loading ? "Creando cuenta..." : "Crear Cuenta"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push("/auth/login")}
                            aria-label="Volver a inicio de sesión"
                        >
                            Ya tengo cuenta
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
