-- ============================================================================
-- 156 — PRIVACY CRONS (#132 Fase B) — overnight sprint 2026-07-06.
-- Rango Fable 150-199.
--
-- 2 pg_cron jobs (patrón Vault de la 099: service_role_key desde
-- vault.decrypted_secrets, sin plaintext en cron.job):
--   - data-exports-processor: cada 5 min → data-export-generator
--   - account-deletion-processor: cada 6 horas → account-deletion-processor
--
-- Prerequisitos: pg_cron + pg_net habilitados, secret 'service_role_key'
-- en Vault (ya cargado desde la 099), edge functions deployadas.
-- ⚠️ Aplicar vía MCP execute_sql, NO vía apply_migration.
-- Idempotente (unschedule si existe).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── data-exports-processor: cada 5 minutos ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'data-exports-processor') THEN
    PERFORM cron.unschedule('data-exports-processor');
  END IF;
END $$;

SELECT cron.schedule(
  'data-exports-processor',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://itqkfozqvpwikogggqng.supabase.co/functions/v1/data-export-generator',
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

-- ── account-deletion-processor: cada 6 horas ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'account-deletion-processor') THEN
    PERFORM cron.unschedule('account-deletion-processor');
  END IF;
END $$;

SELECT cron.schedule(
  'account-deletion-processor',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://itqkfozqvpwikogggqng.supabase.co/functions/v1/account-deletion-processor',
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
