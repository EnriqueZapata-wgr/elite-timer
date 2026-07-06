-- ============================================================
-- Migración 099: pg_cron que invoca dispatch-agenda-notifications cada minuto (#v13g F6)
-- ============================================================
-- Aplicada al remoto 2026-07-01 por Fable 5 CC via MCP execute_sql.
-- Variante Vault (recomendada por Fable): el service_role_key NO se embebe
-- en cron.job (evita plaintext en el catálogo de cron). Se lee en runtime
-- desde vault.decrypted_secrets bajo el nombre 'service_role_key'.
-- Rotación del key = actualizar el secret de Vault; el cron no cambia.
--
-- Prerequisitos (aplicar ANTES si no está listo):
--   1) Extensión pg_cron habilitada (`CREATE EXTENSION IF NOT EXISTS pg_cron;`)
--   2) Extensión pg_net (>= 0.20.0) disponible (default en Supabase reciente)
--   3) Secret 'service_role_key' cargado en Supabase Vault. Cargar así:
--      SELECT vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
--      (una sola vez desde el CLI o Dashboard admin, no vía repo)
--   4) Edge Function 'dispatch-agenda-notifications' deployada.
--
-- ⚠️ Aplicar vía MCP execute_sql, NO vía apply_migration (bug wrapper de tracking).

-- 1) Extensión (idempotente; requiere rol con privilegios — supabase_admin / postgres).
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2) Re-crear el job de forma idempotente (unschedule si ya existe).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-agenda-notifications-minutely') THEN
    PERFORM cron.unschedule('dispatch-agenda-notifications-minutely');
  END IF;
END $$;

-- 3) Schedule: cada minuto, invoca la Edge Function con el service role leído de Vault.
SELECT cron.schedule(
  'dispatch-agenda-notifications-minutely',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://itqkfozqvpwikogggqng.supabase.co/functions/v1/dispatch-agenda-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
