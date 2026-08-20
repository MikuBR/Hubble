-- ═══════════════════════════════════════════════════════════
-- HUBBLE — Migration: Fix handle_new_user username generation
--
-- Problema: o fallback `split_part(NEW.email, '@', 1)` pode gerar um
-- username com menos de 3 caracteres (ex.: email "ab@exemplo.com" -> "ab")
-- ou até vazio, violando o CHECK (length(username) BETWEEN 3 AND 30)
-- da tabela profiles.
--
-- Fix: cadeia de fallbacks que GARANTE username sempre com 3-30 chars:
--   1. username explícito vindo de raw_user_meta_data
--   2. prefixo do email (sanitizado) — usado se ausente ou < 3 chars
--   3. prefixo + sufixo do UUID (padding) — usado se ainda ausente/< 3
--   4. 'user_' + primeiros 8 chars do UUID — garantia final
--   5. left(..., 30) como rede de segurança do limite superior
--
-- Obs.: CREATE OR REPLACE preserva o trigger `on_auth_user_created`
-- (criado na migration 20260816000002_triggers.sql).
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT;
    v_display_name TEXT;
    v_uuid_suffix TEXT;
BEGIN
    -- Sufixo derivado do UUID (8 primeiros chars, sem hífens)
    v_uuid_suffix := substring(replace(NEW.id::text, '-', ''), 1, 8);

    -- 1) Username explícito vindo do metadata de cadastro
    v_username := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'username', '')), '');

    -- 2) Fallback: prefixo do email (sanitizado) se ausente ou curto demais
    IF v_username IS NULL OR length(v_username) < 3 THEN
        v_username := NULLIF(btrim(split_part(NEW.email, '@', 1)), '');
        IF v_username IS NOT NULL THEN
            -- Mantém apenas alfanuméricos/underscore e colapsa repetidos
            v_username := regexp_replace(v_username, '[^a-zA-Z0-9_]', '_', 'g');
            v_username := btrim(regexp_replace(v_username, '_+', '_', 'g'), '_');
            v_username := NULLIF(v_username, '');
        END IF;
    END IF;

    -- 3) Se ainda ausente ou < 3 chars, faz padding com sufixo do UUID
    IF v_username IS NULL OR length(v_username) < 3 THEN
        v_username := COALESCE(v_username, '') || v_uuid_suffix;
    END IF;

    -- 4) Garantia final: 'user_' + 8 chars do UUID (sempre 13 chars, válido)
    IF v_username IS NULL OR length(v_username) < 3 OR length(v_username) > 30 THEN
        v_username := 'user_' || v_uuid_suffix;
    END IF;

    -- 5) Rede de segurança do limite superior
    v_username := left(v_username, 30);

    -- Display name: usa o metadata explícito, senão o username final
    v_display_name := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'display_name', '')), '');
    IF v_display_name IS NULL THEN
        v_display_name := v_username;
    END IF;

    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        v_username,
        v_display_name,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

SELECT 'handle_new_user atualizado com sucesso!' AS status;
