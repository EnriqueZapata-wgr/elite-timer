-- 216: Favoritas de audio del pilar Mente (Ajuste Mente v2 · 4).
-- Clave por slug (estable y legible; audio_pieces.slug es UNIQUE NOT NULL).
-- RLS: el usuario ve y gestiona SOLO las suyas. Idempotente.

CREATE TABLE IF NOT EXISTS public.audio_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slug)
);

ALTER TABLE public.audio_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own audio_favorites select" ON public.audio_favorites;
CREATE POLICY "own audio_favorites select"
  ON public.audio_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own audio_favorites insert" ON public.audio_favorites;
CREATE POLICY "own audio_favorites insert"
  ON public.audio_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own audio_favorites delete" ON public.audio_favorites;
CREATE POLICY "own audio_favorites delete"
  ON public.audio_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
