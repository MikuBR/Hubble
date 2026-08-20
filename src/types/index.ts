/**
 * Re-export all database types for convenience
 */
export type {
  Database,
  MediaType,
  UserStatus,
  AgeRatingBR,
  PrestigeBadge,
  ReleaseStatus,
  Json,
} from "./database.types";

// UI-specific types
export interface MediaCatalog {
  id: string;
  media_type: MediaType;
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
  trailer_url: string | null;
  release_year: number | null;
  release_status: ReleaseStatus;
  total_episodes: number;
  total_chapters: number;
  total_volumes: number;
  duration_minutes: number | null;
  episode_duration_minutes: number | null;
  age_rating_br: AgeRatingBR;
  is_adult: boolean;
  prestige_badge: PrestigeBadge;
  genres: string[];
  themes: string[];
  studios: string[];
  user_score_global: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserMediaProgress {
  id: string;
  user_id: string;
  media_id: string;
  status: UserStatus;
  current_unit: number;
  total_units_at_completion: number | null;
  user_score: number | null;
  rewatch_count: number;
  started_at: string | null;
  completed_at: string | null;
  last_interaction_at: string;
  private_insights: string;
  private_spoilers: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  default_view_mode: "auto" | "streaming" | "reading";
  theme: "light" | "dark" | "system";
  enable_nsfw_filter: boolean;
  enable_streaming: boolean;
  enable_reading: boolean;
  enable_games: boolean;
  preferred_language_western: "pt-BR" | "en" | "es";
  preferred_language_oriental: "romaji" | "en" | "pt-BR" | "native";
  allow_public_share_links: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface TagPreference {
  user_id: string;
  tag_type: "genre" | "theme" | "studio";
  tag_name: string;
  score: number;
  updated_at: string;
}

export interface MediaWithProgress extends MediaCatalog {
  title?: string; // Resolved title
  progress?: UserMediaProgress;
}