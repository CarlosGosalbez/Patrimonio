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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/shared/lib/utils";
import { Transaction } from "@/types/supabase-responses";

interface SpendingChartProps {
    userId: string;
}

export function SpendingChart({ userId }: SpendingChartProps) {
    const supabase = createClient();

    const { data, isLoading } = useQuery<{ category: string; total: number }[]>({
        queryKey: ["spending-by-category", userId],
        queryFn: async () => {
            const { data: transactions } = await supabase
                .from("transactions")
                .select("category, amount")
                .eq("user_id", userId)
                .lt("amount", 0)
                .is("deleted_at", null);

            if (!transactions) return [];

            const byCategory: Record<string, number> = {};
            (transactions as Transaction[]).forEach((t) => {
                const cat = t.category || "Otros";
                byCategory[cat] = (byCategory[cat] || 0) + Math.abs(Number(t.amount));
            });

            return Object.entries(byCategory)
                .map(([category, total]) => ({ category, total }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);
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
                <CardTitle>Gastos por Categoría</CardTitle>
                <CardDescription>Top 10 categorías con más gastos</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="category"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                            formatter={(value) => typeof value === 'number' ? formatCurrency(value, "EUR") : "€0,00"}
                            contentStyle={{ fontSize: 14 }}
                        />
                        <Bar dataKey="total" fill="hsl(var(--primary))" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
