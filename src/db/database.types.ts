export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      api_usage: {
        Row: {
          correlation_id: string | null
          cost_usd: number | null
          endpoint: string
          id: number
          metadata: Json | null
          model: string | null
          operation_type: string | null
          timestamp: string
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          correlation_id?: string | null
          cost_usd?: number | null
          endpoint: string
          id?: number
          metadata?: Json | null
          model?: string | null
          operation_type?: string | null
          timestamp?: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          correlation_id?: string | null
          cost_usd?: number | null
          endpoint?: string
          id?: number
          metadata?: Json | null
          model?: string | null
          operation_type?: string | null
          timestamp?: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_verification_resends: {
        Row: {
          email: string
          id: number
          resent_at: string
        }
        Insert: {
          email: string
          id?: number
          resent_at?: string
        }
        Update: {
          email?: string
          id?: number
          resent_at?: string
        }
        Relationships: []
      }
      error_log: {
        Row: {
          attempt_number: number | null
          created_at: string
          error_message: string
          error_stack: string | null
          id: string
          offer_id: number | null
        }
        Insert: {
          attempt_number?: number | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          id?: string
          offer_id?: number | null
        }
        Update: {
          attempt_number?: number | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          id?: string
          offer_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "error_log_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          error_code: string | null
          id: number
          ip_address: unknown
          success: boolean
          user_id: string | null
        }
        Insert: {
          attempted_at?: string
          email: string
          error_code?: string | null
          id?: number
          ip_address: unknown
          success?: boolean
          user_id?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string
          error_code?: string | null
          id?: number
          ip_address?: unknown
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          city: string
          created_at: string
          frequency: Database["public"]["Enums"]["frequency"]
          id: number
          image_url: string | null
          last_checked: string | null
          selector: string
          status: Database["public"]["Enums"]["offer_status"]
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          city: string
          created_at?: string
          frequency?: Database["public"]["Enums"]["frequency"]
          id?: number
          image_url?: string | null
          last_checked?: string | null
          selector: string
          status?: Database["public"]["Enums"]["offer_status"]
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          city?: string
          created_at?: string
          frequency?: Database["public"]["Enums"]["frequency"]
          id?: number
          image_url?: string | null
          last_checked?: string | null
          selector?: string
          status?: Database["public"]["Enums"]["offer_status"]
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      password_change_log: {
        Row: {
          changed_at: string
          id: number
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: number
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: number
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          checked_at: string
          currency: Database["public"]["Enums"]["currency"]
          id: number
          offer_id: number
          price: number
        }
        Insert: {
          checked_at?: string
          currency: Database["public"]["Enums"]["currency"]
          id?: number
          offer_id: number
          price: number
        }
        Update: {
          checked_at?: string
          currency?: Database["public"]["Enums"]["currency"]
          id?: number
          offer_id?: number
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_history_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_attempts: {
        Row: {
          attempted_at: string
          email: string | null
          error_code: string | null
          id: number
          ip_address: unknown
          success: boolean
          user_id: string | null
        }
        Insert: {
          attempted_at?: string
          email?: string | null
          error_code?: string | null
          id?: number
          ip_address: unknown
          success?: boolean
          user_id?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string | null
          error_code?: string | null
          id?: number
          ip_address?: unknown
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          context: Json | null
          created_at: string
          event_type: string | null
          id: number
          level: string | null
          message: string
          metadata: Json | null
          offer_id: number | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          event_type?: string | null
          id?: number
          level?: string | null
          message: string
          metadata?: Json | null
          offer_id?: number | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          event_type?: string | null
          id?: number
          level?: string | null
          message?: string
          metadata?: Json | null
          offer_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_offer: {
        Row: {
          created_at: string
          deleted_at: string | null
          offer_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          offer_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          offer_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_offer_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          default_frequency: Database["public"]["Enums"]["frequency"]
          updated_at: string
          user_id: string
        }
        Insert: {
          default_frequency?: Database["public"]["Enums"]["frequency"]
          updated_at?: string
          user_id: string
        }
        Update: {
          default_frequency?: Database["public"]["Enums"]["frequency"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_delete_account: { Args: never; Returns: Json }
      check_email_resend_cooldown: {
        Args: { email_address: string }
        Returns: boolean
      }
      check_login_rate_limit: { Args: { ip: unknown }; Returns: boolean }
      check_offer_prices: { Args: never; Returns: undefined }
      check_registration_rate_limit: { Args: { ip: unknown }; Returns: boolean }
      cleanup_auth_logs: { Args: never; Returns: undefined }
      delete_user_account: { Args: never; Returns: undefined }
      log_login_attempt: {
        Args: {
          p_email: string
          p_error_code?: string
          p_ip_address: unknown
          p_success?: boolean
          p_user_id?: string
        }
        Returns: undefined
      }
      log_registration_attempt: {
        Args: {
          p_email: string
          p_error_code?: string
          p_ip_address: unknown
          p_success?: boolean
          p_user_id?: string
        }
        Returns: undefined
      }
      soft_delete_user_offer: {
        Args: {
          p_offer_id: number
        }
        Returns: boolean
      }
    }
    Enums: {
      currency: "PLN" | "EUR" | "USD" | "GBP"
      frequency: "6h" | "12h" | "24h" | "48h"
      offer_status: "active" | "removed" | "error"
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
      currency: ["PLN", "EUR", "USD", "GBP"],
      frequency: ["6h", "12h", "24h", "48h"],
      offer_status: ["active", "removed", "error"],
    },
  },
} as const

