-- ============================================================
-- Migración 151 (AGENDA-COMPLETE F4): extender el enriquecimiento de la
-- migración 100 (que solo tocó "Protocolo energía y vitalidad") a TODAS
-- las plantillas: prohibiciones → restriction, rutina nocturna faltante,
-- notify_minutes_before default por categoría.
--
-- Idempotente: WHERE EXISTS/NOT EXISTS por plantilla; re-aplicar es no-op.
-- Los WHERE EXISTS también protegen contra jsonb_agg(NULL) en arrays vacíos.
-- Rango 150-199 (Fable). ⚠️ Aplicar vía MCP execute_sql.
-- ============================================================

-- 1) Prohibiciones como restriction en TODAS las plantillas (mismo criterio que
--    la 100 pero con patrones ampliados: eliminar/evitar/sin-no alcohol/procesados/café).
--    action_type='restriction' + default_time=null → compiler las saca del timeline → banner.
UPDATE protocol_templates
SET default_actions = (
  SELECT jsonb_agg(
    CASE
      WHEN a->>'name' ILIKE '%eliminar%' OR a->>'name' ILIKE '%sin alcohol%'
        OR a->>'name' ILIKE '%no alcohol%' OR a->>'name' ILIKE '%no proces%'
        OR a->>'name' ILIKE '%no caf%' OR a->>'name' ILIKE '%sin caf%'
        OR a->>'name' ILIKE '%evitar%'
      THEN a || '{"action_type":"restriction","default_time":null}'::jsonb
      ELSE a
    END
  )
  FROM jsonb_array_elements(default_actions) AS a
)
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(default_actions) AS a
  WHERE (a->>'name' ILIKE '%eliminar%' OR a->>'name' ILIKE '%sin alcohol%'
    OR a->>'name' ILIKE '%no alcohol%' OR a->>'name' ILIKE '%no proces%'
    OR a->>'name' ILIKE '%no caf%' OR a->>'name' ILIKE '%sin caf%'
    OR a->>'name' ILIKE '%evitar%')
    AND coalesce(a->>'action_type', 'action') <> 'restriction'
);

-- 2) Rutina nocturna (Journal · Lentes rojos · Off-pantallas · Meditación) en las
--    plantillas que NO tengan journal/meditación nocturna (>= 20:00). Mismo bloque
--    que la 100 usó para "energía y vitalidad".
WITH templates_sin_nocturna AS (
  SELECT id FROM protocol_templates pt
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(pt.default_actions) AS a
    WHERE coalesce(a->>'default_time', '') <> ''
      AND (a->>'default_time')::time >= '20:00'::time
      AND (a->>'name' ILIKE '%journal%' OR a->>'name' ILIKE '%medita%')
  )
)
UPDATE protocol_templates
SET default_actions = default_actions || jsonb_build_array(
  jsonb_build_object(
    'name', 'Journal · descarga del día', 'phase', null, 'category', 'mind',
    'default_time', '21:00', 'duration_min', 10, 'action_type', 'action',
    'notify_minutes_before', 10,
    'instructions', 'Escribe 3 gratitudes + 1 aprendizaje del día.',
    'chronotype_offsets', '{"bear":0,"lion":-60,"wolf":60,"dolphin":0}'::jsonb
  ),
  jsonb_build_object(
    'name', 'Lentes rojos · bloqueo luz azul', 'phase', null, 'category', 'optimization',
    'default_time', '21:15', 'duration_min', 1, 'action_type', 'action',
    'notify_minutes_before', 5,
    'instructions', 'Blockea luz azul 1h antes de dormir para no suprimir melatonina.',
    'chronotype_offsets', '{"bear":0,"lion":-60,"wolf":60,"dolphin":0}'::jsonb
  ),
  jsonb_build_object(
    'name', 'Off-pantallas · transición al sueño', 'phase', null, 'category', 'rest',
    'default_time', '21:30', 'duration_min', 1, 'action_type', 'action',
    'notify_minutes_before', 0,
    'instructions', 'Guarda el teléfono y las pantallas. 30 min de baja estimulación.',
    'chronotype_offsets', '{"bear":0,"lion":-60,"wolf":60,"dolphin":0}'::jsonb
  ),
  jsonb_build_object(
    'name', 'Meditación · 10 min', 'phase', null, 'category', 'mind',
    'default_time', '21:45', 'duration_min', 10, 'action_type', 'action',
    'notify_minutes_before', 5,
    'instructions', 'Meditación silenciosa o guiada. Baja el sistema nervioso simpático.',
    'chronotype_offsets', '{"bear":0,"lion":-60,"wolf":60,"dolphin":0}'::jsonb
  )
)
WHERE id IN (SELECT id FROM templates_sin_nocturna);

-- 3) notify_minutes_before default por categoría para acciones que no lo tengan.
UPDATE protocol_templates
SET default_actions = (
  SELECT jsonb_agg(
    CASE
      WHEN a->>'notify_minutes_before' IS NULL AND coalesce(a->>'action_type', 'action') = 'action'
      THEN a || jsonb_build_object('notify_minutes_before',
        CASE
          WHEN a->>'category' = 'nutrition' AND a->>'name' NOT ILIKE '%supplement%' THEN 15
          WHEN a->>'category' = 'fitness' THEN 30
          WHEN a->>'category' = 'rest' AND a->>'name' ILIKE '%dormir%' THEN 30
          WHEN a->>'category' = 'optimization' AND a->>'name' ILIKE '%supp%' THEN 5
          ELSE 5
        END
      )
      ELSE a
    END
  )
  FROM jsonb_array_elements(default_actions) AS a
)
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(default_actions) AS a
  WHERE a->>'notify_minutes_before' IS NULL AND coalesce(a->>'action_type', 'action') = 'action'
);
