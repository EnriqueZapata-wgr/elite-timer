-- ============================================================
-- Migración 100 (#v13i CAPA B): Enriquecer protocol_templates +
-- soportar action_type/notify_minutes_before en el JSONB default_actions
-- + columna daily_plans.restrictions para el banner de prohibiciones.
--
-- Idempotente: WHERE NOT EXISTS (rutina nocturna), guardas ILIKE por
-- nombre (restrictions), ADD COLUMN IF NOT EXISTS.
--
-- ⚠️ Aplicar vía MCP execute_sql (NO apply_migration — bug wrapper de tracking).
-- ============================================================

-- Rutina nocturna faltante en "Protocolo energía y vitalidad" (Journal · Lentes rojos ·
-- Off-pantallas · Meditación). Solo si aún no tiene journal (idempotente).
UPDATE protocol_templates
SET default_actions = default_actions || jsonb_build_array(
  jsonb_build_object(
    'name', 'Journal · descarga del día',
    'phase', null,
    'category', 'mind',
    'default_time', '21:00',
    'duration_min', 10,
    'action_type', 'action',
    'notify_minutes_before', 10,
    'instructions', 'Escribe 3 gratitudes + 1 aprendizaje del día.',
    'chronotype_offsets', '{"bear":0,"lion":-60,"wolf":60,"dolphin":0}'::jsonb
  ),
  jsonb_build_object(
    'name', 'Lentes rojos · bloqueo luz azul',
    'phase', null,
    'category', 'optimization',
    'default_time', '21:15',
    'duration_min', 1,
    'action_type', 'action',
    'notify_minutes_before', 5,
    'instructions', 'Blockea luz azul 1h antes de dormir para no suprimir melatonina.',
    'chronotype_offsets', '{"bear":0,"lion":-60,"wolf":60,"dolphin":0}'::jsonb
  ),
  jsonb_build_object(
    'name', 'Off-pantallas · transición al sueño',
    'phase', null,
    'category', 'rest',
    'default_time', '21:30',
    'duration_min', 1,
    'action_type', 'action',
    'notify_minutes_before', 0,
    'instructions', 'Guarda el teléfono y las pantallas. 30 min de baja estimulación.',
    'chronotype_offsets', '{"bear":0,"lion":-60,"wolf":60,"dolphin":0}'::jsonb
  ),
  jsonb_build_object(
    'name', 'Meditación · 10 min',
    'phase', null,
    'category', 'mind',
    'default_time', '21:45',
    'duration_min', 10,
    'action_type', 'action',
    'notify_minutes_before', 5,
    'instructions', 'Meditación silenciosa o guiada. Baja el sistema nervioso simpático.',
    'chronotype_offsets', '{"bear":0,"lion":-60,"wolf":60,"dolphin":0}'::jsonb
  )
)
WHERE name = 'Protocolo energía y vitalidad'
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(default_actions) AS a
    WHERE a->>'name' ILIKE '%journal%'
  );

-- Marcar "Eliminar café" (y variantes) como restriction en TODAS las plantillas donde exista.
-- action_type='restriction' + default_time=null → el compiler la saca del timeline y va al banner.
UPDATE protocol_templates
SET default_actions = (
  SELECT jsonb_agg(
    CASE
      WHEN a->>'name' ILIKE '%eliminar caf%' OR a->>'name' ILIKE '%sin caf%' OR a->>'name' ILIKE '%no caf%'
      THEN a || '{"action_type":"restriction","default_time":null}'::jsonb
      ELSE a
    END
  )
  FROM jsonb_array_elements(default_actions) AS a
)
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(default_actions) AS a
  WHERE a->>'name' ILIKE '%eliminar caf%' OR a->>'name' ILIKE '%sin caf%' OR a->>'name' ILIKE '%no caf%'
);

-- Columna para persistir las prohibiciones del día (alimenta RestrictionsBanner).
ALTER TABLE daily_plans ADD COLUMN IF NOT EXISTS restrictions JSONB DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
