"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { requestJson } from "@/lib/http/client";
import type {
  MonthlyReport,
  AnnualReport,
  FiscalReport,
  PeriodComparisonReport,
} from "@/lib/reports/types";

export type ReportType = "monthly" | "annual";
export type ExportFormat = "pdf" | "excel" | "gdpr";

const keys = {
  monthly: (month: number, year: number) => ["reports", "monthly", month, year] as const,
  annual: (year: number) => ["reports", "annual", year] as const,
  fiscal: (year: number) => ["reports", "fiscal", year] as const,
  comparison: (type: "month" | "year", month: number, year: number) =>
    ["reports", "comparison", type, month, year] as const,
};

export function useMonthlyReportQuery(month: number, year: number) {
  return useQuery<MonthlyReport>({
    queryKey: keys.monthly(month, year),
    queryFn: () => requestJson<MonthlyReport>(`/api/reports/monthly?month=${month}&year=${year}`),
  });
}

export function useAnnualReportQuery(year: number) {
  return useQuery<AnnualReport>({
    queryKey: keys.annual(year),
    queryFn: () => requestJson<AnnualReport>(`/api/reports/annual?year=${year}`),
  });
}

export function useFiscalReportQuery(year: number) {
  return useQuery<FiscalReport>({
    queryKey: keys.fiscal(year),
    queryFn: () => requestJson<FiscalReport>(`/api/reports/fiscal?year=${year}`),
  });
}

export function usePeriodComparisonQuery(type: "month" | "year", month: number, year: number) {
  return useQuery<PeriodComparisonReport>({
    queryKey: keys.comparison(type, month, year),
    queryFn: () =>
      requestJson<PeriodComparisonReport>(
        `/api/reports/comparison?type=${type}&month=${month}&year=${year}`,
      ),
  });
}

async function downloadFile(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Error al generar el archivo");
  const blob = await response.blob();
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(anchor.href);
}

export function useDownloadPdf() {
  return useMutation({
    mutationFn: async ({
      type,
      month,
      year,
    }: {
      type: "monthly" | "fiscal";
      month?: number;
      year: number;
    }) => {
      const params = new URLSearchParams({ type, year: String(year) });
      if (month) params.set("month", String(month));
      const filename =
        type === "fiscal"
          ? `patrimio-fiscal-irpf-${year}.pdf`
          : `patrimio-informe-${year}-${String(month ?? 1).padStart(2, "0")}.pdf`;
      await downloadFile(`/api/reports/pdf?${params}`, filename);
    },
  });
}

export function useDownloadExcel() {
  return useMutation({
    mutationFn: async ({
      type,
      month,
      year,
    }: {
      type: "monthly" | "annual";
      month?: number;
      year: number;
    }) => {
      const params = new URLSearchParams({ type, year: String(year) });
      if (month) params.set("month", String(month));
      const filename =
        type === "annual"
          ? `patrimio-anual-${year}.xlsx`
          : `patrimio-informe-${year}-${String(month ?? 1).padStart(2, "0")}.xlsx`;
      await downloadFile(`/api/reports/excel?${params}`, filename);
    },
  });
}

export function useDownloadGdpr() {
  return useMutation({
    mutationFn: async () => {
      const date = new Date().toISOString().slice(0, 10);
      await downloadFile("/api/reports/gdpr", `patrimio-datos-${date}.zip`);
    },
  });
}
