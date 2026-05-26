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
  public: {
    Tables: {
      budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          name: string
          period: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          period: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          period?: string
          updated_at?: string | null
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
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string | null
          deleted_at: string | null
          icon: string
          id: string
          is_system: boolean | null
          name: string
          type: string
          user_id: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          deleted_at?: string | null
          icon: string
          id?: string
          is_system?: boolean | null
          name: string
          type: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          deleted_at?: string | null
          icon?: string
          id?: string
          is_system?: boolean | null
          name?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_sync_logs: {
        Row: {
          completed_at: string | null
          emails_scanned: number | null
          error_message: string | null
          id: string
          started_at: string | null
          status: string
          transactions_created: number | null
          transactions_found: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          emails_scanned?: number | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status: string
          transactions_created?: number | null
          transactions_found?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          emails_scanned?: number | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string
          transactions_created?: number | null
          transactions_found?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_sync_logs_user_id_fkey"
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
          created_at: string | null
          currency: string | null
          email: string
          full_name: string | null
          gmail_last_synced_at: string | null
          gmail_sync_enabled: boolean | null
          gmail_sync_token: string | null
          google_access_token: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          language: string | null
          onboarding_completed: boolean | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          currency?: string | null
          email: string
          full_name?: string | null
          gmail_last_synced_at?: string | null
          gmail_sync_enabled?: boolean | null
          gmail_sync_token?: string | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id: string
          language?: string | null
          onboarding_completed?: boolean | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string
          full_name?: string | null
          gmail_last_synced_at?: string | null
          gmail_sync_enabled?: boolean | null
          gmail_sync_token?: string | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          language?: string | null
          onboarding_completed?: boolean | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          ai_category_confidence: number | null
          ai_category_raw: string | null
          amount: number
          category_id: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_recurring: boolean | null
          is_verified: boolean | null
          merchant_name: string | null
          payment_method: string | null
          raw_email_id: string | null
          raw_email_snippet: string | null
          recurring_group_id: string | null
          reference_number: string | null
          source: string
          to_wallet_id: string | null
          transacted_at: string
          type: string
          updated_at: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          ai_category_confidence?: number | null
          ai_category_raw?: string | null
          amount: number
          category_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          is_verified?: boolean | null
          merchant_name?: string | null
          payment_method?: string | null
          raw_email_id?: string | null
          raw_email_snippet?: string | null
          recurring_group_id?: string | null
          reference_number?: string | null
          source?: string
          to_wallet_id?: string | null
          transacted_at: string
          type: string
          updated_at?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          ai_category_confidence?: number | null
          ai_category_raw?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          is_verified?: boolean | null
          merchant_name?: string | null
          payment_method?: string | null
          raw_email_id?: string | null
          raw_email_snippet?: string | null
          recurring_group_id?: string | null
          reference_number?: string | null
          source?: string
          to_wallet_id?: string | null
          transacted_at?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_wallet_id_fkey"
            columns: ["to_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          color: string | null
          created_at: string | null
          deleted_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          provider: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          provider?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          provider?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
