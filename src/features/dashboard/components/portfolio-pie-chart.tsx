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
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { formatCurrency } from "@/shared/lib/utils";

interface PortfolioPieChartProps {
    userId: string;
}

const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
];

export function PortfolioPieChart({ userId }: PortfolioPieChartProps) {
    const supabase = createClient();

    const { data, isLoading } = useQuery({
        queryKey: ["portfolio-allocation", userId],
        queryFn: async () => {
            const { data: holdings } = await supabase
                .from("stock_holdings")
                .select(`
          *,
          stock_prices (current_price)
        `)
                .eq("user_id", userId)
                .is("deleted_at", null) as any;

            if (!holdings) return [];

            return (holdings as any[])
                .map((h) => {
                    const currentPrice = h.stock_prices?.[0]?.current_price || h.average_cost;
                    const value = Number(h.shares) * Number(currentPrice);
                    return {
                        name: h.ticker,
                        value,
                    };
                })
                .filter((h) => h.value > 0)
                .sort((a, b) => b.value - a.value);
        },
    });

    if (isLoading || !data || data.length === 0) {
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
                <CardTitle>Distribución de Cartera</CardTitle>
                <CardDescription>Asignación por activo</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.name}: ${((entry.value / data.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}%`}
                            outerRadius={80}
                            fill="hsl(var(--primary))"
                            dataKey="value"
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || "#8884d8"} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any) => typeof value === 'number' ? formatCurrency(value, "EUR") : "€0,00"}
                            contentStyle={{ fontSize: 14 }}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
