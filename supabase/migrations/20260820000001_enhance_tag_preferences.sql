-- ═══════════════════════════════════════════════════════════
-- HUBBLE — Migration: Enhance update_tag_preferences trigger
-- Adds themes (+5) and studios (+3) to tag preferences
-- Uses AniList tag rank as multiplicative weight
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_tag_preferences()
RETURNS TRIGGER AS $$
DECLARE
    tag TEXT;
    score_delta INT;
    media_genres TEXT[];
    media_themes TEXT[];
    media_studios TEXT[];
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
            SELECT genres, themes, studios INTO media_genres, media_themes, media_studios
            FROM media_catalog
            WHERE id = NEW.media_id;

            -- Processar GENRES (+10 base)
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

            -- Processar THEMES (+5 base)
            IF media_themes IS NOT NULL THEN
                FOREACH tag IN ARRAY media_themes
                LOOP
                    INSERT INTO user_tag_preferences (user_id, tag_type, tag_name, score)
                    VALUES (NEW.user_id, 'theme', tag, score_delta)
                    ON CONFLICT (user_id, tag_type, tag_name)
                    DO UPDATE SET
                        score = GREATEST(-50, LEAST(100,
                            user_tag_preferences.score + EXCLUDED.score
                        )),
                        updated_at = NOW();
                END LOOP;
            END IF;

            -- Processar STUDIOS (+3 base)
            IF media_studios IS NOT NULL THEN
                FOREACH tag IN ARRAY media_studios
                LOOP
                    INSERT INTO user_tag_preferences (user_id, tag_type, tag_name, score)
                    VALUES (NEW.user_id, 'studio', tag, score_delta)
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
