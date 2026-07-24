-- 215: Categorías propias para Mantras y Visualización (Ajuste Mente v2 · 2).
-- 26 piezas caían todas en 'meditacion' → choca con la doctrina de
-- compartimentalizar. La UI agrupa por categoría, así que la categoría es la
-- fuente de verdad del sub-grouping.
-- Idempotente: DROP CONSTRAINT IF EXISTS + ADD (nombre real verificado en la
-- DB viva: audio_pieces_categoria_check); los UPDATE son por lista explícita
-- de slugs y re-correr no cambia nada.

ALTER TABLE public.audio_pieces
  DROP CONSTRAINT IF EXISTS audio_pieces_categoria_check;

ALTER TABLE public.audio_pieces
  ADD CONSTRAINT audio_pieces_categoria_check
  CHECK (categoria IN ('meditacion', 'respiracion', 'descanso', 'mantra', 'visualizacion'));

-- Los 9 mantras (lista explícita del brief, no LIKE — cero sorpresas).
UPDATE public.audio_pieces SET categoria = 'mantra'
WHERE slug IN (
  'mantra_amor_fati', 'mantra_esto_tambien_pasara', 'mantra_como_si_siguiente_paso',
  'mantra_go_for_the_win', 'mantra_bring_it_on', 'mantra_mi_mejor_yo',
  'mantra_ser_mejor_no_tener_razon', 'mantra_presente_perfecto', 'mantra_amante_del_proceso'
);

-- Las 4 visualizaciones.
UPDATE public.audio_pieces SET categoria = 'visualizacion'
WHERE slug IN (
  'visualizacion_dia_ideal', 'vision_de_futuro', 'visualizacion_creativa', 'woop'
);

-- enfoque_laser, estres_descarga, ansiedad_gestion, perdon_profundo y
-- mindfulness_base se quedan en 'meditacion' (Guiadas) — decisión del brief.
