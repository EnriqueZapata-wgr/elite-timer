-- 169_supabase_internal_cleanup_cron.sql
-- Cron auto-cleanup de tablas internas Supabase que acumulan sin límite.
-- Root cause del warning "exhausting resources" (2026-07-10, Cowork):
--   net._http_response      — logs HTTP outbound (edge functions, webhooks)
--   cron.job_run_details    — historial pg_cron (agenda-notifs corre cada minuto;
--                             llegó a 6,295 rows / 4 MB antes de la limpieza manual)
--
-- Frecuencia: semanal (domingo 9am UTC = 3am CDMX)
-- Retención: últimos 7 días para debugging
--
-- Idempotente: solo agenda el job si no existe ya (regla migraciones CLAUDE.md).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup_supabase_internal_weekly'
  ) THEN
    PERFORM cron.schedule(
      'cleanup_supabase_internal_weekly',
      '0 9 * * 0',  -- domingo 9am UTC
      $job$
        DELETE FROM net._http_response WHERE created <= NOW() - INTERVAL '7 days';
        DELETE FROM cron.job_run_details WHERE end_time <= NOW() - INTERVAL '7 days';
      $job$
    );
  END IF;
END $$;
