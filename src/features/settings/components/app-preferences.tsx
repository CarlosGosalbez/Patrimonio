"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";

interface AppPreferencesProps {
    userId: string;
}

export function AppPreferences() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Preferencias</CardTitle>
                <CardDescription>Personaliza tu experiencia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="currency">Moneda predeterminada</Label>
                    <select
                        id="currency"
                        defaultValue="EUR"
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="dateFormat">Formato de fecha</Label>
                    <select
                        id="dateFormat"
                        defaultValue="dd/mm/yyyy"
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                        <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                        <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="language">Idioma</Label>
                    <select
                        id="language"
                        defaultValue="es"
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                    </select>
                </div>

                <p className="text-sm text-muted-foreground">
                    Las preferencias se guardarán en futuras versiones
                </p>
            </CardContent>
        </Card>
    );
}
