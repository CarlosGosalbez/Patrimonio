"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/shared/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Building2 } from "lucide-react";

interface DashboardOverviewProps {
    userId: string;
}

export function DashboardOverview({ userId }: DashboardOverviewProps) {
    const supabase = createClient();

    const { data: accounts } = useQuery({
        queryKey: ["accounts", userId],
        queryFn: async () => {
            const { data } = await supabase
                .from("accounts")
                .select("*")
                .eq("user_id", userId)
                .is("deleted_at", null);
            return data || [];
        },
    });

    const { data: portfolioData } = useQuery({
        queryKey: ["portfolio-summary", userId],
        queryFn: async () => {
            const { data } = await supabase
                .rpc("get_portfolio_summary", { p_user_id: userId });
            return data || [];
        },
    });

    const { data: mortgages } = useQuery({
        queryKey: ["mortgages", userId],
        queryFn: async () => {
            const { data } = await supabase
                .from("mortgages")
                .select("*")
                .eq("user_id", userId)
                .eq("status", "active")
                .is("deleted_at", null);
            return data || [];
        },
    });

    const totalCash = accounts?.reduce((sum, acc) => sum + Number(acc.current_balance), 0) || 0;
    const totalPortfolio = portfolioData?.reduce((sum, holding) => sum + Number(holding.market_value), 0) || 0;
    const totalMortgages = mortgages?.reduce((sum, m) => sum + Number(m.current_balance), 0) || 0;
    const netWorth = totalCash + totalPortfolio - totalMortgages;

    const totalGain = portfolioData?.reduce((sum, h) => sum + Number(h.unrealized_gain), 0) || 0;
    const gainPercentage = totalPortfolio > 0 ? (totalGain / (totalPortfolio - totalGain)) * 100 : 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Patrimonio Neto</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(netWorth)}</div>
                    <p className="text-xs text-muted-foreground">
                        Total de activos menos pasivos
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Efectivo</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalCash)}</div>
                    <p className="text-xs text-muted-foreground">
                        {accounts?.length || 0} cuentas activas
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cartera Bolsa</CardTitle>
                    {totalGain >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalPortfolio, "USD")}</div>
                    <p className={`text-xs ${totalGain >= 0 ? "text-success" : "text-destructive"}`}>
                        {totalGain >= 0 ? "+" : ""}{formatCurrency(totalGain, "USD")} ({gainPercentage.toFixed(2)}%)
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Hipotecas</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalMortgages)}</div>
                    <p className="text-xs text-muted-foreground">
                        {mortgages?.length || 0} activas
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
