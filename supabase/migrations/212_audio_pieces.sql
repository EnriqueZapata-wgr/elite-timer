-- 212: Catálogo de audio del pilar Mente (Sprint Audio Mente, batch 1).
-- La app pinta las cards dinámico desde esta tabla (cero hardcode de piezas).
-- El gate real de tier Pro está en la ENTREGA del archivo (edge function
-- mente-audio-url → signed URL del bucket privado), no en este metadata:
-- cualquier autenticado puede ver que la pieza existe (para el upsell).
-- El bucket privado 'mente-audio' se crea como infra aparte (no en migración:
-- policies sobre storage.objects no siempre aplican vía db push).
-- Idempotente.

CREATE TABLE IF NOT EXISTS public.audio_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  categoria TEXT NOT NULL CHECK (categoria IN ('meditacion', 'respiracion', 'descanso')),
  duracion_seg INT NOT NULL,
  voz TEXT NOT NULL CHECK (voz IN ('m', 'f')),
  storage_path TEXT NOT NULL,
  imagen_path TEXT,
  orden INT NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'base' CHECK (tier IN ('base', 'pro')),
  publicado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audio_pieces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read published audio_pieces" ON public.audio_pieces;
CREATE POLICY "read published audio_pieces"
  ON public.audio_pieces FOR SELECT
  TO authenticated
  USING (publicado = true);

-- Sin INSERT/UPDATE/DELETE para clientes: el catálogo se administra server-side.

-- ── Seed batch 1 (11 piezas producidas 2026-07-23, −20 LUFS) ──
-- duracion_seg = duración REAL medida con ffprobe (pausa_1min: 68s, no 66).
-- imagen_path NULL: las covers MJ aún no existen — la UI usa fallback editorial
-- por categoría; al subir covers → UPDATE imagen_path = 'covers/<slug>.png'.
-- publicado = true: los .m4a se suben al bucket ANTES del db push de esta
-- migración (paso 2 del sprint).
INSERT INTO public.audio_pieces
  (slug, titulo, subtitulo, categoria, duracion_seg, voz, storage_path, orden, tier, publicado)
VALUES
  ('nsdr_yoga_nidra',      'Descanso profundo (NSDR)', 'Restauración guiada sin dormir',        'descanso',    900,  'm', 'audio/nsdr_yoga_nidra.m4a',      1,  'base', true),
  ('escaneo_corporal',     'Escaneo corporal',         'Recorre tu cuerpo con atención',        'meditacion',  480,  'f', 'audio/escaneo_corporal.m4a',     2,  'base', true),
  ('gratitud',             'Gratitud',                 'Entrena la mirada que agradece',        'meditacion',  360,  'f', 'audio/gratitud.m4a',             3,  'base', true),
  ('pranayama_guiado',     'Respiración consciente',   'Breathwork narrado, paso a paso',       'respiracion', 360,  'm', 'audio/pranayama_guiado.m4a',     4,  'base', true),
  ('cierre_del_dia',       'Cierre del día',           'Reflexión nocturna para soltar',        'meditacion',  480,  'm', 'audio/cierre_del_dia.m4a',       5,  'base', true),
  ('pausa_1min',           'Pausa de 1 minuto',        'Micro-reset entre bloques',             'descanso',    68,   'm', 'audio/pausa_1min.m4a',           6,  'base', true),
  ('presencia',            'El poder del ahora',       'Desidentifícate del pensamiento',       'meditacion',  600,  'm', 'audio/presencia.m4a',            7,  'base', true),
  ('relajacion_profunda',  'Relajación profunda',      'Suelta el cuerpo capa por capa',        'meditacion',  1080, 'f', 'audio/relajacion_profunda.m4a',  8,  'base', true),
  ('perdon',               'Perdón',                   'Al otro y a ti',                        'meditacion',  600,  'f', 'audio/perdon.m4a',               9,  'pro',  true),
  ('amor_compasion',       'Amor y compasión',         'Bondad amorosa, versión ATP',           'meditacion',  600,  'f', 'audio/amor_compasion.m4a',       10, 'pro',  true),
  ('observacion_ecuanime', 'Observación ecuánime',     'Respiración y sensaciones, sin juicio', 'meditacion',  900,  'm', 'audio/observacion_ecuanime.m4a', 11, 'pro',  true)
ON CONFLICT (slug) DO NOTHING;
