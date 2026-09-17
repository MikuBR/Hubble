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
      awards: {
        Row: {
          award_name: string
          category: string | null
          created_at: string
          id: string
          is_winner: boolean
          media_id: string
          year: number
        }
        Insert: {
          award_name: string
          category?: string | null
          created_at?: string
          id?: string
          is_winner: boolean
          media_id: string
          year: number
        }
        Update: {
          award_name?: string
          category?: string | null
          created_at?: string
          id?: string
          is_winner?: boolean
          media_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "awards_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      export_logs: {
        Row: {
          created_at: string
          file_size_bytes: number | null
          format: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_size_bytes?: number | null
          format: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_size_bytes?: number | null
          format?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          records_inserted: number
          records_processed: number
          records_updated: number
          source: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_inserted?: number
          records_processed?: number
          records_updated?: number
          source: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_inserted?: number
          records_processed?: number
          records_updated?: number
          source?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      media_catalog: {
        Row: {
          age_rating_br: Database["public"]["Enums"]["age_rating_br_enum"]
          anilist_id: number | null
          backdrop_url: string | null
          cover_url: string | null
          created_at: string
          duration_minutes: number | null
          episode_duration_minutes: number | null
          genres: string[]
          id: string
          is_adult: boolean
          kitsu_id: number | null
          mal_id: number | null
          mangadex_id: string | null
          media_type: Database["public"]["Enums"]["media_type_enum"]
          openlibrary_id: string | null
          prestige_badge: Database["public"]["Enums"]["prestige_badge_enum"]
          release_status: Database["public"]["Enums"]["release_status_enum"]
          release_year: number | null
          studios: string[]
          synopsis: string | null
          themes: string[]
          title_default: string
          title_english: string | null
          title_native: string | null
          title_ptbr: string | null
          title_romaji: string | null
          tmdb_id: number | null
          total_chapters: number
          total_episodes: number
          total_volumes: number
          updated_at: string
          user_score_global: number | null
        }
        Insert: {
          age_rating_br?: Database["public"]["Enums"]["age_rating_br_enum"]
          anilist_id?: number | null
          backdrop_url?: string | null
          cover_url?: string | null
          created_at?: string
          duration_minutes?: number | null
          episode_duration_minutes?: number | null
          genres?: string[]
          id?: string
          is_adult?: boolean
          kitsu_id?: number | null
          mal_id?: number | null
          mangadex_id?: string | null
          media_type: Database["public"]["Enums"]["media_type_enum"]
          openlibrary_id?: string | null
          prestige_badge?: Database["public"]["Enums"]["prestige_badge_enum"]
          release_status?: Database["public"]["Enums"]["release_status_enum"]
          release_year?: number | null
          studios?: string[]
          synopsis?: string | null
          themes?: string[]
          title_default: string
          title_english?: string | null
          title_native?: string | null
          title_ptbr?: string | null
          title_romaji?: string | null
          tmdb_id?: number | null
          total_chapters?: number
          total_episodes?: number
          total_volumes?: number
          updated_at?: string
          user_score_global?: number | null
        }
        Update: {
          age_rating_br?: Database["public"]["Enums"]["age_rating_br_enum"]
          anilist_id?: number | null
          backdrop_url?: string | null
          cover_url?: string | null
          created_at?: string
          duration_minutes?: number | null
          episode_duration_minutes?: number | null
          genres?: string[]
          id?: string
          is_adult?: boolean
          kitsu_id?: number | null
          mal_id?: number | null
          mangadex_id?: string | null
          media_type?: Database["public"]["Enums"]["media_type_enum"]
          openlibrary_id?: string | null
          prestige_badge?: Database["public"]["Enums"]["prestige_badge_enum"]
          release_status?: Database["public"]["Enums"]["release_status_enum"]
          release_year?: number | null
          studios?: string[]
          synopsis?: string | null
          themes?: string[]
          title_default?: string
          title_english?: string | null
          title_native?: string | null
          title_ptbr?: string | null
          title_romaji?: string | null
          tmdb_id?: number | null
          total_chapters?: number
          total_episodes?: number
          total_volumes?: number
          updated_at?: string
          user_score_global?: number | null
        }
        Relationships: []
      }
      media_titles_i18n: {
        Row: {
          is_official: boolean
          language: string
          media_id: string
          title: string
        }
        Insert: {
          is_official?: boolean
          language: string
          media_id: string
          title: string
        }
        Update: {
          is_official?: boolean
          language?: string
          media_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_titles_i18n_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_anime_mapping: {
        Row: {
          anidb_id: number | null
          anilist_id: number | null
          aodb_title: string
          kitsu_id: number | null
          mal_id: number | null
          updated_at: string
        }
        Insert: {
          anidb_id?: number | null
          anilist_id?: number | null
          aodb_title: string
          kitsu_id?: number | null
          mal_id?: number | null
          updated_at?: string
        }
        Update: {
          anidb_id?: number | null
          anilist_id?: number | null
          aodb_title?: string
          kitsu_id?: number | null
          mal_id?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allow_public_share_links: boolean
          avatar_url: string | null
          created_at: string
          default_view_mode: string
          display_name: string | null
          enable_games: boolean
          enable_nsfw_filter: boolean
          enable_reading: boolean
          enable_streaming: boolean
          id: string
          is_admin: boolean
          preferred_language_oriental: string
          preferred_language_western: string
          theme: string
          updated_at: string
          username: string
        }
        Insert: {
          allow_public_share_links?: boolean
          avatar_url?: string | null
          created_at?: string
          default_view_mode?: string
          display_name?: string | null
          enable_games?: boolean
          enable_nsfw_filter?: boolean
          enable_reading?: boolean
          enable_streaming?: boolean
          id: string
          is_admin?: boolean
          preferred_language_oriental?: string
          preferred_language_western?: string
          theme?: string
          updated_at?: string
          username: string
        }
        Update: {
          allow_public_share_links?: boolean
          avatar_url?: string | null
          created_at?: string
          default_view_mode?: string
          display_name?: string | null
          enable_games?: boolean
          enable_nsfw_filter?: boolean
          enable_reading?: boolean
          enable_streaming?: boolean
          id?: string
          is_admin?: boolean
          preferred_language_oriental?: string
          preferred_language_western?: string
          theme?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_media_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          current_unit: number
          id: string
          last_interaction_at: string
          media_id: string
          private_insights: string
          private_spoilers: string
          rewatch_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["user_status_enum"]
          total_units_at_completion: number | null
          updated_at: string
          user_id: string
          user_score: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_unit?: number
          id?: string
          last_interaction_at?: string
          media_id: string
          private_insights?: string
          private_spoilers?: string
          rewatch_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["user_status_enum"]
          total_units_at_completion?: number | null
          updated_at?: string
          user_id: string
          user_score?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_unit?: number
          id?: string
          last_interaction_at?: string
          media_id?: string
          private_insights?: string
          private_spoilers?: string
          rewatch_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["user_status_enum"]
          total_units_at_completion?: number | null
          updated_at?: string
          user_id?: string
          user_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_media_progress_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_media_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tag_preferences: {
        Row: {
          score: number
          tag_name: string
          tag_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          score?: number
          tag_name: string
          tag_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          score?: number
          tag_name?: string
          tag_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tag_preferences_user_id_fkey"
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
      get_horizons: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          age_rating_br: Database["public"]["Enums"]["age_rating_br_enum"]
          anilist_id: number | null
          backdrop_url: string | null
          cover_url: string | null
          created_at: string
          duration_minutes: number | null
          episode_duration_minutes: number | null
          genres: string[]
          id: string
          is_adult: boolean
          kitsu_id: number | null
          mal_id: number | null
          mangadex_id: string | null
          media_type: Database["public"]["Enums"]["media_type_enum"]
          openlibrary_id: string | null
          prestige_badge: Database["public"]["Enums"]["prestige_badge_enum"]
          release_status: Database["public"]["Enums"]["release_status_enum"]
          release_year: number | null
          studios: string[]
          synopsis: string | null
          themes: string[]
          title_default: string
          title_english: string | null
          title_native: string | null
          title_ptbr: string | null
          title_romaji: string | null
          tmdb_id: number | null
          total_chapters: number
          total_episodes: number
          total_volumes: number
          updated_at: string
          user_score_global: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "media_catalog"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_recommendations: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          age_rating_br: Database["public"]["Enums"]["age_rating_br_enum"]
          anilist_id: number | null
          backdrop_url: string | null
          cover_url: string | null
          created_at: string
          duration_minutes: number | null
          episode_duration_minutes: number | null
          genres: string[]
          id: string
          is_adult: boolean
          kitsu_id: number | null
          mal_id: number | null
          mangadex_id: string | null
          media_type: Database["public"]["Enums"]["media_type_enum"]
          openlibrary_id: string | null
          prestige_badge: Database["public"]["Enums"]["prestige_badge_enum"]
          release_status: Database["public"]["Enums"]["release_status_enum"]
          release_year: number | null
          studios: string[]
          synopsis: string | null
          themes: string[]
          title_default: string
          title_english: string | null
          title_native: string | null
          title_ptbr: string | null
          title_romaji: string | null
          tmdb_id: number | null
          total_chapters: number
          total_episodes: number
          total_volumes: number
          updated_at: string
          user_score_global: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "media_catalog"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_stats: {
        Args: { p_user_id: string }
        Returns: {
          avg_score: number
          completed_items: number
          days_active: number
          reading_items: number
          top_genres: string[]
          top_studios: string[]
          total_chapters: number
          total_episodes: number
          total_items: number
          watching_items: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      age_rating_br_enum: "L" | "10" | "12" | "14" | "16" | "18"
      media_type_enum:
        | "movie"
        | "tv_series"
        | "anime"
        | "manga"
        | "manhwa"
        | "manhua"
        | "novel"
        | "book"
        | "game"
      prestige_badge_enum: "none" | "nominee" | "winner"
      release_status_enum:
        | "airing"
        | "finished"
        | "hiatus"
        | "cancelled"
        | "upcoming"
        | "orphaned"
      user_status_enum:
        | "planning"
        | "watching"
        | "paused"
        | "completed"
        | "dropped"
        | "rewatching"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

// Aliases for enum values used across the app (matching src/types/index.ts imports)
export type MediaType = Database["public"]["Enums"]["media_type_enum"];
export type UserStatus = Database["public"]["Enums"]["user_status_enum"];
export type AgeRatingBR = Database["public"]["Enums"]["age_rating_br_enum"];
export type PrestigeBadge = Database["public"]["Enums"]["prestige_badge_enum"];
export type ReleaseStatus = Database["public"]["Enums"]["release_status_enum"];

export const Constants = {
  public: {
    Enums: {
      age_rating_br_enum: ["L", "10", "12", "14", "16", "18"],
      media_type_enum: [
        "movie",
        "tv_series",
        "anime",
        "manga",
        "manhwa",
        "manhua",
        "novel",
        "book",
        "game",
      ],
      prestige_badge_enum: ["none", "nominee", "winner"],
      release_status_enum: [
        "airing",
        "finished",
        "hiatus",
        "cancelled",
        "upcoming",
        "orphaned",
      ],
      user_status_enum: [
        "planning",
        "watching",
        "paused",
        "completed",
        "dropped",
        "rewatching",
      ],
    },
  },
} as const
