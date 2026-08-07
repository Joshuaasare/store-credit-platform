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
    PostgrestVersion: "14.15"
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
      branches: {
        Row: {
          address: string | null
          city: string
          country_code: string
          created_at: string
          deleted_at: string | null
          id: number
          is_active: boolean
          merchant_id: number
          name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city: string
          country_code: string
          created_at?: string
          deleted_at?: string | null
          id?: number
          is_active?: boolean
          merchant_id: number
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          country_code?: string
          created_at?: string
          deleted_at?: string | null
          id?: number
          is_active?: boolean
          merchant_id?: number
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_credit: {
        Row: {
          branch_id: number
          created_at: string
          credit_amount: number
          customer_id: number
          deleted_at: string | null
          expires_at: number | null
          id: number
          revoked_at: string | null
          revoked_by_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id: number
          created_at?: string
          credit_amount: number
          customer_id: number
          deleted_at?: string | null
          expires_at?: number | null
          id?: number
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: number
          created_at?: string
          credit_amount?: number
          customer_id?: number
          deleted_at?: string | null
          expires_at?: number | null
          id?: number
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_credit_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_revoked_by_user_id_fkey"
            columns: ["revoked_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_credit_redemptions: {
        Row: {
          amount_redeemed: number
          approved_at: string | null
          approved_by_user_id: string | null
          branch_id: number
          created_at: string
          credit_id: number
          customer_id: number
          deleted_at: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          amount_redeemed: number
          approved_at?: string | null
          approved_by_user_id?: string | null
          branch_id: number
          created_at?: string
          credit_id: number
          customer_id: number
          deleted_at?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          amount_redeemed?: number
          approved_at?: string | null
          approved_by_user_id?: string | null
          branch_id?: number
          created_at?: string
          credit_id?: number
          customer_id?: number
          deleted_at?: string | null
          id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_credit_redemptions_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_redemptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_redemptions_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "customer_credit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_purchases: {
        Row: {
          amount: number
          branch_id: number
          created_at: string
          customer_id: number
          deleted_at: string | null
          id: number
          recorded_by_user_id: string | null
          transaction_date: number
          updated_at: string | null
        }
        Insert: {
          amount: number
          branch_id: number
          created_at?: string
          customer_id: number
          deleted_at?: string | null
          id?: number
          recorded_by_user_id?: string | null
          transaction_date: number
          updated_at?: string | null
        }
        Update: {
          amount?: number
          branch_id?: number
          created_at?: string
          customer_id?: number
          deleted_at?: string | null
          id?: number
          recorded_by_user_id?: string | null
          transaction_date?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_recorded_by_user_id_fkey"
            columns: ["recorded_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: number
          phone: string | null
          unique_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: number
          phone?: string | null
          unique_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: number
          phone?: string | null
          unique_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_credit_config: {
        Row: {
          branch_id: number
          config_group_id: string
          created_at: string
          credit_type: Database["public"]["Enums"]["credit_type"] | null
          deleted_at: string | null
          end_date: number | null
          fixed_credit_value: number | null
          id: number
          is_active: boolean
          maximum_allowed_credit: number | null
          percentage_credit_value: number | null
          start_date: number | null
          terms: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id: number
          config_group_id?: string
          created_at?: string
          credit_type?: Database["public"]["Enums"]["credit_type"] | null
          deleted_at?: string | null
          end_date?: number | null
          fixed_credit_value?: number | null
          id?: number
          is_active?: boolean
          maximum_allowed_credit?: number | null
          percentage_credit_value?: number | null
          start_date?: number | null
          terms?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: number
          config_group_id?: string
          created_at?: string
          credit_type?: Database["public"]["Enums"]["credit_type"] | null
          deleted_at?: string | null
          end_date?: number | null
          fixed_credit_value?: number | null
          id?: number
          is_active?: boolean
          maximum_allowed_credit?: number | null
          percentage_credit_value?: number | null
          start_date?: number | null
          terms?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_credit_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          country_code: string
          cover_photo_url: string | null
          created_at: string
          credit_pool_limit: number | null
          credit_pool_used: number
          credit_stacking_policy: Database["public"]["Enums"]["credit_stacking_policy_type"]
          deleted_at: string | null
          id: number
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          country_code: string
          cover_photo_url?: string | null
          created_at?: string
          credit_pool_limit?: number | null
          credit_pool_used?: number
          credit_stacking_policy?: Database["public"]["Enums"]["credit_stacking_policy_type"]
          deleted_at?: string | null
          id?: number
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone: string
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          cover_photo_url?: string | null
          created_at?: string
          credit_pool_limit?: number | null
          credit_pool_used?: number
          credit_stacking_policy?: Database["public"]["Enums"]["credit_stacking_policy_type"]
          deleted_at?: string | null
          id?: number
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limit_log: {
        Row: {
          action: string
          attempted_at: string | null
          id: number
          ip_address: unknown
          phone: string
        }
        Insert: {
          action: string
          attempted_at?: string | null
          id?: number
          ip_address: unknown
          phone: string
        }
        Update: {
          action?: string
          attempted_at?: string | null
          id?: number
          ip_address?: unknown
          phone?: string
        }
        Relationships: []
      }
      refresh_tokens: {
        Row: {
          device_fingerprint: string
          expires_at: string
          family_id: string
          ip_address: unknown
          issued_at: string | null
          jti: string
          parent_jti: string | null
          replaced_at: string | null
          replaced_by_jti: string | null
          revoked_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          device_fingerprint: string
          expires_at: string
          family_id: string
          ip_address?: unknown
          issued_at?: string | null
          jti: string
          parent_jti?: string | null
          replaced_at?: string | null
          replaced_by_jti?: string | null
          revoked_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          device_fingerprint?: string
          expires_at?: string
          family_id?: string
          ip_address?: unknown
          issued_at?: string | null
          jti?: string
          parent_jti?: string | null
          replaced_at?: string | null
          replaced_by_jti?: string | null
          revoked_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      running_credit_config: {
        Row: {
          branch_id: number
          config_group_id: string
          created_at: string
          credit_type: Database["public"]["Enums"]["credit_type"] | null
          credit_validity: number | null
          cumulative_scope: Database["public"]["Enums"]["cumulative_scope_type"]
          deleted_at: string | null
          eligible_window: number | null
          fixed_credit_value: number | null
          id: number
          is_active: boolean
          maximum_allowed_credit: number | null
          percentage_credit_value: number | null
          terms: string | null
          threshold_amount: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id: number
          config_group_id?: string
          created_at?: string
          credit_type?: Database["public"]["Enums"]["credit_type"] | null
          credit_validity?: number | null
          cumulative_scope?: Database["public"]["Enums"]["cumulative_scope_type"]
          deleted_at?: string | null
          eligible_window?: number | null
          fixed_credit_value?: number | null
          id?: number
          is_active?: boolean
          maximum_allowed_credit?: number | null
          percentage_credit_value?: number | null
          terms?: string | null
          threshold_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: number
          config_group_id?: string
          created_at?: string
          credit_type?: Database["public"]["Enums"]["credit_type"] | null
          credit_validity?: number | null
          cumulative_scope?: Database["public"]["Enums"]["cumulative_scope_type"]
          deleted_at?: string | null
          eligible_window?: number | null
          fixed_credit_value?: number | null
          id?: number
          is_active?: boolean
          maximum_allowed_credit?: number | null
          percentage_credit_value?: number | null
          terms?: string | null
          threshold_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_credits_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          device_fingerprint: string
          device_name: string | null
          expires_at: string
          id: string
          ip_address: unknown
          last_used_at: string | null
          refresh_token_jti: string
          revoked_at: string | null
          revoked_reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint: string
          device_name?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          last_used_at?: string | null
          refresh_token_jti: string
          revoked_at?: string | null
          revoked_reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string
          device_name?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_used_at?: string | null
          refresh_token_jti?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          address: string | null
          branch_id: number
          created_at: string
          deleted_at: string | null
          id: number
          notes: string | null
          role: Database["public"]["Enums"]["role"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          branch_id: number
          created_at?: string
          deleted_at?: string | null
          id?: number
          notes?: string | null
          role?: Database["public"]["Enums"]["role"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          branch_id?: number
          created_at?: string
          deleted_at?: string | null
          id?: number
          notes?: string | null
          role?: Database["public"]["Enums"]["role"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          access_granted: boolean
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          last_login_at: string | null
          other_names: string | null
          otp: string | null
          otp_attempts: number | null
          otp_expires_at: string | null
          phone: string
          surname: string
          updated_at: string | null
        }
        Insert: {
          access_granted?: boolean
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id: string
          last_login_at?: string | null
          other_names?: string | null
          otp?: string | null
          otp_attempts?: number | null
          otp_expires_at?: string | null
          phone: string
          surname: string
          updated_at?: string | null
        }
        Update: {
          access_granted?: boolean
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          other_names?: string | null
          otp?: string | null
          otp_attempts?: number | null
          otp_expires_at?: string | null
          phone?: string
          surname?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_customer_leaderboard: {
        Args: {
          p_branch_id?: number
          p_end_epoch?: number
          p_limit?: number
          p_merchant_id: number
          p_offset?: number
          p_sort?: string
          p_start_epoch?: number
        }
        Returns: {
          branch_id: number
          customer_id: number
          customer_name: string
          phone: string
          total_credits_issued: number
          total_credits_redeemed: number
          total_purchases: number
          transaction_count: number
          user_id: string
        }[]
      }
      get_customer_leaderboard_count: {
        Args: {
          p_branch_id?: number
          p_end_epoch?: number
          p_merchant_id: number
          p_start_epoch?: number
        }
        Returns: number
      }
      get_customers: {
        Args: {
          p_branch_id?: number
          p_limit?: number
          p_merchant_id: number
          p_offset?: number
          p_search?: string
        }
        Returns: {
          available_credits: number
          customer_id: number
          customer_name: string
          last_activity_epoch: number
          live_credit_count: number
          phone: string
          total: number
          total_purchases: number
          user_id: string
        }[]
      }
      get_distinct_customer_count: {
        Args: { p_branch_id?: number; p_merchant_id: number }
        Returns: number
      }
    }
    Enums: {
      credit_stacking_policy_type: "stack" | "best_only"
      credit_type: "fixed" | "percentage"
      cumulative_scope_type: "per_branch" | "merchant_wide"
      role: "manager" | "cashier"
      transaction_type: "purchase" | "credit_issue" | "credit_redeem"
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
      credit_stacking_policy_type: ["stack", "best_only"],
      credit_type: ["fixed", "percentage"],
      cumulative_scope_type: ["per_branch", "merchant_wide"],
      role: ["manager", "cashier"],
      transaction_type: ["purchase", "credit_issue", "credit_redeem"],
    },
  },
} as const
