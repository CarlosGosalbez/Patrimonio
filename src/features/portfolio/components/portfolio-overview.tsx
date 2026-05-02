"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/shared/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatCurrency, formatPercentage } from "@/shared/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";

interface PortfolioOverviewProps {
    userId: string;
}

export function PortfolioOverview({ userId }: PortfolioOverviewProps) {
    const supabase = createClient();

    const { data: portfolioData } = useQuery({
        queryKey: ["portfolio-summary", userId],
        queryFn: async () => {
            const { data } = await supabase
                .rpc("get_portfolio_summary", { p_user_id: userId });
            return data || [];
        },
    });

    const totalValue = portfolioData?.reduce((sum, h) => sum + Number(h.market_value), 0) || 0;
    const totalCost = portfolioData?.reduce((sum, h) => sum + Number(h.total_cost), 0) || 0;
    const totalGain = portfolioData?.reduce((sum, h) => sum + Number(h.unrealized_gain), 0) || 0;
    const gainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    const avgDividendYield =
        portfolioData && portfolioData.length > 0
            ? portfolioData.reduce((sum, h) => sum + Number(h.dividend_yield), 0) / portfolioData.length
            : 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalValue, "USD")}</div>
                    <p className="text-xs text-muted-foreground">
                        {portfolioData?.length || 0} posiciones
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Coste Total</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalCost, "USD")}</div>
                    <p className="text-xs text-muted-foreground">Inversión inicial</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ganancia No Realizada</CardTitle>
                    {totalGain >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                </CardHeader>
                <CardContent>
                    <div
                        className={`text-2xl font-bold ${totalGain >= 0 ? "text-success" : "text-destructive"
                            }`}
                    >
                        {totalGain >= 0 ? "+" : ""}
                        {formatCurrency(totalGain, "USD")}
                    </div>
                    <p
                        className={`text-xs ${totalGain >= 0 ? "text-success" : "text-destructive"
                            }`}
                    >
                        {gainPercentage >= 0 ? "+" : ""}
                        {formatPercentage(gainPercentage)}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Yield Promedio</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {formatPercentage(avgDividendYield * 100)}
                    </div>
                    <p className="text-xs text-muted-foreground">Dividendos anuales</p>
                </CardContent>
            </Card>
        </div>
    );
}
