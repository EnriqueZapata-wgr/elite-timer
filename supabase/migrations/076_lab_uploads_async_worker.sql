-- 076_lab_uploads_async_worker.sql
-- Capa 9 (worker async): cuando un lab_uploads entra en 'pending', un trigger llama vía pg_net
-- a la Edge Function `lab-parser-worker`, que procesa el archivo EN BACKGROUND (sin el cap de 60s
-- del request) con EdgeRuntime.waitUntil. El cliente ya NO espera al LLM: escucha Realtime.
--
-- ⚠️ NO EJECUTAR AUTOMÁTICAMENTE. Enrique la corre manual en Supabase SQL Editor (regla #12).
--    ORDEN IMPORTA: primero deployar la Edge Function `lab-parser-worker`, LUEGO correr esta
--    migración. Mientras no se corra, el cliente cae al flujo síncrono actual (flag apagado).
--    Idempotente (IF EXISTS / OR REPLACE / DROP TRIGGER IF EXISTS).

-- ── 1. Ampliar el enum de status ──────────────────────────────────────────────
-- El flujo async agrega 'pending' (cola → dispara worker). 'confirmed'/'cancelled' se incluyen
-- para forward-compat con los chequeos defensivos del worker; el flujo actual no los escribe.
ALTER TABLE lab_uploads DROP CONSTRAINT IF EXISTS lab_uploads_status_check;
ALTER TABLE lab_uploads ADD CONSTRAINT lab_uploads_status_check
  CHECK (status IN ('uploaded', 'pending', 'processing', 'extracted', 'failed', 'confirmed', 'cancelled'));

-- ── 2. Extensión pg_net (HTTP desde Postgres) ────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── 3. Función que llama al worker vía pg_net ────────────────────────────────
-- 2026-06-18: reescrita sin GUCs. URL hardcoded del proyecto (pública en Edge Functions),
-- y SIN Authorization header porque el Edge Function `lab-parser-worker` tiene
-- verify_jwt: false. Esto evita exponer service_role_key vía GUCs en la DB y
-- simplifica el setup: la migración funciona apenas se aplica, sin pasos extra.
CREATE OR REPLACE FUNCTION trigger_lab_parser_worker()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://itqkfozqvpwikogggqng.supabase.co/functions/v1/lab-parser-worker',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object('uploadId', NEW.id),
    timeout_milliseconds := 5000  -- solo encolar; el worker responde 202 al instante
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Si el dispatch falla, no rompe el INSERT/UPDATE. Solo loguea WARNING.
  RAISE WARNING 'trigger_lab_parser_worker dispatch fallido para upload %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ── 5. Trigger: dispara solo al ENTRAR en 'pending' ──────────────────────────
-- AFTER para no bloquear la escritura. WHEN evita disparos en cada update posterior.
DROP TRIGGER IF EXISTS on_lab_upload_pending ON lab_uploads;
CREATE TRIGGER on_lab_upload_pending
  AFTER INSERT OR UPDATE OF status ON lab_uploads
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION trigger_lab_parser_worker();
