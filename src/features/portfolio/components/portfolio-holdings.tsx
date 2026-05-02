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
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface PortfolioHoldingsProps {
    userId: string;
}

export function PortfolioHoldings({ userId }: PortfolioHoldingsProps) {
    const supabase = createClient();

    const { data: holdings, isLoading } = useQuery({
        queryKey: ["portfolio-summary", userId],
        queryFn: async () => {
            const { data } = await supabase
                .rpc("get_portfolio_summary", { p_user_id: userId });
            return data || [];
        },
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cargando...</CardTitle>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Posiciones Actuales</CardTitle>
                <CardDescription>
                    Todas tus inversiones con rendimiento en tiempo real
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {holdings?.map((holding) => {
                        const isPositive = Number(holding.unrealized_gain) >= 0;
                        return (
                            <div
                                key={holding.ticker}
                                className="flex items-center justify-between border-b pb-4 last:border-0"
                            >
                                <div className="flex items-center gap-3">
                                    {isPositive ? (
                                        <ArrowUpCircle className="h-8 w-8 text-success" />
                                    ) : (
                                        <ArrowDownCircle className="h-8 w-8 text-destructive" />
                                    )}
                                    <div>
                                        <p className="font-medium text-lg">{holding.ticker}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {holding.company_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {Number(holding.shares).toFixed(2)} acciones @{" "}
                                            {formatCurrency(Number(holding.avg_cost), "USD")}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold">
                                        {formatCurrency(Number(holding.market_value), "USD")}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        @ {formatCurrency(Number(holding.current_price), "USD")}
                                    </p>
                                    <p
                                        className={`text-sm font-semibold ${isPositive ? "text-success" : "text-destructive"
                                            }`}
                                    >
                                        {isPositive ? "+" : ""}
                                        {formatCurrency(Number(holding.unrealized_gain), "USD")} (
                                        {formatPercentage(Number(holding.unrealized_gain_pct))})
                                    </p>
                                    {Number(holding.dividend_yield) > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Yield: {formatPercentage(Number(holding.dividend_yield) * 100)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {(!holdings || holdings.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">
                            No tienes inversiones registradas. Añade tu primera posición para comenzar.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
