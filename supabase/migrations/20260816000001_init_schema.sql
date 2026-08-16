-- ═══════════════════════════════════════════════════════════
-- HUBBLE — Schema Inicial
-- @spec §3 - Modelo de Dados
-- Versão: 1.0 (2026-08-16)
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- EXTENSÕES
-- ═══════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- pg_cron é habilitado no dashboard do Supabase (Database → Extensions)

-- ═══════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════
CREATE TYPE media_type_enum AS ENUM (
    'movie', 'tv_series', 'anime',
    'manga', 'manhwa', 'manhua',
    'novel', 'book', 'game'
);

CREATE TYPE user_status_enum AS ENUM (
    'planning',   -- pretendo assistir/ler
    'watching',   -- em andamento
    'paused',     -- pausado (sem previsão de retorno)
    'completed',  -- terminado
    'dropped',    -- abandonado
    'rewatching'  -- re-assistindo/re-lendo
);

CREATE TYPE age_rating_br_enum AS ENUM ('L', '10', '12', '14', '16', '18');

CREATE TYPE prestige_badge_enum AS ENUM ('none', 'nominee', 'winner');

CREATE TYPE release_status_enum AS ENUM (
    'airing', 'finished', 'hiatus', 'cancelled', 'upcoming', 'orphaned'
);

-- ═══════════════════════════════════════════════════════════
-- TABELA 1: profiles
-- ═══════════════════════════════════════════════════════════
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL CHECK (length(username) BETWEEN 3 AND 30),
    display_name TEXT,
    avatar_url TEXT,

    -- Configurações Camaleão
    default_view_mode TEXT NOT NULL DEFAULT 'auto'
        CHECK (default_view_mode IN ('auto', 'streaming', 'reading')),
    theme TEXT NOT NULL DEFAULT 'dark'
        CHECK (theme IN ('light', 'dark', 'system')),

    -- Filtros & desativação modular
    enable_nsfw_filter BOOLEAN NOT NULL DEFAULT TRUE,
    enable_streaming BOOLEAN NOT NULL DEFAULT TRUE,
    enable_reading BOOLEAN NOT NULL DEFAULT TRUE,
    enable_games BOOLEAN NOT NULL DEFAULT TRUE,

    -- Idioma
    preferred_language_western TEXT NOT NULL DEFAULT 'pt-BR'
        CHECK (preferred_language_western IN ('pt-BR', 'en', 'es')),
    preferred_language_oriental TEXT NOT NULL DEFAULT 'romaji'
        CHECK (preferred_language_oriental IN ('romaji', 'en', 'pt-BR', 'native')),

    -- Privacidade
    allow_public_share_links BOOLEAN NOT NULL DEFAULT TRUE,

    -- Admin
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);

-- ═══════════════════════════════════════════════════════════
-- TABELA 2: media_catalog (público para leitura)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE media_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_type media_type_enum NOT NULL,

    -- Identificadores externos (para linking com APIs)
    tmdb_id INT UNIQUE,
    anilist_id INT UNIQUE,
    mal_id INT UNIQUE,
    kitsu_id INT UNIQUE,
    mangadex_id TEXT UNIQUE,
    openlibrary_id TEXT UNIQUE,

    -- Títulos multi-idioma
    title_default TEXT NOT NULL,
    title_romaji TEXT,
    title_english TEXT,
    title_native TEXT,
    title_ptbr TEXT,

    -- Metadados editoriais
    synopsis TEXT,
    cover_url TEXT,
    backdrop_url TEXT,
    release_year SMALLINT,
    release_status release_status_enum NOT NULL DEFAULT 'finished',

    -- Contagem
    total_episodes INT NOT NULL DEFAULT 0,
    total_chapters INT NOT NULL DEFAULT 0,
    total_volumes INT NOT NULL DEFAULT 0,
    duration_minutes INT,
    episode_duration_minutes INT,

    -- Classificação
    age_rating_br age_rating_br_enum NOT NULL DEFAULT 'L',
    is_adult BOOLEAN NOT NULL DEFAULT FALSE,
    prestige_badge prestige_badge_enum NOT NULL DEFAULT 'none',

    -- Tags (Postgres array)
    genres TEXT[] NOT NULL DEFAULT '{}',
    themes TEXT[] NOT NULL DEFAULT '{}',
    studios TEXT[] NOT NULL DEFAULT '{}',

    -- Score global (calculado pelo ingestor de AODB)
    user_score_global NUMERIC(3,1),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_trgm ON media_catalog USING gin(title_default gin_trgm_ops);
CREATE INDEX idx_media_anilist ON media_catalog(anilist_id) WHERE anilist_id IS NOT NULL;
CREATE INDEX idx_media_tmdb ON media_catalog(tmdb_id) WHERE tmdb_id IS NOT NULL;
CREATE INDEX idx_media_mal ON media_catalog(mal_id) WHERE mal_id IS NOT NULL;
CREATE INDEX idx_media_kitsu ON media_catalog(kitsu_id) WHERE kitsu_id IS NOT NULL;
CREATE INDEX idx_media_type ON media_catalog(media_type);
CREATE INDEX idx_media_genres ON media_catalog USING gin(genres);
CREATE INDEX idx_media_release_year ON media_catalog(release_year);

