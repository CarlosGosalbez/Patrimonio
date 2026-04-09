"use client";

import { useState, useId } from "react";
import { useTranslations } from "next-intl";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { calculateCompoundInterest } from "@/lib/financial/interest";
import { formatCurrency } from "@/lib/financial/formatters";
import type { Account } from "@/hooks/useAccounts";

// Extend Account type to include new interest fields
type AccountWithInterest = Account & {
    annual_interest_rate?: number | null;
    interest_capitalization?: string | null;
};

interface InterestSimulatorCardProps {
    account: AccountWithInterest;
}

export function InterestSimulatorCard({ account }: InterestSimulatorCardProps) {
    const t = useTranslations("reports.interestSimulator");
    const [expanded, setExpanded] = useState(false);

    const principalId = useId();
    const rateId = useId();
    const periodId = useId();
    const capitalizationId = useId();

    // Form state
    const [principal, setPrincipal] = useState(account.current_balance_cents);
    const [annualRate, setAnnualRate] = useState(
        (account.annual_interest_rate ?? 0) * 100,
    ); // Convert to percentage
    const [periodMonths, setPeriodMonths] = useState(12);
    const [capitalization, setCapitalization] = useState<"monthly" | "quarterly" | "annual">(
        (account.interest_capitalization ?? "annual") as "monthly" | "quarterly" | "annual",
    );

    // Calculate results
    const result =
        annualRate > 0
            ? calculateCompoundInterest(principal, annualRate / 100, periodMonths, capitalization)
            : null;

    const handlePrincipalChange = (value: string) => {
        const euros = parseFloat(value) || 0;
        setPrincipal(Math.round(euros * 100)); // Convert to cents
    };

    return (
        <Card>
            <CardHeader
                className="cursor-pointer"
                onClick={() => setExpanded(!expanded)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpanded(!expanded);
                    }
                }}
                aria-expanded={expanded}
                aria-controls="interest-simulator-content"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" aria-hidden="true" />
                        <CardTitle className="text-lg">{t("title")}</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" aria-label={expanded ? t("collapse") : t("expand")}>
                        {expanded ? (
                            <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        )}
                    </Button>
                </div>
            </CardHeader>

            {expanded && (
                <CardContent id="interest-simulator-content" className="space-y-6">
                    {/* Input Form */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor={principalId}>{t("principalLabel")}</Label>
                            <Input
                                id={principalId}
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                value={(principal / 100).toFixed(2)}
                                onChange={(e) => handlePrincipalChange(e.target.value)}
                                className="min-h-[44px]"
                                aria-required="true"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor={rateId}>{t("rateLabel")}</Label>
                            <Input
                                id={rateId}
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                max="100"
                                value={annualRate}
                                onChange={(e) => setAnnualRate(parseFloat(e.target.value) || 0)}
                                className="min-h-[44px]"
                                aria-required="true"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor={periodId}>{t("periodLabel")}</Label>
                            <Select value={String(periodMonths)} onValueChange={(v) => setPeriodMonths(Number(v))}>
                                <SelectTrigger id={periodId} className="min-h-[44px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">
                                        1 {t("month")}
                                    </SelectItem>
                                    <SelectItem value="3">
                                        3 {t("months")}
                                    </SelectItem>
                                    <SelectItem value="6">
                                        6 {t("months")}
                                    </SelectItem>
                                    <SelectItem value="12">
                                        12 {t("months")}
                                    </SelectItem>
                                    <SelectItem value="24">
                                        24 {t("months")}
                                    </SelectItem>
                                    <SelectItem value="36">
                                        36 {t("months")}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor={capitalizationId}>{t("capitalizationLabel")}</Label>
                            <Select value={capitalization} onValueChange={(v) => setCapitalization(v as any)}>
                                <SelectTrigger id={capitalizationId} className="min-h-[44px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">{t("monthly")}</SelectItem>
                                    <SelectItem value="quarterly">{t("quarterly")}</SelectItem>
                                    <SelectItem value="annual">{t("annual")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Results */}
                    {result && (
                        <>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-lg border border-border bg-muted/30 p-4">
                                    <p className="text-sm text-muted-foreground">{t("finalBalance")}</p>
                                    <p className="text-2xl font-semibold">
                                        {formatCurrency(result.finalBalanceCents)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-muted/30 p-4">
                                    <p className="text-sm text-muted-foreground">{t("totalInterest")}</p>
                                    <p className="text-2xl font-semibold text-emerald-600">
                                        {formatCurrency(result.interestEarnedCents)}
                                    </p>
                                </div>
                            </div>

                            {/* Monthly Breakdown Table */}
                            <div>
                                <h4 className="mb-3 text-sm font-medium">{t("monthlyBreakdown")}</h4>
                                <div className="max-h-[300px] overflow-y-auto rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t("month")}</TableHead>
                                                <TableHead className="text-right">{t("startBalance")}</TableHead>
                                                <TableHead className="text-right">{t("interest")}</TableHead>
                                                <TableHead className="text-right">{t("endBalance")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {result.monthlyBreakdown.map((row) => (
                                                <TableRow key={row.month}>
                                                    <TableCell>{row.month}</TableCell>
                                                    <TableCell className="text-right">
                                                        {formatCurrency(row.startBalanceCents)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-emerald-600">
                                                        +{formatCurrency(row.interestCents)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {formatCurrency(row.endBalanceCents)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </>
                    )}

                    {annualRate === 0 && (
                        <p className="text-sm text-muted-foreground" role="status">
                            {t("zeroRateWarning")}
                        </p>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
