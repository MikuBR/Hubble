-- ═══════════════════════════════════════════════════════════
-- HUBBLE — Triggers
-- @spec §3.3 - Triggers
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- TRIGGER 1: Auto-update updated_at
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_media
    BEFORE UPDATE ON media_catalog
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_progress
    BEFORE UPDATE ON user_media_progress
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- TRIGGER 2: Algoritmo "Novos Horizontes" (Furo de Bolha)
-- Atualiza user_tag_preferences baseado em avaliações
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_tag_preferences()
RETURNS TRIGGER AS $$
DECLARE
    tag TEXT;
    score_delta INT;
    media_genres TEXT[];
BEGIN
    -- Só processa quando user_score muda e está completo
    IF NEW.status = 'completed'
       AND NEW.user_score IS NOT NULL
       AND (OLD.user_score IS NULL OR OLD.user_score <> NEW.user_score) THEN

        score_delta := CASE
            WHEN NEW.user_score >= 8.0 THEN 10
            WHEN NEW.user_score <= 5.0 THEN -5
            ELSE 0
        END;

        IF score_delta <> 0 THEN
            -- Pega gêneros da mídia
            SELECT genres INTO media_genres
            FROM media_catalog
            WHERE id = NEW.media_id;

            IF media_genres IS NOT NULL THEN
                FOREACH tag IN ARRAY media_genres
                LOOP
                    INSERT INTO user_tag_preferences (user_id, tag_type, tag_name, score)
                    VALUES (NEW.user_id, 'genre', tag, score_delta)
                    ON CONFLICT (user_id, tag_type, tag_name)
                    DO UPDATE SET
                        score = GREATEST(-50, LEAST(100,
                            user_tag_preferences.score + EXCLUDED.score
                        )),
                        updated_at = NOW();
                END LOOP;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recompute_tag_preferences
    AFTER INSERT OR UPDATE ON user_media_progress
    FOR EACH ROW EXECUTE FUNCTION update_tag_preferences();

-- ═══════════════════════════════════════════════════════════
-- TRIGGER 3: Validação de Progresso (bloqueia hiato)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION validate_progress_increment()
RETURNS TRIGGER AS $$
DECLARE
    release_status release_status_enum;
BEGIN
    SELECT release_status INTO release_status
    FROM media_catalog
    WHERE id = NEW.media_id;

    IF release_status = 'hiatus' AND NEW.current_unit > OLD.current_unit THEN
        RAISE EXCEPTION 'Cannot increment progress on hiatus media';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER block_hiatus_progress
    BEFORE UPDATE ON user_media_progress
    FOR EACH ROW EXECUTE FUNCTION validate_progress_increment();

-- ═══════════════════════════════════════════════════════════
-- TRIGGER 4: Auto-create profile on signup
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
