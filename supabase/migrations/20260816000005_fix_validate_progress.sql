-- ═══════════════════════════════════════════════════════════
-- HUBBLE — Migration: Fix Trigger validate_progress_increment
-- Corrige ambiguidade de coluna release_status
-- Execute no Dashboard SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Recriar a função com alias na tabela
CREATE OR REPLACE FUNCTION validate_progress_increment()
RETURNS TRIGGER AS $$
DECLARE
    v_release_status release_status_enum;
BEGIN
    SELECT mc.release_status INTO v_release_status
    FROM media_catalog mc
    WHERE mc.id = NEW.media_id;

    IF v_release_status = 'hiatus' AND NEW.current_unit > OLD.current_unit THEN
        RAISE EXCEPTION 'Cannot increment progress on hiatus media';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

SELECT 'Trigger validate_progress_increment corrigido!' AS status;