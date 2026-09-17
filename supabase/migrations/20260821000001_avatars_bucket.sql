-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260821000001_avatars_bucket
-- Cria o storage bucket 'avatars' com políticas RLS para upload seguro por user.
--
-- A tabela storage.objects usa a coluna bucket_id (text) — não bucketid.
-- A verificação de existência de política usa pg_class.join com pg_policy.polrelid
-- pois o catalog pg_policy não tem mais coluna tablename no Postgres 17.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Verifica se o bucket already existe; se não, insere no storage_buckets.
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

-- 1) SELECT público: qualquer pessoa pode ver avatares
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'objects'
      AND c.relnamespace = 'storage'::regnamespace
      AND p.polname = 'avatars_select_public'
  ) THEN
    CREATE POLICY avatars_select_public
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;
END;
$$;

-- 2) INSERT: só o owner do avatar pode fazer upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'objects'
      AND c.relnamespace = 'storage'::regnamespace
      AND p.polname = 'avatars_insert_owner'
  ) THEN
    CREATE POLICY avatars_insert_owner
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END;
$$;

-- 3) UPDATE: só o owner pode atualizar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'objects'
      AND c.relnamespace = 'storage'::regnamespace
      AND p.polname = 'avatars_update_owner'
  ) THEN
    CREATE POLICY avatars_update_owner
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END;
$$;

-- 4) DELETE: só o owner pode deletar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'objects'
      AND c.relnamespace = 'storage'::regnamespace
      AND p.polname = 'avatars_delete_owner'
  ) THEN
    CREATE POLICY avatars_delete_owner
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END;
$$;
