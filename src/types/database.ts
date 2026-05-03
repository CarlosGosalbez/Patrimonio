export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_number: string | null
          created_at: string
          currency: string
          current_balance: number
          deleted_at: string | null
          id: string
          institution: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          deleted_at?: string | null
          id?: string
          institution: string
          is_active?: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          deleted_at?: string | null
          id?: string
          institution?: string
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dividends: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deleted_at: string | null
          holding_id: string
          id: string
          is_received: boolean
          payment_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          holding_id: string
          id?: string
          is_received?: boolean
          payment_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          holding_id?: string
          id?: string
          is_received?: boolean
          payment_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dividends_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "stock_holdings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dividends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_history: {
        Row: {
          account_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          errors: Json | null
          file_url: string | null
          filename: string
          id: string
          processed_records: number | null
          rows_imported: number | null
          source: string | null
          status: Database["public"]["Enums"]["import_status"]
          total_records: number | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          errors?: Json | null
          file_url?: string | null
          filename: string
          id?: string
          processed_records?: number | null
          rows_imported?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          total_records?: number | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          errors?: Json | null
          file_url?: string | null
          filename?: string
          id?: string
          processed_records?: number | null
          rows_imported?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          total_records?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mortgages: {
        Row: {
          created_at: string
          current_balance: number
          deleted_at: string | null
          end_date: string
          id: string
          institution: string
          interest_rate: number
          monthly_payment: number
          original_amount: number
          property_name: string
          start_date: string
          status: Database["public"]["Enums"]["mortgage_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_balance: number
          deleted_at?: string | null
          end_date: string
          id?: string
          institution: string
          interest_rate: number
          monthly_payment: number
          original_amount: number
          property_name: string
          start_date: string
          status?: Database["public"]["Enums"]["mortgage_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          deleted_at?: string | null
          end_date?: string
          id?: string
          institution?: string
          interest_rate?: number
          monthly_payment?: number
          original_amount?: number
          property_name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["mortgage_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortgages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_holdings: {
        Row: {
          account_id: string
          average_cost: number
          company_name: string
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          purchase_date: string | null
          shares: number
          ticker: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          average_cost: number
          company_name: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          purchase_date?: string | null
          shares: number
          ticker: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          average_cost?: number
          company_name?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          purchase_date?: string | null
          shares?: number
          ticker?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_holdings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_prices: {
        Row: {
          currency: string
          dividend_yield: number | null
          fetched_at: string
          id: string
          market_cap: number | null
          pe_ratio: number | null
          price: number
          ticker: string
        }
        Insert: {
          currency?: string
          dividend_yield?: number | null
          fetched_at?: string
          id?: string
          market_cap?: number | null
          pe_ratio?: number | null
          price: number
          ticker: string
        }
        Update: {
          currency?: string
          dividend_yield?: number | null
          fetched_at?: string
          id?: string
          market_cap?: number | null
          pe_ratio?: number | null
          price?: number
          ticker?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category: Database["public"]["Enums"]["transaction_category"]
          counterparty: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          import_id: string | null
          notes: string | null
          reference: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category: Database["public"]["Enums"]["transaction_category"]
          counterparty?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          import_id?: string | null
          notes?: string | null
          reference?: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: Database["public"]["Enums"]["transaction_category"]
          counterparty?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          import_id?: string | null
          notes?: string | null
          reference?: string | null
          transaction_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_import"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "import_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_portfolio_summary: {
        Args: { p_user_id: string }
        Returns: {
          avg_cost: number
          company_name: string
          current_price: number
          dividend_yield: number
          market_value: number
          shares: number
          ticker: string
          total_cost: number
          unrealized_gain: number
          unrealized_gain_pct: number
        }[]
      }
    }
    Enums: {
      account_type: "bank" | "investment"
      import_status: "pending" | "processing" | "completed" | "failed"
      mortgage_status: "active" | "paid_off" | "refinanced"
      transaction_category:
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
        | "other_expense"
      transaction_type: "income" | "expense" | "transfer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["bank", "investment"],
      import_status: ["pending", "processing", "completed", "failed"],
      mortgage_status: ["active", "paid_off", "refinanced"],
      transaction_category: [
        "salary",
        "freelance",
        "investment_return",
        "other_income",
        "groceries",
        "restaurants",
        "transport",
        "utilities",
        "rent",
        "mortgage",
        "insurance",
        "healthcare",
        "entertainment",
        "shopping",
        "education",
        "travel",
        "savings",
        "investments",
        "taxes",
        "fees",
        "other_expense",
      ],
      transaction_type: ["income", "expense", "transfer"],
    },
  },
} as const
