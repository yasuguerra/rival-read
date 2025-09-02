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
      game_runs: {
        Row: {
          accuracy: number | null
          created_at: string
          duration_sec: number | null
          game_id: string
          id: string
          level: number
          params_json: Json | null
          score: number | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          duration_sec?: number | null
          game_id: string
          id?: string
          level?: number
          params_json?: Json | null
          score?: number | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          duration_sec?: number | null
          game_id?: string
          id?: string
          level?: number
          params_json?: Json | null
          score?: number | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_runs_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          skills_json: Json
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          skills_json?: Json
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          skills_json?: Json
        }
        Relationships: []
      }
      goals: {
        Row: {
          active: boolean
          created_at: string
          id: string
          minutes_daily: number
          mode: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          minutes_daily?: number
          mode: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          minutes_daily?: number
          mode?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          rival_id: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          rival_id?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          rival_id?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_tests: {
        Row: {
          comp_pct: number | null
          ended_at: string | null
          id: string
          mode: string
          started_at: string
          text_id: string | null
          user_id: string
          wpm: number | null
        }
        Insert: {
          comp_pct?: number | null
          ended_at?: string | null
          id?: string
          mode?: string
          started_at?: string
          text_id?: string | null
          user_id: string
          wpm?: number | null
        }
        Update: {
          comp_pct?: number | null
          ended_at?: string | null
          id?: string
          mode?: string
          started_at?: string
          text_id?: string | null
          user_id?: string
          wpm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_tests_text_id_fkey"
            columns: ["text_id"]
            isOneToOne: false
            referencedRelation: "texts"
            referencedColumns: ["id"]
          },
        ]
      }
      rival_states: {
        Row: {
          date: string
          id: string
          params_json: Json | null
          updated_at: string
          user_id: string
          xp_accum: number
        }
        Insert: {
          date?: string
          id?: string
          params_json?: Json | null
          updated_at?: string
          user_id: string
          xp_accum?: number
        }
        Update: {
          date?: string
          id?: string
          params_json?: Json | null
          updated_at?: string
          user_id?: string
          xp_accum?: number
        }
        Relationships: []
      }
      rivals: {
        Row: {
          archetype: string
          color: string
          created_at: string
          id: string
          name: string
          skin: string
          user_id: string
        }
        Insert: {
          archetype?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          skin?: string
          user_id: string
        }
        Update: {
          archetype?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          skin?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          duration_min: number
          ended_at: string | null
          goal_met: boolean | null
          id: string
          mode: string
          started_at: string
          user_id: string
        }
        Insert: {
          duration_min: number
          ended_at?: string | null
          goal_met?: boolean | null
          id?: string
          mode: string
          started_at?: string
          user_id: string
        }
        Update: {
          duration_min?: number
          ended_at?: string | null
          goal_met?: boolean | null
          id?: string
          mode?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skill_ratings: {
        Row: {
          id: string
          mu: number
          sigma: number
          skill: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          mu?: number
          sigma?: number
          skill: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          mu?: number
          sigma?: number
          skill?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          count: number
          protected_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          protected_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          protected_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      texts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          language: string | null
          source: string | null
          storage_path: string | null
          title: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          language?: string | null
          source?: string | null
          storage_path?: string | null
          title: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          language?: string | null
          source?: string | null
          storage_path?: string | null
          title?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: []
      }
      xp_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          meta: Json | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          meta?: Json | null
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          meta?: Json | null
          source?: string
          user_id?: string
        }
        Relationships: []
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
