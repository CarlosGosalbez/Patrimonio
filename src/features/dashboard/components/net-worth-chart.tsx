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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/shared/lib/utils";

interface NetWorthChartProps {
    userId: string;
}

export function NetWorthChart({ userId }: NetWorthChartProps) {
    const supabase = createClient();

    const { data, isLoading } = useQuery({
        queryKey: ["net-worth-trend", userId],
        queryFn: async () => {
            const { data: accounts } = await supabase
                .from("accounts")
                .select("balance, currency")
                .eq("user_id", userId)
                .eq("is_active", true)
                .is("deleted_at", null);

            const { data: holdings } = await supabase
                .from("stock_holdings")
                .select(`
          *,
          stock_prices (current_price)
        `)
                .eq("user_id", userId)
                .is("deleted_at", null);

            const { data: mortgages } = await supabase
                .from("mortgages")
                .select("principal_amount, amount_paid")
                .eq("user_id", userId)
                .eq("status", "active")
                .is("deleted_at", null);

            const cashBalance = accounts?.reduce((sum, a: any) => sum + Number(a.balance), 0) || 0;

            const portfolioValue = holdings?.reduce((sum, h: any) => {
                const price = h.stock_prices?.[0]?.current_price || h.average_cost;
                return sum + Number(h.shares) * Number(price);
            }, 0) || 0;

            const mortgageDebt = mortgages?.reduce((sum, m: any) => {
                return sum + (Number(m.principal_amount) - Number(m.amount_paid));
            }, 0) || 0;

            const netWorth = cashBalance + portfolioValue - mortgageDebt;

            // Generate 12 months of mock data (in real app, would query historical snapshots)
            const months = [];
            const today = new Date();
            for (let i = 11; i >= 0; i--) {
                const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthName = date.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
                // Mock: slight variations around current net worth
                const variation = (Math.random() - 0.5) * 0.1 * netWorth;
                months.push({
                    month: monthName,
                    netWorth: netWorth + variation,
                });
            }

            // Set current month to actual value
            if (months.length > 0) {
                if (months.length > 0 && months[months.length - 1]) {
                    months[months.length - 1]!.netWorth = netWorth;
                }
            }
            return months;
        },
    });

    if (isLoading || !data) {
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
                <CardTitle>Evolución del Patrimonio Neto</CardTitle>
                <CardDescription>Últimos 12 meses</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                            formatter={(value: any) => typeof value === 'number' ? formatCurrency(value, "EUR") : "€0,00"}
                            contentStyle={{ fontSize: 14 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="netWorth"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
