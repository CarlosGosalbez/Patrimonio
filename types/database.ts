export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_type: string
          bank_name: string | null
          color: string | null
          created_at: string
          currency: string
          current_balance_cents: number
          deleted_at: string | null
          iban: string | null
          icon: string | null
          id: string
          initial_balance_cents: number
          is_default: boolean
          is_hidden: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: string
          bank_name?: string | null
          color?: string | null
          created_at?: string
          currency?: string
          current_balance_cents?: number
          deleted_at?: string | null
          iban?: string | null
          icon?: string | null
          id?: string
          initial_balance_cents?: number
          is_default?: boolean
          is_hidden?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          bank_name?: string | null
          color?: string | null
          created_at?: string
          currency?: string
          current_balance_cents?: number
          deleted_at?: string | null
          iban?: string | null
          icon?: string | null
          id?: string
          initial_balance_cents?: number
          is_default?: boolean
          is_hidden?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auto_categorization_rules: {
        Row: {
          category_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_case_sensitive: boolean
          is_regex: boolean
          pattern: string
          priority: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_case_sensitive?: boolean
          is_regex?: boolean
          pattern: string
          priority?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_case_sensitive?: boolean
          is_regex?: boolean
          pattern?: string
          priority?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_categorization_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          alert_threshold: number
          category_id: string
          created_at: string
          currency: string
          deleted_at: string | null
          end_date: string | null
          id: string
          is_active: boolean
          limit_cents: number
          period: Database["public"]["Enums"]["budget_period"]
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_threshold?: number
          category_id: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          limit_cents: number
          period?: Database["public"]["Enums"]["budget_period"]
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_threshold?: number
          category_id?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          limit_cents?: number
          period?: Database["public"]["Enums"]["budget_period"]
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          icon: string | null
          id: string
          is_income: boolean
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_income?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_income?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_alerts: {
        Row: {
          advance_notice_days: number
          auto_deactivate: boolean
          category_id: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          description: string | null
          dismissed_until: string | null
          due_date: string
          expected_amount_cents: number | null
          id: string
          is_active: boolean
          name: string
          recurrence: Database["public"]["Enums"]["alert_recurrence_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          advance_notice_days?: number
          auto_deactivate?: boolean
          category_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          dismissed_until?: string | null
          due_date: string
          expected_amount_cents?: number | null
          id?: string
          is_active?: boolean
          name: string
          recurrence: Database["public"]["Enums"]["alert_recurrence_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          advance_notice_days?: number
          auto_deactivate?: boolean
          category_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          dismissed_until?: string | null
          due_date?: string
          expected_amount_cents?: number | null
          id?: string
          is_active?: boolean
          name?: string
          recurrence?: Database["public"]["Enums"]["alert_recurrence_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_alerts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates_cache: {
        Row: {
          base_currency: string
          created_at: string
          data_source: string | null
          id: string
          quote_currency: string
          rate_value: number
          updated_at: string
        }
        Insert: {
          base_currency: string
          created_at?: string
          data_source?: string | null
          id?: string
          quote_currency: string
          rate_value: number
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          data_source?: string | null
          id?: string
          quote_currency?: string
          rate_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      investment_operations: {
        Row: {
          created_at: string
          currency: string
          deleted_at: string | null
          fee_cents: number
          id: string
          investment_id: string
          notes: string | null
          operation_date: string
          operation_type: Database["public"]["Enums"]["operation_type"]
          price_cents: number
          quantity: number
          realized_pl_cents: number | null
          total_cents: number
          updated_at: string
          user_id: string
          withholding_cents: number
        }
        Insert: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          fee_cents?: number
          id?: string
          investment_id: string
          notes?: string | null
          operation_date: string
          operation_type: Database["public"]["Enums"]["operation_type"]
          price_cents: number
          quantity: number
          realized_pl_cents?: number | null
          total_cents: number
          updated_at?: string
          user_id: string
          withholding_cents?: number
        }
        Update: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          fee_cents?: number
          id?: string
          investment_id?: string
          notes?: string | null
          operation_date?: string
          operation_type?: Database["public"]["Enums"]["operation_type"]
          price_cents?: number
          quantity?: number
          realized_pl_cents?: number | null
          total_cents?: number
          updated_at?: string
          user_id?: string
          withholding_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "investment_operations_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_snapshots: {
        Row: {
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          snapshot_date: string
          total_invested_cents: number
          total_value_cents: number
          unrealized_pl_cents: number
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          snapshot_date: string
          total_invested_cents?: number
          total_value_cents?: number
          unrealized_pl_cents?: number
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          snapshot_date?: string
          total_invested_cents?: number
          total_value_cents?: number
          unrealized_pl_cents?: number
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          account_id: string | null
          annual_dividend_per_share_cents: number
          avg_purchase_price_cents: number
          created_at: string
          currency: string
          current_price_cents: number | null
          current_value_cents: number | null
          daily_price_alert_threshold_percent: number | null
          deleted_at: string | null
          dividend_frequency: Database["public"]["Enums"]["frequency_type"]
          id: string
          investment_type: Database["public"]["Enums"]["investment_type"]
          is_active: boolean
          last_price_update: string | null
          market: string | null
          name: string
          next_dividend_date: string | null
          notes: string | null
          quantity: number
          sector: string | null
          ticker: string
          total_invested_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          annual_dividend_per_share_cents?: number
          avg_purchase_price_cents?: number
          created_at?: string
          currency?: string
          current_price_cents?: number | null
          current_value_cents?: number | null
          daily_price_alert_threshold_percent?: number | null
          deleted_at?: string | null
          dividend_frequency?: Database["public"]["Enums"]["frequency_type"]
          id?: string
          investment_type: Database["public"]["Enums"]["investment_type"]
          is_active?: boolean
          last_price_update?: string | null
          market?: string | null
          name: string
          next_dividend_date?: string | null
          notes?: string | null
          quantity?: number
          sector?: string | null
          ticker: string
          total_invested_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          annual_dividend_per_share_cents?: number
          avg_purchase_price_cents?: number
          created_at?: string
          currency?: string
          current_price_cents?: number | null
          current_value_cents?: number | null
          daily_price_alert_threshold_percent?: number | null
          deleted_at?: string | null
          dividend_frequency?: Database["public"]["Enums"]["frequency_type"]
          id?: string
          investment_type?: Database["public"]["Enums"]["investment_type"]
          is_active?: boolean
          last_price_update?: string | null
          market?: string | null
          name?: string
          next_dividend_date?: string | null
          notes?: string | null
          quantity?: number
          sector?: string | null
          ticker?: string
          total_invested_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      market_cache: {
        Row: {
          asset_type: Database["public"]["Enums"]["investment_type"]
          change_cents: number | null
          change_percent: number | null
          created_at: string
          currency: string
          data_source: string | null
          id: string
          market: string | null
          name: string | null
          price_cents: number
          ticker: string
          updated_at: string
          volume: number | null
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["investment_type"]
          change_cents?: number | null
          change_percent?: number | null
          created_at?: string
          currency?: string
          data_source?: string | null
          id?: string
          market?: string | null
          name?: string | null
          price_cents: number
          ticker: string
          updated_at?: string
          volume?: number | null
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["investment_type"]
          change_cents?: number | null
          change_percent?: number | null
          created_at?: string
          currency?: string
          data_source?: string | null
          id?: string
          market?: string | null
          name?: string | null
          price_cents?: number
          ticker?: string
          updated_at?: string
          volume?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          dedupe_key: string | null
          event_key: string | null
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          target_id: string | null
          target_type: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          event_key?: string | null
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          target_id?: string | null
          target_type?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          event_key?: string | null
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          target_id?: string | null
          target_type?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          full_name: string | null
          id: string
          last_alert_digest_sent_at: string | null
          locale: string
          onboarding_completed: boolean
          timezone: string
          updated_at: string
          user_id: string
          weekly_alert_digest_enabled: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          full_name?: string | null
          id?: string
          last_alert_digest_sent_at?: string | null
          locale?: string
          onboarding_completed?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
          weekly_alert_digest_enabled?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          full_name?: string | null
          id?: string
          last_alert_digest_sent_at?: string | null
          locale?: string
          onboarding_completed?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
          weekly_alert_digest_enabled?: boolean
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          device_label: string | null
          endpoint: string
          id: string
          is_active: boolean
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          device_label?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          device_label?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recurring_commitments: {
        Row: {
          account_id: string
          advance_notice_days: number | null
          allows_early_repayment: boolean
          amount_cents: number
          cancelled_at: string | null
          category_id: string | null
          commitment_type: Database["public"]["Enums"]["commitment_type_enum"]
          created_at: string
          currency: string
          deleted_at: string | null
          description: string | null
          early_repayment_allowed: boolean
          end_date: string | null
          frequency: Database["public"]["Enums"]["frequency_type"]
          id: string
          interest_rate: number | null
          is_active: boolean
          is_automated: boolean
          is_income: boolean
          is_variable_rate: boolean | null
          maturity_year: number | null
          name: string
          next_due_date: string
          service_name: string | null
          start_date: string
          tolerance_days: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          advance_notice_days?: number | null
          allows_early_repayment?: boolean
          amount_cents: number
          cancelled_at?: string | null
          category_id?: string | null
          commitment_type?: Database["public"]["Enums"]["commitment_type_enum"]
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          early_repayment_allowed?: boolean
          end_date?: string | null
          frequency: Database["public"]["Enums"]["frequency_type"]
          id?: string
          interest_rate?: number | null
          is_active?: boolean
          is_automated?: boolean
          is_income?: boolean
          is_variable_rate?: boolean | null
          maturity_year?: number | null
          name: string
          next_due_date: string
          service_name?: string | null
          start_date: string
          tolerance_days?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          advance_notice_days?: number | null
          allows_early_repayment?: boolean
          amount_cents?: number
          cancelled_at?: string | null
          category_id?: string | null
          commitment_type?: Database["public"]["Enums"]["commitment_type_enum"]
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          early_repayment_allowed?: boolean
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["frequency_type"]
          id?: string
          interest_rate?: number | null
          is_active?: boolean
          is_automated?: boolean
          is_income?: boolean
          is_variable_rate?: boolean | null
          maturity_year?: number | null
          name?: string
          next_due_date?: string
          service_name?: string | null
          start_date?: string
          tolerance_days?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_commitments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_commitments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_import_batches: {
        Row: {
          account_id: string
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          deleted_at: string | null
          duplicate_count: number
          expected_income_gap_count: number
          file_checksum: string
          file_name: string
          id: string
          imported_count: number
          metadata: Json
          rolled_back_at: string | null
          row_count: number
          source_bank: string | null
          source_format: Database["public"]["Enums"]["import_file_format"]
          source_range_end: string | null
          source_range_start: string | null
          status: Database["public"]["Enums"]["import_batch_status"]
          unexpected_charge_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          duplicate_count?: number
          expected_income_gap_count?: number
          file_checksum: string
          file_name: string
          id?: string
          imported_count?: number
          metadata?: Json
          rolled_back_at?: string | null
          row_count?: number
          source_bank?: string | null
          source_format: Database["public"]["Enums"]["import_file_format"]
          source_range_end?: string | null
          source_range_start?: string | null
          status?: Database["public"]["Enums"]["import_batch_status"]
          unexpected_charge_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          duplicate_count?: number
          expected_income_gap_count?: number
          file_checksum?: string
          file_name?: string
          id?: string
          imported_count?: number
          metadata?: Json
          rolled_back_at?: string | null
          row_count?: number
          source_bank?: string | null
          source_format?: Database["public"]["Enums"]["import_file_format"]
          source_range_end?: string | null
          source_range_start?: string | null
          status?: Database["public"]["Enums"]["import_batch_status"]
          unexpected_charge_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_import_batches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount_cents: number
          category_id: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          description: string
          id: string
          import_batch_id: string | null
          import_dedupe_key: string | null
          import_source: string | null
          is_income: boolean
          is_recurring_instance: boolean
          notes: string | null
          receipt_url: string | null
          recurring_id: string | null
          search_vector: unknown
          tags: string[] | null
          transaction_date: string
          transfer_id: string | null
          updated_at: string
          user_id: string
          value_date: string | null
        }
        Insert: {
          account_id: string
          amount_cents: number
          category_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description: string
          id?: string
          import_batch_id?: string | null
          import_dedupe_key?: string | null
          import_source?: string | null
          is_income?: boolean
          is_recurring_instance?: boolean
          notes?: string | null
          receipt_url?: string | null
          recurring_id?: string | null
          search_vector?: unknown
          tags?: string[] | null
          transaction_date?: string
          transfer_id?: string | null
          updated_at?: string
          user_id: string
          value_date?: string | null
        }
        Update: {
          account_id?: string
          amount_cents?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string
          id?: string
          import_batch_id?: string | null
          import_dedupe_key?: string | null
          import_source?: string | null
          is_income?: boolean
          is_recurring_instance?: boolean
          notes?: string | null
          receipt_url?: string | null
          recurring_id?: string | null
          search_vector?: unknown
          tags?: string[] | null
          transaction_date?: string
          transfer_id?: string | null
          updated_at?: string
          user_id?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "transaction_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      monthly_account_balance: {
        Row: {
          account_id: string | null
          month: string | null
          net_amount_cents: number | null
          transaction_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_category_spending: {
        Row: {
          avg_cents: number | null
          category_id: string | null
          month: string | null
          total_cents: number | null
          transaction_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      convert_currency_amount: {
        Args: {
          p_amount_cents: number
          p_from_currency: string
          p_to_currency: string
        }
        Returns: number
      }
      create_default_custom_alerts: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      create_user_notification: {
        Args: {
          p_event_key?: string
          p_message: string
          p_severity: Database["public"]["Enums"]["alert_severity"]
          p_target_id?: string
          p_target_type?: string
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
        }
        Returns: string
      }
      get_category_spending: {
        Args: { p_month: string }
        Returns: {
          category_id: string
          total_cents: number
        }[]
      }
      get_monthly_balance: {
        Args: { p_month: string }
        Returns: {
          net_amount_cents: number
        }[]
      }
      get_net_worth: {
        Args: { p_user_id: string }
        Returns: {
          cash_cents: number
          currency: string
          investments_cents: number
          total_cents: number
        }[]
      }
      get_top_category_spending: {
        Args: { p_limit?: number; p_month: string }
        Returns: {
          category_color: string
          category_id: string
          category_name: string
          total_cents: number
          transaction_count: number
        }[]
      }
      project_cash_flow: {
        Args: { p_months?: number; p_user_id: string }
        Returns: {
          month_date: string
          net_cents: number
          projected_expense_cents: number
          projected_income_cents: number
        }[]
      }
      recalculate_avg_purchase_price: {
        Args: { p_investment_id: string }
        Returns: undefined
      }
      refresh_dashboard_materialized_views: {
        Args: { p_user_id?: string }
        Returns: undefined
      }
      refresh_dashboard_views: { Args: never; Returns: undefined }
      refresh_investment_snapshots: {
        Args: { p_snapshot_date?: string }
        Returns: undefined
      }
      rollback_import_batch: {
        Args: { p_batch_id: string }
        Returns: {
          rolled_back_count: number
        }[]
      }
      sync_investment_prices: { Args: never; Returns: undefined }
    }
    Enums: {
      alert_recurrence_type:
        | "monthly"
        | "quarterly"
        | "semiannual"
        | "annual"
        | "biennial"
        | "once"
      alert_severity: "info" | "warning" | "critical"
      budget_period: "monthly" | "annual"
      commitment_type_enum:
        | "mortgage"
        | "rent_income"
        | "rent_expense"
        | "subscription"
        | "tax"
        | "insurance"
        | "utility"
        | "other"
      frequency_type:
        | "daily"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "bimonthly"
        | "quarterly"
        | "semiannual"
        | "annual"
      import_batch_status: "processing" | "confirmed" | "rolled_back" | "failed"
      import_file_format: "xlsx" | "xls" | "csv" | "ofx" | "qif"
      investment_type:
        | "stock"
        | "etf"
        | "fund"
        | "crypto"
        | "deposit"
        | "bond"
        | "reit"
        | "other"
      notification_type:
        | "budget_exceeded"
        | "commitment_due"
        | "investment_alert"
        | "custom_alert_due"
        | "subscription_unexpected_charge"
        | "expected_income_unpaid"
        | "anomaly_detected"
        | "system"
      operation_type:
        | "buy"
        | "sell"
        | "dividend"
        | "split"
        | "fee"
        | "transfer_in"
        | "transfer_out"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      alert_recurrence_type: [
        "monthly",
        "quarterly",
        "semiannual",
        "annual",
        "biennial",
        "once",
      ],
      alert_severity: ["info", "warning", "critical"],
      budget_period: ["monthly", "annual"],
      commitment_type_enum: [
        "mortgage",
        "rent_income",
        "rent_expense",
        "subscription",
        "tax",
        "insurance",
        "utility",
        "other",
      ],
      frequency_type: [
        "daily",
        "weekly",
        "biweekly",
        "monthly",
        "bimonthly",
        "quarterly",
        "semiannual",
        "annual",
      ],
      import_batch_status: ["processing", "confirmed", "rolled_back", "failed"],
      import_file_format: ["xlsx", "xls", "csv", "ofx", "qif"],
      investment_type: [
        "stock",
        "etf",
        "fund",
        "crypto",
        "deposit",
        "bond",
        "reit",
        "other",
      ],
      notification_type: [
        "budget_exceeded",
        "commitment_due",
        "investment_alert",
        "custom_alert_due",
        "subscription_unexpected_charge",
        "expected_income_unpaid",
        "anomaly_detected",
        "system",
      ],
      operation_type: [
        "buy",
        "sell",
        "dividend",
        "split",
        "fee",
        "transfer_in",
        "transfer_out",
      ],
    },
  },
} as const
