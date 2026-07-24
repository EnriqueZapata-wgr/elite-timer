-- 219: Binaurales (3 piezas, feature chica del pilar Mente · 2026-07-23).
-- Audio-utilidad de fondo, NO sesión: sin voz, sin cuenco, sin gate, sin
-- economía (el player no llama logAudioSession para categoria 'binaural').
-- Los .m4a (30 min, estéreo, beats puros L/R + cama tenue) se suben al bucket
-- 'mente-audio' ANTES del db push, igual que los batches 1 y 2.
-- Copy honesto: cero claim curativo — descripción neutra (ondas + estado).
-- Idempotente: DROP NOT NULL re-corre sin error; constraint DROP IF EXISTS +
-- ADD (patrón de la 215, mismo nombre real audio_pieces_categoria_check);
-- seed ON CONFLICT (slug) DO NOTHING.

-- Los binaurales no tienen voz. El CHECK (voz IN ('m','f')) se conserva: en
-- SQL un NULL lo pasa. El cliente ya tipa voz como 'm' | 'f' | null y ningún
-- código lee voz (solo viaja en los SELECT del catálogo).
ALTER TABLE public.audio_pieces
  ALTER COLUMN voz DROP NOT NULL;

ALTER TABLE public.audio_pieces
  DROP CONSTRAINT IF EXISTS audio_pieces_categoria_check;

ALTER TABLE public.audio_pieces
  ADD CONSTRAINT audio_pieces_categoria_check
  CHECK (categoria IN ('meditacion', 'respiracion', 'descanso', 'mantra', 'visualizacion', 'binaural'));

-- imagen_path NULL: la UI usa el fallback editorial local por categoría.
INSERT INTO public.audio_pieces
  (slug, titulo, subtitulo, categoria, duracion_seg, voz, storage_path, orden, tier, publicado)
VALUES
  ('binaural_alpha', 'Enfoque relajado (alpha)',  'Ondas alpha para foco relajado', 'binaural', 1800, NULL, 'audio/binaural_alpha.m4a', 40, 'base', true),
  ('binaural_theta', 'Descanso profundo (theta)', 'Ondas theta para calma profunda', 'binaural', 1800, NULL, 'audio/binaural_theta.m4a', 41, 'base', true),
  ('binaural_delta', 'Desconexión total (delta)', 'Ondas delta para desconectar',    'binaural', 1800, NULL, 'audio/binaural_delta.m4a', 42, 'base', true)
ON CONFLICT (slug) DO NOTHING;
