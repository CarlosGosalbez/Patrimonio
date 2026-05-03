import { Database } from "./database";

// Table Row Types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Account = Database["public"]["Tables"]["accounts"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type StockHolding = Database["public"]["Tables"]["stock_holdings"]["Row"];
export type StockPrice = Database["public"]["Tables"]["stock_prices"]["Row"];
export type Mortgage = Database["public"]["Tables"]["mortgages"]["Row"];
export type ImportHistory = Database["public"]["Tables"]["import_history"]["Row"];

// Insert Types
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type AccountInsert = Database["public"]["Tables"]["accounts"]["Insert"];
export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
export type StockHoldingInsert = Database["public"]["Tables"]["stock_holdings"]["Insert"];
export type MortgageInsert = Database["public"]["Tables"]["mortgages"]["Insert"];
export type ImportHistoryInsert = Database["public"]["Tables"]["import_history"]["Insert"];

// Update Types
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type AccountUpdate = Database["public"]["Tables"]["accounts"]["Update"];
export type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];
export type StockHoldingUpdate = Database["public"]["Tables"]["stock_holdings"]["Update"];
export type MortgageUpdate = Database["public"]["Tables"]["mortgages"]["Update"];
export type ImportHistoryUpdate = Database["public"]["Tables"]["import_history"]["Update"];

// Extended Types with Relations
export type TransactionWithAccount = Transaction & {
  accounts: Account | null;
};

export type StockHoldingWithPrice = StockHolding & {
  stock_prices: StockPrice[];
};

// RPC Function Response Types
export interface PortfolioSummaryItem {
  ticker: string;
  company_name: string;
  shares: number;
  average_cost: number;
  current_price: number;
  market_value: number;
  total_cost: number;
  unrealized_gain: number;
  unrealized_gain_pct: number;
  dividend_yield: number | null;
}

export interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  unrealized_gain: number;
  unrealized_gain_pct: number;
  dividend_yield: number;
  holdings: PortfolioSummaryItem[];
}

// Recharts Types
export interface ChartDataItem {
  name: string;
  value: number;
}

export interface NetWorthDataItem {
  month: string;
  netWorth: number;
}

// Excel Parser Types
export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  currency: string;
  notes: string | null;
}

// Form Types
export interface TransactionFormData {
  type: "income" | "expense";
  account_id: string;
  amount: number;
  description: string;
  category: string;
  transaction_date: string;
  notes: string | null;
}

export interface AccountFormData {
  name: string;
  institution: string;
  type: "bank" | "investment";
  account_number: string | null;
  currency: string;
  balance: number;
}

export interface StockHoldingFormData {
  account_id: string;
  ticker: string;
  company_name: string;
  shares: number;
  average_cost: number;
  purchase_date: string;
}

export interface MortgageFormData {
  property_address: string;
  lender: string;
  principal_amount: number;
  interest_rate: number;
  monthly_payment: number;
  start_date: string;
  end_date: string;
  currency: string;
  amount_paid?: number;
  status?: "active" | "paid_off" | "refinanced";
}
