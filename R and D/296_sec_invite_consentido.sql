-- 296_sec_invite_consentido.sql
-- Cierre de la regresión de permisos detectada el 18 de agosto de 2026.
--
-- QUÉ CIERRA
--   1. `invite_client_by_email` volvió a quedar ejecutable por `anon` después de
--      que la migración 227 la revocó. Con la llave anónima (que viaja en el
--      paquete de la app) cualquiera podía crear un vínculo coach-cliente en
--      estado 'active' contra el correo de otra persona, y ese vínculo es el que
--      44 políticas de seguridad por renglón usan para dar acceso a datos de
--      salud (21 de ellas para lectura Y escritura).
--   2. La función tomaba el coach del PARÁMETRO y no del token, así que ni
--      siquiera un llamador autenticado estaba obligado a ser quien decía.
--   3. `increment_argos_usage` quedó abierta a `anon` sin ninguna verificación.
--      Impacto menor (ese contador ya solo mide, quien corta es
--      consume_argos_spend, que sí está cerrada), pero es superficie sin uso.
--
-- POR QUÉ SE REABRIÓ SOLA
--   En Supabase, un `CREATE OR REPLACE FUNCTION` restablece los permisos por
--   defecto, y el default concede EXECUTE a `anon` y `authenticated`. Por eso el
--   REVOKE de la 227 se perdió con una edición posterior, en silencio, mientras
--   el guard estático de `mbsec1-superficie.test.ts` seguía en verde porque lee
--   el archivo de migración y no la base.
--   ⚠️ POR ESO EL ORDEN DE ESTA MIGRACIÓN IMPORTA: primero CREATE OR REPLACE,
--      después REVOKE. Al revés, el REVOKE se pierde otra vez.
--
-- QUÉ **NO** CIERRA, A PROPÓSITO
--   El vínculo sigue naciendo en 'active' sin que el invitado acepte. Eso es una
--   decisión de diseño de la migración 008 y cambiarla toca el panel de coach a
--   14 días del lanzamiento. Queda agendado para la primera semana de septiembre:
--   nacer en 'pending' y que `connect_to_coach` (que sí exige código entregado
--   por el coach) sea el único camino a 'active'.
--
-- Idempotente. Aplicar con `npx supabase db push`.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) El coach sale del token, no del parámetro.
--    Se conserva TODO el resto del comportamiento de 008, incluida la creación
--    del perfil placeholder cuando el correo todavía no tiene cuenta (la 198
--    depende de eso para vincular al registrarse).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.invite_client_by_email(p_coach_id UUID, p_email TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DECLARE
    v_client_id UUID;
    v_client_name TEXT;
    v_is_new BOOLEAN := false;
    v_caller UUID := auth.uid();
  BEGIN
    -- SEG-2 (2026-08-18): sin token no hay invitación. Con la llave anónima
    -- auth.uid() es NULL, así que esto corta la ruta anónima aunque alguien
    -- vuelva a conceder EXECUTE por accidente.
    IF v_caller IS NULL THEN
      RAISE EXCEPTION 'Se requiere sesión iniciada';
    END IF;

    -- SEG-2: el coach se DERIVA del token. El parámetro se conserva en la firma
    -- para no romper al llamador (coach-service.ts), pero tiene que coincidir.
    IF p_coach_id IS DISTINCT FROM v_caller THEN
      RAISE EXCEPTION 'No puedes invitar a nombre de otro coach';
    END IF;

    p_email := lower(trim(p_email));

    SELECT id, full_name INTO v_client_id, v_client_name
    FROM profiles WHERE email = p_email;

    IF v_client_id IS NULL THEN
      v_client_id := gen_random_uuid();
      v_is_new := true;
      INSERT INTO profiles (id, email, full_name)
      VALUES (v_client_id, p_email, NULL);
      v_client_name := NULL;
    END IF;

    IF v_client_id = p_coach_id THEN
      RAISE EXCEPTION 'No puedes agregarte como cliente';
    END IF;

    INSERT INTO coach_clients (coach_id, client_id, status)
    VALUES (p_coach_id, v_client_id, 'active')
    ON CONFLICT (coach_id, client_id)
    DO UPDATE SET status = 'active', connected_at = now();

    INSERT INTO client_profiles (user_id)
    VALUES (v_client_id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN json_build_object(
      'client_id', v_client_id,
      'email', p_email,
      'name', v_client_name,
      'is_new', v_is_new
    );
  END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Los REVOKE van DESPUÉS del CREATE OR REPLACE. Ver nota de arriba.
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.invite_client_by_email(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.invite_client_by_email(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.invite_client_by_email(UUID, TEXT) TO authenticated;

-- `increment_argos_usage` solo la llama el proxy, con service_role. Nadie más.
REVOKE EXECUTE ON FUNCTION public.increment_argos_usage(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_argos_usage(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_argos_usage(UUID) FROM PUBLIC;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN. Correr después del push. Las dos filas deben decir false en
-- anon. Si alguna dice true, el push no aplicó o algo volvió a conceder.
-- ─────────────────────────────────────────────────────────────────────────────
-- select p.proname,
--        has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_exec,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('invite_client_by_email', 'increment_argos_usage');
