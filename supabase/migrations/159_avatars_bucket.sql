-- 159_avatars_bucket.sql — Bucket avatars + RLS (#138, sprint TESTING FIXES)
-- Rango Fable: 158-199.
--
-- El bucket 'avatars' existía SOLO en remoto (creado a mano en el dashboard,
-- policies "User manages own avatar 1oj01fe_*"). Esta migración lo documenta
-- en el repo y lo reproduce en entornos locales/nuevos. Idempotente: en el
-- remoto actual es no-op (bucket ya existe; policies equivalentes detectadas
-- por referencia a 'avatars' en qual/with_check).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', false, 15728640, ARRAY['image/*'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  -- Si ya hay CUALQUIER policy que referencia el bucket avatars (las del
  -- dashboard), no dupliques semántica con otros nombres.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual LIKE '%avatars%' OR with_check LIKE '%avatars%')
  ) THEN
    CREATE POLICY "own_avatar_select" ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars' AND (SELECT auth.uid()::text) = (storage.foldername(name))[1]);
    CREATE POLICY "own_avatar_insert" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'avatars' AND (SELECT auth.uid()::text) = (storage.foldername(name))[1]);
    CREATE POLICY "own_avatar_update" ON storage.objects FOR UPDATE
      USING (bucket_id = 'avatars' AND (SELECT auth.uid()::text) = (storage.foldername(name))[1]);
    CREATE POLICY "own_avatar_delete" ON storage.objects FOR DELETE
      USING (bucket_id = 'avatars' AND (SELECT auth.uid()::text) = (storage.foldername(name))[1]);
  END IF;
END $$;
