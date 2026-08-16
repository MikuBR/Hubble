-- ═══════════════════════════════════════════════════════════
-- HUBBLE — Migration: Fix RPC get_user_stats (v2)
-- Fix: FILTER clause position + enum 'reading' removal
-- Execute no Dashboard SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Recriar função get_user_stats corrigida
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
    total_items BIGINT,
    completed_items BIGINT,
    watching_items BIGINT,
    reading_items BIGINT,
    total_episodes BIGINT,
    total_chapters BIGINT,
    avg_score NUMERIC(3,1),
    top_genres TEXT[],
    top_studios TEXT[],
    days_active INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_items,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT AS completed_items,
        COUNT(*) FILTER (WHERE status IN ('watching', 'rewatching') AND mc.media_type IN ('anime', 'tv_series', 'movie'))::BIGINT AS watching_items,
        COUNT(*) FILTER (WHERE status IN ('planning', 'watching', 'paused', 'completed', 'dropped', 'rewatching') AND mc.media_type IN ('manga', 'manhwa', 'manhua', 'novel', 'book'))::BIGINT AS reading_items,
        COALESCE(SUM(current_unit) FILTER (WHERE mc.media_type IN ('anime', 'tv_series')), 0)::BIGINT AS total_episodes,
        COALESCE(SUM(current_unit) FILTER (WHERE mc.media_type IN ('manga', 'manhwa', 'manhua', 'novel')), 0)::BIGINT AS total_chapters,
        ROUND(AVG(user_score) FILTER (WHERE user_score IS NOT NULL)::NUMERIC, 1) AS avg_score,
        (
            SELECT array_agg(tag_name ORDER BY score DESC)
            FROM user_tag_preferences
            WHERE user_id = p_user_id AND tag_type = 'genre' AND score > 0
            LIMIT 10
        ) AS top_genres,
        (
            SELECT array_agg(tag_name ORDER BY score DESC)
            FROM user_tag_preferences
            WHERE user_id = p_user_id AND tag_type = 'studio' AND score > 0
            LIMIT 10
        ) AS top_studios,
        EXTRACT(DAY FROM (NOW() - MIN(created_at)))::INT AS days_active
    FROM user_media_progress u
    JOIN media_catalog mc ON mc.id = u.media_id
    WHERE u.user_id = p_user_id;
END;
$$;

SELECT 'RPC get_user_stats corrigido (v2 - FILTER position + enum reading)' AS status;