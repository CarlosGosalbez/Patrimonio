"use client";

import { useState } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { TRANSACTION_CATEGORIES } from "@/shared/constants/database-enums";

export function TransactionFilters() {
    const [type, setType] = useState("all");
    const [category, setCategory] = useState("Todos");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [search, setSearch] = useState("");

    const handleReset = () => {
        setType("all");
        setCategory("Todos");
        setDateFrom("");
        setDateTo("");
        setSearch("");
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-5">
                    <div className="space-y-2">
                        <Label htmlFor="filter-search">Buscar</Label>
                        <Input
                            id="filter-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Descripción..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="filter-type">Tipo</Label>
                        <select
                            id="filter-type"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="all">Todos</option>
                            <option value="income">Ingresos</option>
                            <option value="expense">Gastos</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="filter-category">Categoría</Label>
                        <select
                            id="filter-category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="Todos">Todas</option>
                            {TRANSACTION_CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="filter-from">Desde</Label>
                        <Input
                            id="filter-from"
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="filter-to">Hasta</Label>
                        <Input
                            id="filter-to"
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={handleReset}>
                        Limpiar filtros
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
