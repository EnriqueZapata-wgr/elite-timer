-- 214: Seed batch 2 del catálogo de audio Mente (reproducibilidad).
-- Estas 19 filas se insertaron por MCP el 2026-07-23 y NO vivían en migración:
-- un entorno nuevo no las reproducía. Valores capturados con SELECT del estado
-- vivo de audio_pieces (proyecto ELITE-APP-FULLDB) el 2026-07-23.
-- En el proyecto actual es NO-OP (ON CONFLICT DO NOTHING); reproduce en fresh.
-- Las categorías van como estaban al capturar (todas meditacion salvo
-- sueno_induccion=descanso); la 215 recategoriza mantras y visualizaciones.
-- Idempotente.

INSERT INTO public.audio_pieces
  (slug, titulo, subtitulo, categoria, duracion_seg, voz, storage_path, imagen_path, orden, tier, publicado)
VALUES
  ('mindfulness_base',                'Atención plena',                'Atención plena, paso a paso',      'meditacion', 600,  'm', 'audio/mindfulness_base.m4a',                'covers/mindfulness_base.jpg',                12, 'base', true),
  ('estres_descarga',                 'Descarga de estrés',            'Baja una marcha',                  'meditacion', 600,  'f', 'audio/estres_descarga.m4a',                 'covers/estres_descarga.jpg',                 13, 'base', true),
  ('ansiedad_gestion',                'Acompañar la ansiedad',         'Hazle espacio, no la pelees',      'meditacion', 600,  'f', 'audio/ansiedad_gestion.m4a',                'covers/ansiedad_gestion.jpg',                14, 'base', true),
  ('enfoque_laser',                   'Enfoque láser',                 'Afila la atención antes de entrarle', 'meditacion', 360, 'm', 'audio/enfoque_laser.m4a',                'covers/enfoque_laser.jpg',                   15, 'base', true),
  ('visualizacion_dia_ideal',         'Visualiza tu día ideal',        'Diseña tu día antes de vivirlo',   'meditacion', 600,  'f', 'audio/visualizacion_dia_ideal.m4a',         'covers/visualizacion_dia_ideal.jpg',         16, 'base', true),
  ('vision_de_futuro',                'Visión de futuro',              'Visita a la persona que serás',    'meditacion', 600,  'm', 'audio/vision_de_futuro.m4a',                'covers/vision_de_futuro.jpg',                17, 'base', true),
  ('visualizacion_creativa',          'Visualización de tu meta',      'Cree en la meta y traza la ruta',  'meditacion', 900,  'm', 'audio/visualizacion_creativa.m4a',          'covers/visualizacion_creativa.jpg',          18, 'base', true),
  ('woop',                            'WOOP',                          'Deseo, resultado, obstáculo, plan', 'meditacion', 600, 'f', 'audio/woop.m4a',                            'covers/woop.jpg',                            19, 'base', true),
  ('perdon_profundo',                 'Perdón profundo',               'Suelta el peso que cargas',        'meditacion', 900,  'm', 'audio/perdon_profundo.m4a',                 'covers/perdon_profundo.jpg',                 20, 'base', true),
  ('mantra_amor_fati',                'Amor Fati',                     'Amar lo que es',                   'meditacion', 240,  'm', 'audio/mantra_amor_fati.m4a',                'covers/mantra_amor_fati.jpg',                21, 'base', true),
  ('mantra_esto_tambien_pasara',      'Esto también pasará',           'Nada se queda fijo',               'meditacion', 240,  'm', 'audio/mantra_esto_tambien_pasara.m4a',      'covers/mantra_esto_tambien_pasara.jpg',      22, 'base', true),
  ('mantra_como_si_siguiente_paso',   '¿Cómo sí y el siguiente paso?', 'De la traba a la acción',          'meditacion', 240,  'm', 'audio/mantra_como_si_siguiente_paso.m4a',   'covers/mantra_como_si_siguiente_paso.jpg',   23, 'base', true),
  ('mantra_go_for_the_win',           'Go for the W.I.N.',             'Lo importante ahora',              'meditacion', 180,  'm', 'audio/mantra_go_for_the_win.m4a',           'covers/mantra_go_for_the_win.jpg',           24, 'base', true),
  ('mantra_bring_it_on',              'Bring it on',                   'Recíbelo de frente',               'meditacion', 180,  'm', 'audio/mantra_bring_it_on.m4a',              'covers/mantra_bring_it_on.jpg',              25, 'base', true),
  ('mantra_mi_mejor_yo',              '¿Qué haría mi mejor yo?',       'El filtro de tu mejor versión',    'meditacion', 240,  'f', 'audio/mantra_mi_mejor_yo.m4a',              'covers/mantra_mi_mejor_yo.jpg',              26, 'base', true),
  ('mantra_ser_mejor_no_tener_razon', 'Ser mejor, no tener razón',     'Suelta el ego, crece',             'meditacion', 240,  'm', 'audio/mantra_ser_mejor_no_tener_razon.m4a', 'covers/mantra_ser_mejor_no_tener_razon.jpg', 27, 'base', true),
  ('mantra_presente_perfecto',        'El presente es perfecto',       'Este momento basta',               'meditacion', 240,  'f', 'audio/mantra_presente_perfecto.m4a',        'covers/mantra_presente_perfecto.jpg',        28, 'base', true),
  ('mantra_amante_del_proceso',       'Amante del proceso',            'Quiere el camino, no solo la meta', 'meditacion', 240, 'm', 'audio/mantra_amante_del_proceso.m4a',       'covers/mantra_amante_del_proceso.jpg',       29, 'base', true),
  ('sueno_induccion',                 'Meditación para dormir',        'La voz se disuelve mientras duermes', 'descanso', 1200, 'f', 'audio/sueno_induccion.m4a',                'covers/sueno_induccion.jpg',                 30, 'base', true),
  ('navegar_ataque_panico',           'Navegar un ataque de pánico',   'Te acompaña a respirar hasta que baje', 'meditacion', 300, 'f', 'audio/navegar_ataque_panico.m4a',          'covers/navegar_ataque_panico.jpg',           31, 'base', true)
ON CONFLICT (slug) DO NOTHING;
