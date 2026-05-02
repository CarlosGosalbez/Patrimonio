"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/shared/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";
import { Building, TrendingUp, Eye, EyeOff } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useState } from "react";

interface AccountsListProps {
    userId: string;
}

export function AccountsList({ userId }: AccountsListProps) {
    const supabase = createClient();
    const [showBalances, setShowBalances] = useState(true);

    const { data: accounts, isLoading } = useQuery({
        queryKey: ["accounts", userId],
        queryFn: async () => {
            const { data } = await supabase
                .from("accounts")
                .select("*")
                .eq("user_id", userId)
                .is("deleted_at", null)
                .order("created_at", { ascending: false });
            return data || [];
        },
    });

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader>
                            <div className="h-6 bg-muted rounded w-3/4" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 bg-muted rounded w-1/2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const bankAccounts = accounts?.filter((a) => a.type === "bank") || [];
    const investmentAccounts = accounts?.filter((a) => a.type === "investment") || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBalances(!showBalances)}
                    aria-label={showBalances ? "Ocultar balances" : "Mostrar balances"}
                >
                    {showBalances ? (
                        <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Ocultar
                        </>
                    ) : (
                        <>
                            <Eye className="h-4 w-4 mr-2" />
                            Mostrar
                        </>
                    )}
                </Button>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Cuentas Bancarias ({bankAccounts.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {bankAccounts.map((account) => (
                        <Card key={account.id} className="transition-smooth hover:shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>{account.name}</span>
                                    {!account.is_active && (
                                        <span className="text-xs text-muted-foreground">Inactiva</span>
                                    )}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">{account.institution}</p>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">
                                    {showBalances
                                        ? formatCurrency(Number(account.current_balance), account.currency)
                                        : "••••••"}
                                </p>
                                {account.account_number && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        •••• {account.account_number.slice(-4)}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Cuentas de Inversión ({investmentAccounts.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {investmentAccounts.map((account) => (
                        <Card key={account.id} className="transition-smooth hover:shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>{account.name}</span>
                                    {!account.is_active && (
                                        <span className="text-xs text-muted-foreground">Inactiva</span>
                                    )}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">{account.institution}</p>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">
                                    {showBalances
                                        ? formatCurrency(Number(account.current_balance), account.currency)
                                        : "••••••"}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {(!accounts || accounts.length === 0) && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">
                            No tienes cuentas registradas. Crea tu primera cuenta para comenzar.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
