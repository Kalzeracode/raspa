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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      afiliados: {
        Row: {
          codigo: string
          created_at: string
          ganhos: number | null
          id: string
          nome: string
          total_registros: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          codigo: string
          created_at?: string
          ganhos?: number | null
          id?: string
          nome: string
          total_registros?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          codigo?: string
          created_at?: string
          ganhos?: number | null
          id?: string
          nome?: string
          total_registros?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      balance_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_simulated: boolean
          metadata: Json | null
          new_balance: number
          previous_balance: number
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_simulated?: boolean
          metadata?: Json | null
          new_balance: number
          previous_balance: number
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_simulated?: boolean
          metadata?: Json | null
          new_balance?: number
          previous_balance?: number
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      bonus_claims: {
        Row: {
          amount: number
          claimed_at: string | null
          id: string
          level_achieved: string
          milestone: number
          pix_key: string
          user_id: string
        }
        Insert: {
          amount?: number
          claimed_at?: string | null
          id?: string
          level_achieved: string
          milestone: number
          pix_key: string
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string | null
          id?: string
          level_achieved?: string
          milestone?: number
          pix_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      credit_purchases: {
        Row: {
          amount: number
          created_at: string
          external_ref: string | null
          id: string
          is_simulated: boolean
          method: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          external_ref?: string | null
          id?: string
          is_simulated?: boolean
          method?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          external_ref?: string | null
          id?: string
          is_simulated?: boolean
          method?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      influencers: {
        Row: {
          code: string
          commission_rate: number
          created_at: string
          id: string
          status: string
          total_earnings: number | null
          total_referrals: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          commission_rate?: number
          created_at?: string
          id?: string
          status?: string
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          commission_rate?: number
          created_at?: string
          id?: string
          status?: string
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jackpot_entries_9: {
        Row: {
          amount: number
          created_at: string | null
          id: number
          inventory_id: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: number
          inventory_id: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: number
          inventory_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_entries_9_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "scratch9_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      jogadas: {
        Row: {
          created_at: string
          id: string
          is_simulated: boolean
          premio_ganho: number | null
          raspadinha_id: string
          resultado: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_simulated?: boolean
          premio_ganho?: number | null
          raspadinha_id: string
          resultado: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_simulated?: boolean
          premio_ganho?: number | null
          raspadinha_id?: string
          resultado?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jogadas_raspadinha_id_fkey"
            columns: ["raspadinha_id"]
            isOneToOne: false
            referencedRelation: "raspadinhas"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          converted: boolean | null
          created_at: string
          id: string
          influencer_id: string
          ip_address: unknown | null
          user_agent: string | null
        }
        Insert: {
          converted?: boolean | null
          created_at?: string
          id?: string
          influencer_id: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Update: {
          converted?: boolean | null
          created_at?: string
          id?: string
          influencer_id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      prize_funds: {
        Row: {
          balance: number
          buffer_percentage: number
          claimable_amount: number
          created_at: string
          fund_type: string
          id: string
          last_updated: string
        }
        Insert: {
          balance?: number
          buffer_percentage?: number
          claimable_amount?: number
          created_at?: string
          fund_type: string
          id?: string
          last_updated?: string
        }
        Update: {
          balance?: number
          buffer_percentage?: number
          claimable_amount?: number
          created_at?: string
          fund_type?: string
          id?: string
          last_updated?: string
        }
        Relationships: []
      }
      prize_tiers_9: {
        Row: {
          active: boolean
          amount: number
          created_at: string
          fund: string
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          amount: number
          created_at?: string
          fund: string
          updated_at?: string
          weight: number
        }
        Update: {
          active?: boolean
          amount?: number
          created_at?: string
          fund?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          afiliado_id: string | null
          created_at: string
          email: string
          id: string
          referral_code: string | null
          role: Database["public"]["Enums"]["app_role"]
          saldo: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          afiliado_id?: string | null
          created_at?: string
          email: string
          id?: string
          referral_code?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          saldo?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          afiliado_id?: string | null
          created_at?: string
          email?: string
          id?: string
          referral_code?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          saldo?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          banner_url: string
          bonus_amount: number | null
          created_at: string
          description: string | null
          discount_percentage: number | null
          ends_at: string
          id: string
          is_active: boolean
          starts_at: string
          target_card_ids: string[] | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          banner_url: string
          bonus_amount?: number | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          ends_at: string
          id?: string
          is_active?: boolean
          starts_at?: string
          target_card_ids?: string[] | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          banner_url?: string
          bonus_amount?: number | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          ends_at?: string
          id?: string
          is_active?: boolean
          starts_at?: string
          target_card_ids?: string[] | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      raspadinhas: {
        Row: {
          ativo: boolean | null
          cash_payout: number
          chances: number
          created_at: string
          id: string
          imagem_url: string | null
          nome: string
          premio: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cash_payout?: number
          chances: number
          created_at?: string
          id?: string
          imagem_url?: string | null
          nome: string
          premio: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cash_payout?: number
          chances?: number
          created_at?: string
          id?: string
          imagem_url?: string | null
          nome?: string
          premio?: number
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          id: string
          operation_count: number | null
          operation_type: string
          user_id: string
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          operation_count?: number | null
          operation_type: string
          user_id: string
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          operation_count?: number | null
          operation_type?: string
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission_earned: number | null
          commission_notes: string | null
          commission_paid: boolean | null
          commission_paid_at: string | null
          commission_value: number | null
          created_at: string
          first_deposit_at: string | null
          first_deposit_id: string | null
          first_deposit_value: number | null
          id: string
          influencer_id: string
          referred_user_id: string
        }
        Insert: {
          commission_earned?: number | null
          commission_notes?: string | null
          commission_paid?: boolean | null
          commission_paid_at?: string | null
          commission_value?: number | null
          created_at?: string
          first_deposit_at?: string | null
          first_deposit_id?: string | null
          first_deposit_value?: number | null
          id?: string
          influencer_id: string
          referred_user_id: string
        }
        Update: {
          commission_earned?: number | null
          commission_notes?: string | null
          commission_paid?: boolean | null
          commission_paid_at?: string | null
          commission_value?: number | null
          created_at?: string
          first_deposit_at?: string | null
          first_deposit_id?: string | null
          first_deposit_value?: number | null
          id?: string
          influencer_id?: string
          referred_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_first_deposit_id_fkey"
            columns: ["first_deposit_id"]
            isOneToOne: false
            referencedRelation: "credit_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      scratch_tickets: {
        Row: {
          created_at: string
          id: string
          lucky_numbers: number[]
          prize_amount: number
          revealed_at: string | null
          status: string
          ticket_cost: number
          user_id: string
          user_numbers: number[]
          winning_cells: number[]
        }
        Insert: {
          created_at?: string
          id?: string
          lucky_numbers: number[]
          prize_amount?: number
          revealed_at?: string | null
          status?: string
          ticket_cost?: number
          user_id: string
          user_numbers: number[]
          winning_cells?: number[]
        }
        Update: {
          created_at?: string
          id?: string
          lucky_numbers?: number[]
          prize_amount?: number
          revealed_at?: string | null
          status?: string
          ticket_cost?: number
          user_id?: string
          user_numbers?: number[]
          winning_cells?: number[]
        }
        Relationships: []
      }
      scratch9_inventory: {
        Row: {
          claimed: boolean
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          fund: string
          id: number
          jackpot_amount: number | null
          prize_amount: number
        }
        Insert: {
          claimed?: boolean
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          fund?: string
          id?: number
          jackpot_amount?: number | null
          prize_amount?: number
        }
        Update: {
          claimed?: boolean
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          fund?: string
          id?: number
          jackpot_amount?: number | null
          prize_amount?: number
        }
        Relationships: []
      }
      site_assets: {
        Row: {
          asset_name: string
          created_at: string
          file_name: string
          file_url: string
          id: string
          updated_at: string
        }
        Insert: {
          asset_name: string
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          updated_at?: string
        }
        Update: {
          asset_name?: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_levels: {
        Row: {
          bonuses_claimed: number | null
          created_at: string | null
          id: string
          level: string
          qualified_referrals: number | null
          total_bonus_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bonuses_claimed?: number | null
          created_at?: string | null
          id?: string
          level?: string
          qualified_referrals?: number | null
          total_bonus_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bonuses_claimed?: number | null
          created_at?: string | null
          id?: string
          level?: string
          qualified_referrals?: number | null
          total_bonus_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_levels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_referrals: {
        Row: {
          created_at: string | null
          has_qualified: boolean | null
          id: string
          qualified_at: string | null
          referred_user_id: string
          referrer_user_id: string
        }
        Insert: {
          created_at?: string | null
          has_qualified?: boolean | null
          id?: string
          qualified_at?: string | null
          referred_user_id: string
          referrer_user_id: string
        }
        Update: {
          created_at?: string | null
          has_qualified?: boolean | null
          id?: string
          qualified_at?: string | null
          referred_user_id?: string
          referrer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          daily_limit_check: boolean | null
          id: string
          is_simulated: boolean
          payment_details: Json | null
          payment_method: string
          processed_at: string | null
          requested_at: string
          risk_score: number | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          daily_limit_check?: boolean | null
          id?: string
          is_simulated?: boolean
          payment_details?: Json | null
          payment_method?: string
          processed_at?: string | null
          requested_at?: string
          risk_score?: number | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          daily_limit_check?: boolean | null
          id?: string
          is_simulated?: boolean
          payment_details?: Json | null
          payment_method?: string
          processed_at?: string | null
          requested_at?: string
          risk_score?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      prize_probs_9: {
        Row: {
          amount: number | null
          fund: string | null
          prob_normalized: number | null
          weight: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      audit_admin_profile_access: {
        Args: { accessed_user_id: string }
        Returns: undefined
      }
      check_financial_rate_limit: {
        Args: { operation_type: string; user_uuid: string }
        Returns: boolean
      }
      check_suspicious_activity: {
        Args: Record<PropertyKey, never>
        Returns: {
          activity_count: number
          risk_level: string
          user_id: string
        }[]
      }
      claim_referral_bonus: {
        Args: { pix_key_param: string }
        Returns: Json
      }
      create_influencer_with_user: {
        Args: {
          commission_rate_param?: number
          email_param: string
          password_param: string
        }
        Returns: Json
      }
      create_withdrawal_request_secure: {
        Args: { amount_param: number; pix_key_param: string }
        Returns: string
      }
      emergency_security_disable: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_lucky_ticket: {
        Args: { ticket_cost_param?: number }
        Returns: Json
      }
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_admin_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          daily_data: Json
          recent_activity: Json
          total_bets_count: number
          total_deposits_amount: number
          total_users: number
        }[]
      }
      get_admin_stats_v2: {
        Args: Record<PropertyKey, never>
        Returns: {
          daily_data: Json
          recent_activity: Json
          revenue_real: number
          revenue_simulated: number
          total_bets_count: number
          total_deposits_amount: number
          total_users: number
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_game_chances: {
        Args: { game_id: string }
        Returns: number
      }
      get_game_public_data: {
        Args: { game_id: string }
        Returns: {
          ativo: boolean
          id: string
          imagem_url: string
          nome: string
          premio: number
        }[]
      }
      get_masked_pix_key: {
        Args: { pix_key: string }
        Returns: string
      }
      get_own_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_profile_summary: {
        Args: { profile_user_id: string }
        Returns: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          saldo: number
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      insert_balance_transaction_secure: {
        Args: {
          amount_param: number
          is_simulated_param?: boolean
          metadata_param?: Json
          new_balance_param: number
          previous_balance_param: number
          reference_id_param?: string
          transaction_type_param: string
          user_uuid: string
        }
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_system_operation: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_admin_financial_access: {
        Args: { accessed_table: string; accessed_user_id?: string }
        Returns: undefined
      }
      log_security_event: {
        Args: { details?: Json; event_type: string }
        Returns: undefined
      }
      pick_weighted_prize_9: {
        Args: Record<PropertyKey, never>
        Returns: Record<string, unknown>
      }
      play_scratch9: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      purchase_and_play_scratch_card: {
        Args: { card_id: string; use_simulated_balance?: boolean }
        Returns: Json
      }
      purchase_game: {
        Args: { card_id: string; promotion_id?: string }
        Returns: {
          game_result: boolean
          message: string
          new_balance: number
          prize_amount: number
          success: boolean
        }[]
      }
      seed_scratch9_inventory: {
        Args: { p_cash_budget: number; p_tickets: number }
        Returns: Json
      }
      track_link_click: {
        Args: {
          influencer_code: string
          ip_address_param?: unknown
          user_agent_param?: string
        }
        Returns: string
      }
      track_link_click_secure: {
        Args: {
          influencer_code: string
          ip_address_param?: unknown
          user_agent_param?: string
        }
        Returns: string
      }
      update_user_balance: {
        Args: { amount: number; user_uuid: string }
        Returns: undefined
      }
      update_user_balance_secure: {
        Args: {
          amount: number
          metadata?: Json
          reference_id?: string
          transaction_type: string
          user_uuid: string
        }
        Returns: undefined
      }
      update_user_balance_secure_v2: {
        Args: {
          amount: number
          metadata?: Json
          reference_id?: string
          transaction_type: string
          user_uuid: string
        }
        Returns: undefined
      }
      update_user_balance_secure_v3: {
        Args: {
          amount: number
          metadata?: Json
          reference_id?: string
          transaction_type: string
          user_uuid: string
        }
        Returns: undefined
      }
      update_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      validate_pix_key: {
        Args: { pix_key: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "influencer"
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
      app_role: ["admin", "user", "influencer"],
    },
  },
} as const
