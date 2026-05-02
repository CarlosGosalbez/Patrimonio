"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/shared/lib/supabase/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card";
import { formatCurrency, formatPercentage } from "@/shared/lib/utils";
import { TrendingUp } from "lucide-react";

interface PortfolioSummaryProps {
    userId: string;
}

export function PortfolioSummary({ userId }: PortfolioSummaryProps) {
    const supabase = createClient();

    const { data: holdings } = useQuery({
        queryKey: ["portfolio-summary", userId],
        queryFn: async () => {
            const { data } = await supabase
                .rpc("get_portfolio_summary", { p_user_id: userId });
            return data || [];
        },
    });

    const topHoldings = holdings?.slice(0, 5) || [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Cartera de Inversión
                </CardTitle>
                <CardDescription>Top 5 posiciones por valor</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {topHoldings.map((holding) => (
                        <div
                            key={holding.ticker}
                            className="flex items-center justify-between"
                        >
                            <div>
                                <p className="font-medium">{holding.ticker}</p>
                                <p className="text-sm text-muted-foreground">
                                    {Number(holding.shares).toFixed(2)} acciones
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">
                                    {formatCurrency(Number(holding.market_value), "USD")}
                                </p>
                                <p
                                    className={`text-sm ${Number(holding.unrealized_gain) >= 0
                                            ? "text-success"
                                            : "text-destructive"
                                        }`}
                                >
                                    {formatPercentage(Number(holding.unrealized_gain_pct))}
                                </p>
                            </div>
                        </div>
                    ))}

                    {topHoldings.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                            No hay inversiones registradas
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