-- ═══════════════════════════════════════════════════════════
-- TABELA 3: user_media_progress
-- ═══════════════════════════════════════════════════════════
CREATE TABLE user_media_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES media_catalog(id) ON DELETE CASCADE,

    status user_status_enum NOT NULL DEFAULT 'planning',

    -- Progresso (genérico: episódio OU capítulo conforme media_type)
    current_unit INT NOT NULL DEFAULT 0,
    total_units_at_completion INT,

    -- Avaliação
    user_score NUMERIC(3,1) CHECK (user_score >= 0 AND user_score <= 10),
    rewatch_count SMALLINT NOT NULL DEFAULT 0,

    -- Datas
    started_at DATE,
    completed_at DATE,
    last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Diário privado (Markdown seguro via rehype-sanitize)
    private_insights TEXT NOT NULL DEFAULT '',
    private_spoilers TEXT NOT NULL DEFAULT '',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, media_id),

    -- Constraint: progress >= 0
    CHECK (current_unit >= 0)
);

CREATE INDEX idx_progress_user ON user_media_progress(user_id);
CREATE INDEX idx_progress_status ON user_media_progress(user_id, status);
CREATE INDEX idx_progress_updated ON user_media_progress(user_id, updated_at DESC);
CREATE INDEX idx_progress_media ON user_media_progress(media_id);

-- ═══════════════════════════════════════════════════════════
-- TABELA 4: user_tag_preferences (algoritmo de afinidade)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE user_tag_preferences (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tag_type TEXT NOT NULL CHECK (tag_type IN ('genre', 'theme', 'studio')),
    tag_name TEXT NOT NULL,
    score INT NOT NULL DEFAULT 0 CHECK (score >= -50 AND score <= 100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, tag_type, tag_name)
);

CREATE INDEX idx_tag_prefs_user ON user_tag_preferences(user_id);

-- ═══════════════════════════════════════════════════════════
-- TABELA 5: media_titles_i18n (títulos extras)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE media_titles_i18n (
    media_id UUID NOT NULL REFERENCES media_catalog(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    title TEXT NOT NULL,
    is_official BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (media_id, language)
);

-- ═══════════════════════════════════════════════════════════
-- TABELA 6: awards (admin-only)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE awards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_id UUID NOT NULL REFERENCES media_catalog(id) ON DELETE CASCADE,
    award_name TEXT NOT NULL,
    category TEXT,
    year INT NOT NULL,
    is_winner BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_awards_media ON awards(media_id);
CREATE INDEX idx_awards_year ON awards(year);

-- ═══════════════════════════════════════════════════════════
-- TABELA 7: export_logs (auditoria)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE export_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    format TEXT NOT NULL CHECK (format IN ('json', 'csv')),
    file_size_bytes INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- TABELA 8: ingestion_logs (logs de jobs)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE ingestion_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,  -- 'aodb', 'anilist', 'tmdb', etc.
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'success', 'failed')),
    records_processed INT NOT NULL DEFAULT 0,
    records_inserted INT NOT NULL DEFAULT 0,
    records_updated INT NOT NULL DEFAULT 0,
    error_message TEXT
);

CREATE INDEX idx_ingestion_source ON ingestion_logs(source, started_at DESC);

-- ═══════════════════════════════════════════════════════════
-- TABELA 9: offline_anime_mapping (AODB cross-IDs)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE offline_anime_mapping (
    aodb_title TEXT NOT NULL,
    anilist_id INT,
    mal_id INT,
    kitsu_id INT,
    anidb_id INT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (aodb_title)
);

CREATE INDEX idx_offline_anilist ON offline_anime_mapping(anilist_id) WHERE anilist_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_media_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tag_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_self" ON profiles
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "progress_self" ON user_media_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "tag_prefs_self" ON user_tag_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "export_self_select" ON export_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "export_self_insert" ON export_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- media_catalog: leitura pública, escrita só via service_role
ALTER TABLE media_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_read_all" ON media_catalog
    FOR SELECT USING (TRUE);

-- media_titles_i18n: leitura pública
ALTER TABLE media_titles_i18n ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_titles_read_all" ON media_titles_i18n
    FOR SELECT USING (TRUE);

-- awards: leitura pública, escrita admin
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "awards_read_all" ON awards
    FOR SELECT USING (TRUE);
CREATE POLICY "awards_admin_write" ON awards
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- ingestion_logs: leitura admin
ALTER TABLE ingestion_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingestion_admin_read" ON ingestion_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- offline_anime_mapping: leitura pública
ALTER TABLE offline_anime_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offline_mapping_read_all" ON offline_anime_mapping
    FOR SELECT USING (TRUE);
