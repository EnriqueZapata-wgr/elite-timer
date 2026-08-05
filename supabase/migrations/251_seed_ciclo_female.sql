-- 251 · MB-22.1 Pieza 3 — las usuarias existentes conservan Ciclo.
--
-- Decisión de Enrique: Ciclo entra al set inicial cuando biological_sex es
-- female, en modo propio. Antes de MB-22 toda usuaria veía Ciclo en la sala
-- (femaleOnly); sin esta siembra lo perdería con el OTA.
--
-- Corre DESPUÉS de la 250 (todas las cuentas existentes ya tienen fila).
-- Idempotente: @> salta a quien ya lo tiene. El modo propio ya lo dejó la
-- 249; se reafirma aquí con ON CONFLICT DO NOTHING por si una usuaria se
-- creó entre ambas migraciones. NUNCA pisa un modo elegido.

UPDATE user_day_preferences p
SET installed_apps = COALESCE(p.installed_apps, '{}') || ARRAY['ciclo'],
    updated_at = NOW()
FROM client_profiles c
WHERE c.user_id = p.user_id
  AND c.biological_sex = 'female'
  AND NOT (COALESCE(p.installed_apps, '{}') @> ARRAY['ciclo']);

INSERT INTO user_app_modes (user_id, app_key, mode)
SELECT user_id, 'ciclo', 'propio'
FROM client_profiles
WHERE biological_sex = 'female'
ON CONFLICT (user_id, app_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
