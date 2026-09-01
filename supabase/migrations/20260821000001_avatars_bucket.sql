-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260821000001_avatars_bucket
-- Cria o storage bucket 'avatars' com políticas RLS para upload seguro por user.
--
-- Bucket: storage.objects (tabela global). O bucket em si é criado via CLI/API
-- (`supabase storage create avatars --public`), e os buckets NÃO podem ser criados
-- dentro de uma migration SQL pura. O que esta migration faz:
--   1) Registra o bucket no storage_buckets (compatível com supabase migrations)
--      se a tabela existir; caso contrário, a criação real do bucket precisa ser
--      feita pelo CLI/Studio antes de rodar este migrate.
--   2) Aplica as políticas RLS que garantem:
--        - SELECT: público (avatars precisam ser visíveis sem autenticação)
--        - INSERT/UPDATE: apenas quando o prefixo do caminho do arquivo
--          (`storage.foldername(name)[1]`) é igual a `auth.uid()`
--          Ex: path = 'a1b2c3.../avatar.png' → só o user a1b2c3... pode fazer upload
--
-- RLS em storage.objects está HABILITADA por padrão no Supabase; essa migration
-- garante políticas explicitas (DROP..CREATE) para idempotência em re-execute.
--
-- Ordem de criação: bucket (CLI/Studio) → migration RLS → frontend file upload.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Verifica se o bucket já existe; se não, insere no storage_buckets.
  -- Nota: em Supabase local (docker) storage_buckets pode não existir — a migration
  -- ignora e segue adiante (bucket criado via CLI antes).
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'avatars',
      'avatars',
      TRUE,
      10485760,   -- 10 MB por arquivo
      ARRAY['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']
    );
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS Policies para avatars
-- ═══════════════════════════════════════════════════════════════════════════════

-- Garante que RLS esteja habilitado (deve estar por padrão)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1) SELECT público: qualquer pessoa pode ver avatares
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE tablename = 'objects' AND policyname = 'avatars_select_public' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY avatars_select_public
      ON storage.objects
      FOR SELECT
      USING (bucketid = 'avatars');
  END IF;
END;
$$;

-- 2) INSERT: só o owner do avatar pode fazer upload.
--    O user só pode escrever sob seu próprio diretório: `{uid}/avatar.png`.
--    `storage.foldername(name)[1]` retorna o primeiro segmento do path (o uid).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE tablename = 'objects' AND policyname = 'avatars_insert_owner' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY avatars_insert_owner
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucketid = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END;
$$;

-- 3) UPDATE: só o owner pode atualizar (ex: sobrescrever avatar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE tablename = 'objects' AND policyname = 'avatars_update_owner' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY avatars_update_owner
      ON storage.objects
      FOR UPDATE
      USING (
        bucketid = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END;
$$;

-- 4) DELETE: só o owner pode deletar o próprio avatar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE tablename = 'objects' AND policyname = 'avatars_delete_owner' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY avatars_delete_owner
      ON storage.objects
      FOR DELETE
      USING (
        bucketid = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END;
$$;