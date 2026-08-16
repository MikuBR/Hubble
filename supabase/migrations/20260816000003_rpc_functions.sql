-- ═══════════════════════════════════════════════════════════
-- HUBBLE — RPC Functions for Recommendations
-- @spec §5.3 - Novos Horizontes Algorithm
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- FUNCTION: get_recommendations
-- Mídias bem avaliadas globalmente que o user não tem na biblioteca
-- e cujos gêneros o user TEM afinidade (score > 0)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_recommendations(
    p_user_id UUID,
    p_limit INT DEFAULT 20
)
RETURNS SETOF media_catalog
LANGUAGE plpgsql
AS $$
DECLARE
    user_genres TEXT[];
BEGIN
    -- Pegar gêneros que o user tem afinidade positiva
    SELECT array_agg(DISTINCT tag_name) INTO user_genres
    FROM user_tag_preferences
    WHERE user_id = p_user_id
      AND tag_type = 'genre'
      AND score > 0;

    -- Se não tem afinidade, retorna vazio (vai para Novos Horizontes)
    IF user_genres IS NULL OR array_length(user_genres, 1) IS NULL THEN
        RETURN QUERY SELECT * FROM media_catalog WHERE FALSE;
    END IF;

    RETURN QUERY
    SELECT m.*
    FROM media_catalog m
    WHERE m.id NOT IN (
        SELECT media_id FROM user_media_progress WHERE user_id = p_user_id
    )
    AND m.user_score_global > 7.5
    AND EXISTS (
        SELECT 1 FROM unnest(m.genres) AS g
        WHERE g = ANY(user_genres)
    )
    ORDER BY m.user_score_global DESC NULLS LAST
    LIMIT p_limit;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- FUNCTION: get_horizons (Novos Horizontes / Furo de Bolha)
-- Mídias bem avaliadas globalmente que o user não tem na biblioteca
-- e cujos gêneros o user NÃO TEM afinidade (score = 0 ou não existe)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_horizons(
    p_user_id UUID,
    p_limit INT DEFAULT 20
)
RETURNS SETOF media_catalog
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT m.*
    FROM media_catalog m
    WHERE m.id NOT IN (
        SELECT media_id FROM user_media_progress WHERE user_id = p_user_id
    )
    AND m.user_score_global > 8.0
    AND NOT EXISTS (
        -- Exclui gêneros que o user já tem afinidade (qualquer score != 0)
        SELECT 1 FROM unnest(m.genres) AS genre
        JOIN user_tag_preferences utp
            ON utp.tag_name = genre
            AND utp.user_id = p_user_id
            AND utp.tag_type = 'genre'
            AND utp.score != 0
    )
    ORDER BY m.user_score_global DESC NULLS LAST
    LIMIT p_limit;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- FUNCTION: get_user_stats
-- Estatísticas pessoais do usuário
-- ═══════════════════════════════════════════════════════════
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
        COUNT(*) FILTER (WHERE status IN ('reading', 'rewatching') AND mc.media_type IN ('manga', 'manhwa', 'manhua', 'novel', 'book'))::BIGINT AS reading_items,
        COALESCE(SUM(current_unit) FILTER (WHERE mc.media_type IN ('anime', 'tv_series')), 0)::BIGINT AS total_episodes,
        COALESCE(SUM(current_unit) FILTER (WHERE mc.media_type IN ('manga', 'manhwa', 'manhua', 'novel')), 0)::BIGINT AS total_chapters,
        ROUND(AVG(user_score)::NUMERIC, 1) FILTER (WHERE user_score IS NOT NULL) AS avg_score,
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION get_horizons TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats TO authenticated;