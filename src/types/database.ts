export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "bank" | "investment";
          institution: string;
          account_number: string | null;
          currency: string;
          current_balance: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: "bank" | "investment";
          institution: string;
          account_number?: string | null;
          currency?: string;
          current_balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: "bank" | "investment";
          institution?: string;
          account_number?: string | null;
          currency?: string;
          current_balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          type: "income" | "expense" | "transfer";
          category:
            | "salary"
            | "freelance"
            | "investment_return"
            | "other_income"
            | "groceries"
            | "restaurants"
            | "transport"
            | "utilities"
            | "rent"
            | "mortgage"
            | "insurance"
            | "healthcare"
            | "entertainment"
            | "shopping"
            | "education"
            | "travel"
            | "savings"
            | "investments"
            | "taxes"
            | "fees"
            | "other_expense";
          amount: number;
          description: string | null;
          transaction_date: string;
          counterparty: string | null;
          reference: string | null;
          notes: string | null;
          import_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          type: "income" | "expense" | "transfer";
          category:
            | "salary"
            | "freelance"
            | "investment_return"
            | "other_income"
            | "groceries"
            | "restaurants"
            | "transport"
            | "utilities"
            | "rent"
            | "mortgage"
            | "insurance"
            | "healthcare"
            | "entertainment"
            | "shopping"
            | "education"
            | "travel"
            | "savings"
            | "investments"
            | "taxes"
            | "fees"
            | "other_expense";
          amount: number;
          description?: string | null;
          transaction_date: string;
          counterparty?: string | null;
          reference?: string | null;
          notes?: string | null;
          import_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          type?: "income" | "expense" | "transfer";
          category?:
            | "salary"
            | "freelance"
            | "investment_return"
            | "other_income"
            | "groceries"
            | "restaurants"
            | "transport"
            | "utilities"
            | "rent"
            | "mortgage"
            | "insurance"
            | "healthcare"
            | "entertainment"
            | "shopping"
            | "education"
            | "travel"
            | "savings"
            | "investments"
            | "taxes"
            | "fees"
            | "other_expense";
          amount?: number;
          description?: string | null;
          transaction_date?: string;
          counterparty?: string | null;
          reference?: string | null;
          notes?: string | null;
          import_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      mortgages: {
        Row: {
          id: string;
          user_id: string;
          property_name: string;
          institution: string;
          original_amount: number;
          current_balance: number;
          interest_rate: number;
          monthly_payment: number;
          start_date: string;
          end_date: string;
          status: "active" | "paid_off" | "refinanced";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          property_name: string;
          institution: string;
          original_amount: number;
          current_balance: number;
          interest_rate: number;
          monthly_payment: number;
          start_date: string;
          end_date: string;
          status?: "active" | "paid_off" | "refinanced";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          property_name?: string;
          institution?: string;
          original_amount?: number;
          current_balance?: number;
          interest_rate?: number;
          monthly_payment?: number;
          start_date?: string;
          end_date?: string;
          status?: "active" | "paid_off" | "refinanced";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      stock_holdings: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          ticker: string;
          company_name: string;
          shares: number;
          average_cost: number;
          currency: string;
          purchase_date: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          ticker: string;
          company_name: string;
          shares: number;
          average_cost: number;
          currency?: string;
          purchase_date?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          ticker?: string;
          company_name?: string;
          shares?: number;
          average_cost?: number;
          currency?: string;
          purchase_date?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      stock_prices: {
        Row: {
          id: string;
          ticker: string;
          price: number;
          currency: string;
          market_cap: number | null;
          pe_ratio: number | null;
          dividend_yield: number | null;
          fetched_at: string;
        };
        Insert: {
          id?: string;
          ticker: string;
          price: number;
          currency?: string;
          market_cap?: number | null;
          pe_ratio?: number | null;
          dividend_yield?: number | null;
          fetched_at?: string;
        };
        Update: {
          id?: string;
          ticker?: string;
          price?: number;
          currency?: string;
          market_cap?: number | null;
          pe_ratio?: number | null;
          dividend_yield?: number | null;
          fetched_at?: string;
        };
      };
      dividends: {
        Row: {
          id: string;
          user_id: string;
          holding_id: string;
          amount: number;
          currency: string;
          payment_date: string;
          is_received: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          holding_id: string;
          amount: number;
          currency?: string;
          payment_date: string;
          is_received?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          holding_id?: string;
          amount?: number;
          currency?: string;
          payment_date?: string;
          is_received?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      import_history: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          filename: string;
          file_url: string | null;
          status: "pending" | "processing" | "completed" | "failed";
          rows_imported: number | null;
          errors: Json | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          filename: string;
          file_url?: string | null;
          status?: "pending" | "processing" | "completed" | "failed";
          rows_imported?: number | null;
          errors?: Json | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          filename?: string;
          file_url?: string | null;
          status?: "pending" | "processing" | "completed" | "failed";
          rows_imported?: number | null;
          errors?: Json | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
    };
    Functions: {
      get_portfolio_summary: {
        Args: {
          p_user_id: string;
        };
        Returns: Array<{
          ticker: string;
          company_name: string;
          shares: number;
          avg_cost: number;
          current_price: number;
          market_value: number;
          total_cost: number;
          unrealized_gain: number;
          unrealized_gain_pct: number;
          dividend_yield: number;
        }>;
      };
    };
  };
}
