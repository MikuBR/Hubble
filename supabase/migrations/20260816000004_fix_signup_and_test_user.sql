-- ═══════════════════════════════════════════════════════════
-- HUBBLE — Migration: Fix Signup + Add Test User
-- Workaround para habilitar signup e testar fluxo completo
-- Execute no Dashboard SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Garantir que a função handle_new_user está correta (sem username NOT NULL issue)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            split_part(NEW.email, '@', 1),
            'user_' || substring(NEW.id::text from 1 for 8)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            split_part(NEW.email, '@', 1),
            'Usuário'
        ),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Confirmar que o profile foi criado via trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111')
       AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111') THEN
        INSERT INTO public.profiles (id, username, display_name)
        VALUES (
            '11111111-1111-1111-1111-111111111111',
            'tester_hubble',
            'Tester Hubble'
        );
    END IF;
END $$;

SELECT 'Migration aplicada com sucesso!' AS status;
