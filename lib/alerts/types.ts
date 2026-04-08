import type { Database } from "@/types/database";

export type CustomAlertRow = Database["public"]["Tables"]["custom_alerts"]["Row"];

export interface CustomAlertCategorySummary {
  color: string | null;
  icon: string | null;
  id: string;
  is_income: boolean;
  name: string;
}

export interface CustomAlertListItem extends CustomAlertRow {
  category: CustomAlertCategorySummary | null;
  next_due_date: string;
  severity: "critical" | "warning" | "info";
  is_snoozed: boolean;
  is_system_default: boolean;
  is_paid_for_cycle: boolean;
}

export interface AlertsPreferences {
  weekly_alert_digest_enabled: boolean;
}

export interface CustomAlertsResponse {
  alerts: CustomAlertListItem[];
  preferences: AlertsPreferences;
  upcoming_deadlines: CustomAlertListItem[];
}
