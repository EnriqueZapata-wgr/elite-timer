-- ============================================================
-- Migración 099: pg_cron que invoca dispatch-agenda-notifications cada minuto (#v13g F6)
-- ============================================================
-- ⚠️ NO APLICADA AUTOMÁTICAMENTE (Sprint G2). Requiere:
--   1) Habilitar pg_cron (Dashboard → Database → Extensions → pg_cron, o como admin abajo).
--      pg_net (0.20.0) ya está disponible en el proyecto.
--   2) Deployar la Edge Function: `supabase functions deploy dispatch-agenda-notifications`
--   3) Reemplazar <SERVICE_ROLE_KEY> por el service role real ANTES de ejecutar.
--      Recomendado: guardarlo en Supabase Vault y leerlo con vault.decrypted_secrets
--      en vez de embeberlo en el comando del cron.
--   Ejecutar vía MCP execute_sql (Cowork) o SQL Editor con rol admin.

-- 1) Extensión (idempotente; requiere rol con privilegios — supabase_admin / postgres).
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2) Re-crear el job de forma idempotente (unschedule si ya existe).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-agenda-notifications-minutely') THEN
    PERFORM cron.unschedule('dispatch-agenda-notifications-minutely');
  END IF;
END $$;

SELECT cron.schedule(
  'dispatch-agenda-notifications-minutely',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://itqkfozqvpwikogggqng.supabase.co/functions/v1/dispatch-agenda-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
