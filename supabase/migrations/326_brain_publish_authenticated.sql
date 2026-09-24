-- ============================================================================
-- 326 — El tooling del cerebro ARGOS vuelve a poder publicar: EXECUTE para
--       `authenticated` en publish_argos_brain y promote_argos_brain.
--
-- QUE PASO (24-sep-2026, reproducido en produccion):
--   `node build/publish-brain.mjs` (repo ARGOS-BRAIN) devuelve
--   401 {"code":"42501","message":"permission denied for function publish_argos_brain"}
--
-- POR QUE:
--   · 001_argos_brain.sql (ARGOS-BRAIN, aplicado el 21-jul) creo las dos
--     funciones SECURITY DEFINER con el candado ADENTRO (exigen `admin_key`,
--     64 hex, guardada en public.argos_config) y dio EXECUTE solo a `anon`,
--     porque el tooling llama a PostgREST con la llave publishable.
--   · 227_sec_revoke_anon_rpc.sql (25-jul) revoco EXECUTE de `anon` en las dos,
--     bajo el supuesto escrito de que "se corren desde tooling con
--     service_role". Ese supuesto era falso. La propia 227 dejo el FLAG:
--     "NO se revoca de `authenticated` sin confirmar antes que el tooling entra
--     como service_role (si entrara como admin autenticado, se rompería).
--     Cowork/Enrique confirma el caller y se cierra en un follow-up."
--   · Caller confirmado (24-sep-2026): `build/publish-brain.mjs` y
--     `build/promote-brain.mjs`, desde la maquina del dueno, con llave
--     publishable + admin_key. Nunca service_role. Este es ese follow-up.
--
-- QUE HACE ESTA MIGRACION:
--   Concede EXECUTE a `authenticated` (no a `anon`). Desde hoy publicar exige
--   DOS cosas: una sesion iniciada (JWT de Supabase Auth, 1 hora) y la
--   admin_key. Es mas estricto que el diseno original de la 001 (que solo
--   pedia la admin_key) y mas util que el estado actual (nadie puede publicar
--   salvo service_role, que la doctrina del cerebro prohibe usar).
--
--   `anon` SIGUE SIN PODER publicar ni promover: la 227 se respeta donde
--   importaba, que era cerrar la superficie anonima.
--
-- QUE NO TOCA:
--   · get_argos_brain (lectura del cerebro): la 227 nunca la revoco y sigue en
--     `anon` + read_key. Es lo que leen argos-proxy y el coach en vivo.
--   · Las tablas argos_brain y argos_config: privadas, RLS sin politicas,
--     revocadas de anon y authenticated. Un usuario autenticado NO puede leer
--     ni escribir el cerebro por fuera de estas funciones.
--   · Ninguna otra funcion de la lista de la 227.
--
-- ALCANCE REAL DE `authenticated`, DICHO SIN ADORNO: es CUALQUIER cuenta de la
-- app, y el alta es abierta (auth-context.tsx llama a signUp sin codigo de
-- invitacion). O sea, el listado de quien podria publicar pasa de "todo
-- internet" a "cualquiera que se registre", no a "un admin". Lo que de verdad
-- guarda la puerta sigue siendo la admin_key; la sesion agrega un rastro
-- atribuible en auth.users. Sin la admin_key, un JWT filtrado no publica nada
-- (la funcion devuelve 'unauthorized'). Rotar la admin_key no necesita
-- redeploy: ver build/STORE_RUNBOOK.md en ARGOS-BRAIN.
--
-- DEUDA VIVA (el FLAG de la 227 NO queda cerrado con esto): el control sigue
-- siendo por secreto en un parametro, no por rol. Endurecerlo de verdad es
-- meter un chequeo de admin ADENTRO del cuerpo de las dos funciones
-- (is_admin() o profiles.role), lo que exige reescribirlas; el cuerpo de
-- publish_argos_brain vive en ARGOS-BRAIN/build/sql/001_argos_brain.sql y el de
-- promote_argos_brain no esta en ningun repo (hay que extraerlo de la base con
-- pg_get_functiondef y archivarlo antes de tocarlo). Queda anotado, con fecha.
--
-- Idempotente y agnostica de firma: itera pg_proc por nombre, igual que la 227,
-- y salta lo que no exista.
-- ============================================================================

DO $$
DECLARE
  r record;
  fn_names text[] := ARRAY['publish_argos_brain', 'promote_argos_brain'];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (fn_names)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    RAISE NOTICE '326: EXECUTE → authenticated (anon sigue revocado) → %', r.sig;
  END LOOP;
END $$;

-- Verificacion (correr a mano despues del push; debe listar authenticated y NO anon):
--   select p.oid::regprocedure as funcion, r.rolname, has_function_privilege(r.rolname, p.oid, 'execute') as puede
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   cross join (select unnest(array['anon','authenticated']) as rolname) r
--   where n.nspname = 'public'
--     and p.proname in ('publish_argos_brain','promote_argos_brain')
--   order by 1, 2;
