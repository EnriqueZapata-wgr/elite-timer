-- ============================================================================
-- 227 — MB-SEC-1 §1 · cerrar la superficie ANON en RPC SECURITY DEFINER.
--
-- Hallazgo advisor (2026-07-25): funciones SECURITY DEFINER ejecutables por
-- `anon` (sin sesión) vía /rest/v1/rpc/*. La causa: Supabase concede EXECUTE a
-- `anon` de forma EXPLÍCITA (default privileges del schema public), así que los
-- viejos `REVOKE ... FROM PUBLIC` (191, 178) NUNCA quitaron el grant explícito de
-- anon → el advisor las sigue marcando. El corte correcto es revocar de `anon`.
--
-- REGLA DE ORO (call sites verificados en el código antes de tocar):
--   · admin_list_reports/resolve/set_discoverable — app/admin (autenticado). YA
--     validan rol adentro (admin_users) y search_path fijo (191). Solo faltaba
--     el revoke de anon explícito.
--   · search_users / get_public_profile — comunidad (autenticado, post-login).
--   · invite_client_by_email — coach-service (autenticado).
--   · promote_argos_brain / publish_argos_brain — ops de ARGOS-BRAIN, SIN call
--     site en la app (se corren desde tooling con service_role). Ver FLAG abajo.
--   · get_dx_memory / save_dx_memory / elite_intake_guardar — clínicas, SIN call
--     site en la app; jamás deben ser anónimas.
--
-- Se revoca SOLO de `anon` (quirúrgico): NO se toca `authenticated` ni
-- `service_role`, así ningún flujo logueado ni edge function se rompe. El bloque
-- itera pg_proc por nombre → agnóstico de firma y de overloads (search_users
-- vive en 178 y 184), y salta las que no existan en el destino.
--
-- ⚠️ FLAG (queda pendiente, NO se hace a ciegas):
--   · promote/publish_argos_brain reciben `p_admin_key text` (secreto en el
--     parámetro, no control por rol). Endurecer con is_admin() ADENTRO exige su
--     cuerpo, que vive en el repo ARGOS-BRAIN, no aquí. Además NO se revoca de
--     `authenticated` sin confirmar antes que el tooling entra como service_role
--     (si entrara como admin autenticado, se rompería). Cowork/Enrique confirma
--     el caller y se cierra en un follow-up.
--   · get_dx_memory/save_dx_memory/elite_intake_guardar: se deja `authenticated`
--     intacto (no se pudo confirmar el caller exacto — probablemente el tooling
--     elite_dx). Evaluar restringir a service_role tras confirmar.
--
-- Idempotente (REVOKE de un grant inexistente es no-op). NO aplicar al remoto
-- desde este branch — Cowork audita y luego `npx supabase db push` (regla #12).
-- ============================================================================

DO $$
DECLARE
  r record;
  fn_names text[] := ARRAY[
    -- administración (ya gated adentro; falta el revoke de anon)
    'admin_list_reports', 'admin_resolve_report', 'admin_set_discoverable',
    -- ops del cerebro (secreto en parámetro — ver FLAG)
    'promote_argos_brain', 'publish_argos_brain',
    -- clínicas (jamás anónimas)
    'get_dx_memory', 'save_dx_memory', 'elite_intake_guardar',
    -- features autenticadas que colgaban de anon por el grant default de Supabase
    'invite_client_by_email', 'search_users', 'get_public_profile'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND p.proname = ANY (fn_names)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
    RAISE NOTICE 'MB-SEC-1: REVOKE EXECUTE FROM anon → %', r.sig;
  END LOOP;
END $$;
