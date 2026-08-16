// ═══════════════════════════════════════════════════════════════
// HUBBLE — Database Types (Generated from Supabase Migrations)
// Source: supabase/migrations/20260816000001_init_schema.sql
//         supabase/migrations/20260816000002_triggers.sql
//         supabase/migrations/20260816000003_rpc_functions.sql
//         supabase/migrations/20260816000004_fix_signup_and_test_user.sql
//         supabase/migrations/20260816000005_fix_validate_progress.sql
//         supabase/migrations/20260816000006_fix_get_user_stats_v3.sql
// Generated: 2026-08-16
// ═══════════════════════════════════════════════════════════════

// Enums
export type MediaTypeEnum = 
  | 'movie' 
  | 'tv_series' 
  | 'anime'
  | 'manga' 
  | 'manhwa' 
  | 'manhua'
  | 'novel' 
  | 'book' 
  | 'game';

export type UserStatusEnum = 
  | 'planning'    // pretendo assistir/ler
  | 'watching'    // em andamento
  | 'paused'      // pausado (sem previsão de retorno)
  | 'completed'   // terminado
  | 'dropped'     // abandonado
  | 'rewatching'; // re-assistindo/re-lendo

export type AgeRatingBrEnum = 'L' | '10' | '12' | '14' | '16' | '18';

export type PrestigeBadgeEnum = 'none' | 'nominee' | 'winner';

export type ReleaseStatusEnum = 
  | 'airing' 
  | 'finished' 
  | 'hiatus' 
  | 'cancelled' 
  | 'upcoming' 
  | 'orphaned';

// ═══════════════════════════════════════════════════════════════
// TABELA: profiles
// ═══════════════════════════════════════════════════════════════
export interface ProfilesRow {
  id: string;                    // UUID - REFERENCES auth.users(id) ON DELETE CASCADE
  username: string;              // UNIQUE NOT NULL, 3-30 chars
  display_name: string | null;
  avatar_url: string | null;
  default_view_mode: 'auto' | 'streaming' | 'reading';
  theme: 'light' | 'dark' | 'system';
  enable_nsfw_filter: boolean;
  enable_streaming: boolean;
  enable_reading: boolean;
  enable_games: boolean;
  preferred_language_western: 'pt-BR' | 'en' | 'es';
  preferred_language_oriental: 'romaji' | 'en' | 'pt-BR' | 'native';
  allow_public_share_links: boolean;
  is_admin: boolean;
  created_at: string;            // TIMESTAMPTZ
  updated_at: string;            // TIMESTAMPTZ
}

