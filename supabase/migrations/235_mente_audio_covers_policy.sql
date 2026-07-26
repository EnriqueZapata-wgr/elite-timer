-- 235_mente_audio_covers_policy.sql — MB-7 Track E (Mente V1.5.2 #3)
--
-- Los covers de la audioteca dependen de la policy de storage
-- "mente_audio_covers_read" (SELECT authenticated sobre 'covers/%' del bucket
-- privado 'mente-audio') para que el cliente pueda firmar URLs
-- (createSignedUrl en src/components/mente/audio-cover.ts). VERIFICADO en el
-- remoto 2026-07-26: la policy existe pero fue creada a mano (dashboard) y NO
-- vivía en migración — un rebuild del entorno la perdería en silencio y los
-- covers caerían a fallback local sin aviso.
--
-- Mismo criterio que 159_avatars_bucket.sql: documentar la infra en el repo y
-- reproducirla en entornos nuevos. Idempotente: en el remoto actual es no-op
-- (bucket ya existe; policy detectada por referencia a 'mente-audio' + covers).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mente-audio', 'mente-audio', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  -- Si ya hay una policy de lectura de covers sobre este bucket (la del
  -- dashboard), no dupliques semántica con otro nombre.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND qual LIKE '%mente-audio%' AND qual LIKE '%covers/%'
  ) THEN
    CREATE POLICY "mente_audio_covers_read" ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'mente-audio' AND name LIKE 'covers/%');
  END IF;
END $$;
