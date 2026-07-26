-- ============================================================================
-- 228 — MB-SEC-1 §3 · fijar search_path en las 25 funciones que lo tienen mutable.
--
-- Hallazgo advisor: search_path mutable + SECURITY DEFINER habilita search_path
-- hijacking con privilegios del owner. Las migraciones nuevas (220-226) ya traen
-- `SET search_path = public`; esto es deuda de las viejas.
--
-- `SET search_path = public` NO cambia la lógica (todas resuelven objetos de
-- public; pg_catalog sigue implícito primero). El bloque itera pg_proc por
-- nombre en el schema public → cubre overloads y salta las que no existan.
--
-- Idempotente (fijar el mismo search_path de nuevo es no-op).
-- ⚠️ NO aplicar al remoto desde este branch — Cowork audita, luego db push.
-- ============================================================================

DO $$
DECLARE
  r record;
  fn_names text[] := ARRAY[
    'generate_coach_code', 'get_today_routines', 'increment_argos_usage',
    'create_routine_share', 'clone_from_share', 'connect_to_coach',
    'assign_routine_to_client', 'touch_affiliate_updated_at',
    'affiliate_status_change_wallet_bootstrap', 'generate_affiliate_code',
    'get_today_timeline', 'toggle_protocol_completion',
    'touch_user_notification_prefs_updated_at', 'invite_client_by_email',
    'has_active_pro_boost', 'update_updated_at', 'get_current_user_role',
    'is_admin', 'get_routine_tree', 'calc_block_duration', 'calc_routine_duration',
    'clone_routine', 'calc_estimated_1rm', 'update_personal_record',
    'touch_user_consent_updated_at'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (fn_names)
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
    RAISE NOTICE 'MB-SEC-1: SET search_path=public → %', r.sig;
  END LOOP;
END $$;
