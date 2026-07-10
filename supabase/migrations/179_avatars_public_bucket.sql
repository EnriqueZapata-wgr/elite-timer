-- ============================================================================
-- 179 — Bucket avatars_public (foto pública opt-in). Rango Comunidad 177+.
-- Decisión aprobada #1: bucket público dedicado (el bucket 'avatars' sigue
-- privado). Se puebla SOLO al activar show_photo; user_profile_public.avatar_url
-- apunta aquí. Evita exponer el bucket privado.
--
-- public=true → lectura pública (URL directa). Escritura/borrado gated a la
-- carpeta {user_id}/ del dueño. Idempotente.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars_public', 'avatars_public', true, 15728640, ARRAY['image/*'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual LIKE '%avatars_public%' OR with_check LIKE '%avatars_public%')
  ) THEN
    -- Lectura pública (cualquiera, incluso anon) — es una foto de perfil pública.
    CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars_public');
    -- Escritura/actualización/borrado solo del dueño en su carpeta {user_id}/.
    CREATE POLICY "avatars_public_insert" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'avatars_public' AND (SELECT auth.uid()::text) = (storage.foldername(name))[1]);
    CREATE POLICY "avatars_public_update" ON storage.objects FOR UPDATE
      USING (bucket_id = 'avatars_public' AND (SELECT auth.uid()::text) = (storage.foldername(name))[1]);
    CREATE POLICY "avatars_public_delete" ON storage.objects FOR DELETE
      USING (bucket_id = 'avatars_public' AND (SELECT auth.uid()::text) = (storage.foldername(name))[1]);
  END IF;
END $$;