export interface ProfilesInsert {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  default_view_mode?: 'auto' | 'streaming' | 'reading';
  theme?: 'light' | 'dark' | 'system';
  enable_nsfw_filter?: boolean;
  enable_streaming?: boolean;
  enable_reading?: boolean;
  enable_games?: boolean;
  preferred_language_western?: 'pt-BR' | 'en' | 'es';
  preferred_language_oriental?: 'romaji' | 'en' | 'pt-BR' | 'native';
  allow_public_share_links?: boolean;
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProfilesUpdate {
  username?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  default_view_mode?: 'auto' | 'streaming' | 'reading';
  theme?: 'light' | 'dark' | 'system';
  enable_nsfw_filter?: boolean;
  enable_streaming?: boolean;
  enable_reading?: boolean;
  enable_games?: boolean;
  preferred_language_western?: 'pt-BR' | 'en' | 'es';
  preferred_language_oriental?: 'romaji' | 'en' | 'pt-BR' | 'native';
  allow_public_share_links?: boolean;
  is_admin?: boolean;
  updated_at?: string;
}

// ═══════════════════════════════════════════════════════════════
// TABELA: media_catalog
// ═══════════════════════════════════════════════════════════════
export interface MediaCatalogRow {
  id: string;                    // UUID PRIMARY KEY DEFAULT uuid_generate_v4()
  media_type: MediaTypeEnum;
  tmdb_id: number | null;
  anilist_id: number | null;
  mal_id: number | null;
  kitsu_id: number | null;
  mangadex_id: string | null;
  openlibrary_id: string | null;
  title_default: string;
  title_romaji: string | null;
  title_english: string | null;
  title_native: string | null;
  title_ptbr: string | null;
  synopsis: string | null;
  cover_url: string | null;
  backdrop_url: string | null;
  release_year: number | null;
  release_status: ReleaseStatusEnum;
  total_episodes: number;
  total_chapters: number;
  total_volumes: number;
  duration_minutes: number | null;
  episode_duration_minutes: number | null;
  age_rating_br: AgeRatingBrEnum;
  is_adult: boolean;
  prestige_badge: PrestigeBadgeEnum;
  genres: string[];              // TEXT[] NOT NULL DEFAULT '{}'
  themes: string[];              // TEXT[] NOT NULL DEFAULT '{}'
  studios: string[];             // TEXT[] NOT NULL DEFAULT '{}'
  user_score_global: number | null; // NUMERIC(3,1)
  created_at: string;            // TIMESTAMPTZ
  updated_at: string;            // TIMESTAMPTZ
}

export interface MediaCatalogInsert {
  media_type: MediaTypeEnum;
  tmdb_id?: number | null;
  anilist_id?: number | null;
  mal_id?: number | null;
  kitsu_id?: number | null;
  mangadex_id?: string | null;
  openlibrary_id?: string | null;
  title_default: string;
  title_romaji?: string | null;
  title_english?: string | null;
  title_native?: string | null;
  title_ptbr?: string | null;
  synopsis?: string | null;
  cover_url?: string | null;
  backdrop_url?: string | null;
  release_year?: number | null;
  release_status?: ReleaseStatusEnum;
  total_episodes?: number;
  total_chapters?: number;
  total_volumes?: number;
  duration_minutes?: number | null;
  episode_duration_minutes?: number | null;
  age_rating_br?: AgeRatingBrEnum;
  is_adult?: boolean;
  prestige_badge?: PrestigeBadgeEnum;
  genres?: string[];
  themes?: string[];
  studios?: string[];
  user_score_global?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface MediaCatalogUpdate {
  media_type?: MediaTypeEnum;
  tmdb_id?: number | null;
  anilist_id?: number | null;
  mal_id?: number | null;
  kitsu_id?: number | null;
  mangadex_id?: string | null;
  openlibrary_id?: string | null;
  title_default?: string;
  title_romaji?: string | null;
  title_english?: string | null;
  title_native?: string | null;
  title_ptbr?: string | null;
  synopsis?: string | null;
  cover_url?: string | null;
  backdrop_url?: string | null;
  release_year?: number | null;
  release_status?: ReleaseStatusEnum;
  total_episodes?: number;
  total_chapters?: number;
  total_volumes?: number;
  duration_minutes?: number | null;
  episode_duration_minutes?: number | null;
  age_rating_br?: AgeRatingBrEnum;
  is_adult?: boolean;
  prestige_badge?: PrestigeBadgeEnum;
  genres?: string[];
  themes?: string[];
  studios?: string[];
  user_score_global?: number | null;
  updated_at?: string;
}

// ═══════════════════════════════════════════════════════════════
// TABELA: user_media_progress
// ═══════════════════════════════════════════════════════════════
export interface UserMediaProgressRow {
  id: string;                    // UUID PRIMARY KEY DEFAULT uuid_generate_v4()
  user_id: string;               // UUID NOT NULL REFERENCES profiles(id)
  media_id: string;              // UUID NOT NULL REFERENCES media_catalog(id)
  status: UserStatusEnum;
  current_unit: number;
  total_units_at_completion: number | null;
  user_score: number | null;     // NUMERIC(3,1) CHECK (0-10)
  rewatch_count: number;
  started_at: string | null;     // DATE
  completed_at: string | null;   // DATE
  last_interaction_at: string;   // TIMESTAMPTZ
  private_insights: string;
  private_spoilers: string;
  created_at: string;            // TIMESTAMPTZ
  updated_at: string;            // TIMESTAMPTZ
}

export interface UserMediaProgressInsert {
  user_id: string;
  media_id: string;
  status?: UserStatusEnum;
  current_unit?: number;
  total_units_at_completion?: number | null;
  user_score?: number | null;
  rewatch_count?: number;
  started_at?: string | null;
  completed_at?: string | null;
  last_interaction_at?: string;
  private_insights?: string;
  private_spoilers?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserMediaProgressUpdate {
  status?: UserStatusEnum;
  current_unit?: number;
  total_units_at_completion?: number | null;
  user_score?: number | null;
  rewatch_count?: number;
  started_at?: string | null;
  completed_at?: string | null;
  last_interaction_at?: string;
  private_insights?: string;
  private_spoilers?: string;
  updated_at?: string;
}

// ═══════════════════════════════════════════════════════════════
// TABELA: user_tag_preferences (algoritmo de afinidade)
// ═══════════════════════════════════════════════════════════════
export type TagTypeEnum = 'genre' | 'theme' | 'studio';

export interface UserTagPreferencesRow {
  user_id: string;               // UUID NOT NULL REFERENCES profiles(id)
  tag_type: TagTypeEnum;
  tag_name: string;
  score: number;                 // INT DEFAULT 0 CHECK (-50 to 100)
  updated_at: string;            // TIMESTAMPTZ
}

export interface UserTagPreferencesInsert {
  user_id: string;
  tag_type: TagTypeEnum;
  tag_name: string;
  score?: number;
  updated_at?: string;
}

export interface UserTagPreferencesUpdate {
  score?: number;
  updated_at?: string;
}

// ═══════════════════════════════════════════════════════════════
// TABELA: media_titles_i18n
// ═══════════════════════════════════════════════════════════════
export interface MediaTitlesI18nRow {
  media_id: string;              // UUID REFERENCES media_catalog(id)
  language: string;
  title: string;
  is_official: boolean;
}

export interface MediaTitlesI18nInsert {
  media_id: string;
  language: string;
  title: string;
  is_official?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// TABELA: awards
// ═══════════════════════════════════════════════════════════════
export interface AwardsRow {
  id: string;                    // UUID PRIMARY KEY
  media_id: string;              // UUID REFERENCES media_catalog(id)
  award_name: string;
  category: string | null;
  year: number;
  is_winner: boolean;
  created_at: string;            // TIMESTAMPTZ
}

export interface AwardsInsert {
  media_id: string;
  award_name: string;
  category?: string | null;
  year: number;
  is_winner: boolean;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════
// TABELA: export_logs
// ═══════════════════════════════════════════════════════════════
export interface ExportLogsRow {
  id: string;                    // UUID PRIMARY KEY
  user_id: string;               // UUID REFERENCES profiles(id)
  format: 'json' | 'csv';
  file_size_bytes: number | null;
  created_at: string;            // TIMESTAMPTZ
}

export interface ExportLogsInsert {
  user_id: string;
  format: 'json' | 'csv';
  file_size_bytes?: number | null;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════
// TABELA: ingestion_logs
// ══════════════════════════════════════════════════════════════
export interface IngestionLogsRow {
  id: string;                    // UUID PRIMARY KEY
  source: string;                // 'aodb' | 'anilist' | 'tmdb' etc.
  started_at: string;            // TIMESTAMPTZ
  completed_at: string | null;   // TIMESTAMPTZ
  status: 'running' | 'success' | 'failed';
  records_processed: number;
  records_inserted: number;
  records_updated: number;
  error_message: string | null;
}

export interface IngestionLogsInsert {
  source: string;
  started_at?: string;
  completed_at?: string | null;
  status?: 'running' | 'success' | 'failed';
  records_processed?: number;
  records_inserted?: number;
  records_updated?: number;
  error_message?: string | null;
}

export interface IngestionLogsUpdate {
  completed_at?: string | null;
  status?: 'running' | 'success' | 'failed';
  records_processed?: number;
  records_inserted?: number;
  records_updated?: number;
  error_message?: string | null;
}

// ═══════════════════════════════════════════════════════════════
// TABELA: offline_anime_mapping (AODB cross-IDs)
// ═══════════════════════════════════════════════════════════════
export interface OfflineAnimeMappingRow {
  aodb_title: string;            // PRIMARY KEY
  anilist_id: number | null;
  mal_id: number | null;
  kitsu_id: number | null;
  anidb_id: number | null;
  updated_at: string;            // TIMESTAMPTZ
}

export interface OfflineAnimeMappingInsert {
  aodb_title: string;
  anilist_id?: number | null;
  mal_id?: number | null;
  kitsu_id?: number | null;
  anidb_id?: number | null;
  updated_at?: string;
}

// ═══════════════════════════════════════════════════════════════
// RPC Return Types
// ═══════════════════════════════════════════════════════════════
export interface GetUserStatsResult {
  total_items: number;
  completed_items: number;
  watching_items: number;
  reading_items: number;
  total_episodes: number;
  total_chapters: number;
  avg_score: number | null;
  top_genres: string[] | null;
  top_studios: string[] | null;
  days_active: number | null;
}

export type GetRecommendationsResult = MediaCatalogRow[];
export type GetHorizonsResult = MediaCatalogRow[];

// ═══════════════════════════════════════════════════════════════
// Database Schema (for Supabase client typing)
// ═══════════════════════════════════════════════════════════════
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow;
        Insert: ProfilesInsert;
        Update: ProfilesUpdate;
        Relationships: [];
      };
      media_catalog: {
        Row: MediaCatalogRow;
        Insert: MediaCatalogInsert;
        Update: MediaCatalogUpdate;
        Relationships: [];
      };
      user_media_progress: {
        Row: UserMediaProgressRow;
        Insert: UserMediaProgressInsert;
        Update: UserMediaProgressUpdate;
        Relationships: [
          { foreignKeyName: 'user_media_progress_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedTable: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'user_media_progress_media_id_fkey'; columns: ['media_id']; isOneToOne: false; referencedTable: 'media_catalog'; referencedColumns: ['id'] }
        ];
      };
      user_tag_preferences: {
        Row: UserTagPreferencesRow;
        Insert: UserTagPreferencesInsert;
        Update: UserTagPreferencesUpdate;
        Relationships: [
          { foreignKeyName: 'user_tag_preferences_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedTable: 'profiles'; referencedColumns: ['id'] }
        ];
      };
      media_titles_i18n: {
        Row: MediaTitlesI18nRow;
        Insert: MediaTitlesI18nInsert;
        Update: MediaTitlesI18nInsert;
        Relationships: [
          { foreignKeyName: 'media_titles_i18n_media_id_fkey'; columns: ['media_id']; isOneToOne: false; referencedTable: 'media_catalog'; referencedColumns: ['id'] }
        ];
      };
      awards: {
        Row: AwardsRow;
        Insert: AwardsInsert;
        Update: AwardsInsert;
        Relationships: [
          { foreignKeyName: 'awards_media_id_fkey'; columns: ['media_id']; isOneToOne: false; referencedTable: 'media_catalog'; referencedColumns: ['id'] }
        ];
      };
      export_logs: {
        Row: ExportLogsRow;
        Insert: ExportLogsInsert;
        Update: ExportLogsInsert;
        Relationships: [
          { foreignKeyName: 'export_logs_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedTable: 'profiles'; referencedColumns: ['id'] }
        ];
      };
      ingestion_logs: {
        Row: IngestionLogsRow;
        Insert: IngestionLogsInsert;
        Update: IngestionLogsUpdate;
        Relationships: [];
      };
      offline_anime_mapping: {
        Row: OfflineAnimeMappingRow;
        Insert: OfflineAnimeMappingInsert;
        Update: OfflineAnimeMappingInsert;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_recommendations: {
        Args: { p_user_id: string; p_limit?: number };
        Returns: GetRecommendationsResult;
      };
      get_horizons: {
        Args: { p_user_id: string; p_limit?: number };
        Returns: GetHorizonsResult;
      };
      get_user_stats: {
        Args: { p_user_id: string };
        Returns: GetUserStatsResult[];
      };
    };
    Enums: {
      media_type_enum: MediaTypeEnum;
      user_status_enum: UserStatusEnum;
      age_rating_br_enum: AgeRatingBrEnum;
      prestige_badge_enum: PrestigeBadgeEnum;
      release_status_enum: ReleaseStatusEnum;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper type for Supabase client
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Insert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Update<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T];