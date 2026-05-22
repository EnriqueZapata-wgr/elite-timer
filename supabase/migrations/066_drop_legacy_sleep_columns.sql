-- 066 — Eliminar columnas de sueño legacy en client_profiles
--
-- Estas 4 columnas fueron creadas en la migración 007 pero ningún
-- archivo en src/ las escribe. El único lector (atp-ai-service.ts
-- línea 115) acaba de migrarse a user_chronotype.schedule.
--
-- NOTA: client_profiles.sleep_quality es DISTINTA de
-- health_measurements.sleep_quality y cycle_daily_logs.sleep_quality
-- (esas dos SÍ tienen escritores y no se tocan).

ALTER TABLE client_profiles DROP COLUMN IF EXISTS sleep_time_usual;
ALTER TABLE client_profiles DROP COLUMN IF EXISTS wake_time_usual;
ALTER TABLE client_profiles DROP COLUMN IF EXISTS sleep_hours_avg;
ALTER TABLE client_profiles DROP COLUMN IF EXISTS sleep_quality;
