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
      attempts: {
        Row: {
          attempted_at: string | null
          audio_url: string | null
          coherence_score: number | null
          feedback: string | null
          feedback_json: Json | null
          fluency_score: number | null
          graded_at: string | null
          grammar_score: number | null
          id: string
          overall_score: number | null
          prompt_text: string | null
          pronunciation_score: number | null
          question_id: string
          score: number | null
          session_id: string
          transcript: string | null
          type_id: string | null
          user_id: string
          vocabulary_score: number | null
        }
        Insert: {
          attempted_at?: string | null
          audio_url?: string | null
          coherence_score?: number | null
          feedback?: string | null
          feedback_json?: Json | null
          fluency_score?: number | null
          graded_at?: string | null
          grammar_score?: number | null
          id?: string
          overall_score?: number | null
          prompt_text?: string | null
          pronunciation_score?: number | null
          question_id: string
          score?: number | null
          session_id: string
          transcript?: string | null
          type_id?: string | null
          user_id: string
          vocabulary_score?: number | null
        }
        Update: {
          attempted_at?: string | null
          audio_url?: string | null
          coherence_score?: number | null
          feedback?: string | null
          feedback_json?: Json | null
          fluency_score?: number | null
          graded_at?: string | null
          grammar_score?: number | null
          id?: string
          overall_score?: number | null
          prompt_text?: string | null
          pronunciation_score?: number | null
          question_id?: string
          score?: number | null
          session_id?: string
          transcript?: string | null
          type_id?: string | null
          user_id?: string
          vocabulary_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      custom_prompts: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          id: string
          prompt: string
          times_practiced: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          prompt: string
          times_practiced?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          prompt?: string
          times_practiced?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_prompts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      daily_activity: {
        Row: {
          activity_date: string
          id: string
          last_active_at: string | null
          minutes_practiced: number | null
          user_id: string
        }
        Insert: {
          activity_date: string
          id?: string
          last_active_at?: string | null
          minutes_practiced?: number | null
          user_id: string
        }
        Update: {
          activity_date?: string
          id?: string
          last_active_at?: string | null
          minutes_practiced?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          ended_at: string | null
          id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          clerk_user_id: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          is_admin: boolean | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          clerk_user_id?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          is_admin?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          clerk_user_id?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          is_admin?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          max_seconds: number | null
          min_seconds: number | null
          prep_seconds: number | null
          text: string | null
          type: Database["public"]["Enums"]["prompt_type"]
        }
        Insert: {
          created_at?: string | null
          id: string
          image_url?: string | null
          max_seconds?: number | null
          min_seconds?: number | null
          prep_seconds?: number | null
          text?: string | null
          type: Database["public"]["Enums"]["prompt_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          max_seconds?: number | null
          min_seconds?: number | null
          prep_seconds?: number | null
          text?: string | null
          type?: Database["public"]["Enums"]["prompt_type"]
        }
        Relationships: []
      }
      question_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string | null
          difficulty: number | null
          id: string
          image_url: string | null
          max_seconds: number
          metadata: Json | null
          min_seconds: number
          prep_seconds: number
          prompt: string
          source_language: string
          target_language: string
          type: string
        }
        Insert: {
          created_at?: string | null
          difficulty?: number | null
          id?: string
          image_url?: string | null
          max_seconds?: number
          metadata?: Json | null
          min_seconds?: number
          prep_seconds?: number
          prompt: string
          source_language: string
          target_language: string
          type: string
        }
        Update: {
          created_at?: string | null
          difficulty?: number | null
          id?: string
          image_url?: string | null
          max_seconds?: number
          metadata?: Json | null
          min_seconds?: number
          prep_seconds?: number
          prompt?: string
          source_language?: string
          target_language?: string
          type?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          best_streak: number | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          user_id: string
        }
        Insert: {
          best_streak?: number | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          user_id: string
        }
        Update: {
          best_streak?: number | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          price_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          price_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          price_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          id: string
          stripe_event_id: string
          event_type: string
          processed_at: string
          payload: Json | null
        }
        Insert: {
          id?: string
          stripe_event_id: string
          event_type: string
          processed_at?: string
          payload?: Json | null
        }
        Update: {
          id?: string
          stripe_event_id?: string
          event_type?: string
          processed_at?: string
          payload?: Json | null
        }
        Relationships: []
      }
      free_tier_usage: {
        Row: {
          id: string
          user_id: string
          practice_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          practice_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          practice_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "free_tier_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      word_of_the_day: {
        Row: {
          id: string
          user_id: string
          word: string
          part_of_speech: string
          definition: string
          example: string
          pronunciation: string | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          word: string
          part_of_speech: string
          definition: string
          example: string
          pronunciation?: string | null
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          word?: string
          part_of_speech?: string
          definition?: string
          example?: string
          pronunciation?: string | null
          date?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_of_the_day_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_levels: {
        Row: {
          id: string
          user_id: string
          skill_area: string
          cefr_level: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          skill_area: string
          cefr_level: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          skill_area?: string
          cefr_level?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_levels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          id: string
          user_id: string
          attempt_id: string | null
          xp_amount: number
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          attempt_id?: string | null
          xp_amount: number
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          attempt_id?: string | null
          xp_amount?: number
          reason?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_attempt_signed_url: {
        Args: { p_expires_in?: number; p_file_path: string }
        Returns: string
      }
      get_or_create_user_by_clerk_id: {
        Args: {
          p_clerk_user_id: string
          p_display_name?: string
          p_email?: string
        }
        Returns: string
      }
      increment_prompt_practice_count: {
        Args: { prompt_id: string }
        Returns: undefined
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      upsert_daily_activity_tz_clerk: {
        Args: {
          p_minutes?: number
          p_now_ts: string
          p_tz: string
          p_user_id: string
        }
        Returns: undefined
      }
      has_premium_access: {
        Args: {
          p_user_id: string
        }
        Returns: boolean
      }
      check_and_increment_free_usage: {
        Args: {
          p_user_id: string
          p_lifetime_limit?: number
        }
        Returns: Json
      }
      get_free_tier_usage: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      award_xp_for_attempt: {
        Args: {
          p_attempt_id: string
        }
        Returns: number
      }
      get_weekly_leaderboard: {
        Args: {
          p_limit?: number
        }
        Returns: Json
      }
      get_user_weekly_rank: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      get_weak_skill_types: {
        Args: {
          p_user_id: string
          p_limit?: number
        }
        Returns: Json
      }
      get_user_total_xp: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
    }
    Enums: {
      subscription_status:
        | "active"
        | "canceled"
        | "past_due"
        | "unpaid"
        | "trialing"
        | "incomplete"
        | "incomplete_expired"
      prompt_type:
        | "listenThenSpeak"
        | "readThenSpeak"
        | "speakingSample"
        | "speakAboutPhoto"
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
      prompt_type: [
        "listenThenSpeak",
        "readThenSpeak",
        "speakingSample",
        "speakAboutPhoto",
      ],
    },
  },
} as const
