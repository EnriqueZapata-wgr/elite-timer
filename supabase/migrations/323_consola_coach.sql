-- 323_consola_coach.sql
--
-- La consola de Enrique (/consola), 8 de septiembre de 2026.
--
-- ⚠️ NO EJECUTADA. Se entrega escrita para que la aplique el dueño con
--    `npx supabase db push`. Idempotente: correrla dos veces no cambia nada.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- QUÉ ES LA CONSOLA Y POR QUÉ TOCA LA BASE
-- ─────────────────────────────────────────────────────────────────────────────
-- La consola es la pantalla donde Enrique ve, de sus clientes: cuándo dejaron
-- la última señal en la app, cuánto están haciendo de lo que él les puso, qué
-- subieron de nuevo y a quién le toca hablarle hoy.
--
-- El candado NO se inventa aquí. Ya existe desde la migración 008 y lo usan más
-- de treinta políticas: un coach puede leer los datos de una persona SOLO si
-- hay una fila ACTIVA en `coach_clients` con `coach_id = auth.uid()` y
-- `client_id` = esa persona. Esta migración hace tres cosas y ninguna más:
--
--   1. Extiende ESE MISMO candado a las siete tablas que la consola necesita
--      leer y que hoy no lo tienen. Solo SELECT. Ninguna escritura.
--   2. Cierra un agujero real en `coach_clients` que la consola destaparía:
--      hoy cualquier persona autenticada puede INSERTAR una fila diciendo que
--      es coach de un desconocido, y con eso leer sus laboratorios, sus
--      síntomas y su mapa funcional. Ver sección 2.
--   3. Cierra la cadena que hacía inútil al candado de admin: hoy cualquiera
--      puede ponerse `profiles.role = 'admin'` con una sola consulta, y con eso
--      pasar cualquier política que use `is_admin()`. Ver sección 3.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- LO QUE ESTA MIGRACIÓN **NO** HACE, A PROPÓSITO
-- ─────────────────────────────────────────────────────────────────────────────
--   · NO crea una política de "el admin lo ve todo". Un admin que lee a todos
--     es un candado que no se puede auditar: al día siguiente nadie sabe a quién
--     miró. El vínculo explícito por cliente sí deja rastro y sí se puede
--     revocar cliente por cliente.
--   · NO toca `profiles`. Su política de lectura es `USING (true)`: hoy
--     CUALQUIER usuario autenticado puede leer nombre, correo y nivel de todos.
--     Eso es un problema y no es de esta migración: varias pantallas de
--     comunidad dependen de esa lectura, y cerrarla sin revisarlas rompería la
--     app. Queda anotado en el informe como pendiente aparte.
--   · NO cambia que el vínculo nazca en 'active' sin que el cliente acepte.
--     Es la deuda que la migración 306 dejó agendada y sigue abierta; cambiarla
--     toca el panel de coach y no es decisión de esta pieza.
--   · NO da acceso a nada de Mariana. Ella no es cliente de Enrique: no hay
--     fila suya en `coach_clients` con `coach_id` = él, así que ninguna de
--     estas políticas le abre un solo renglón. La app además la excluye por
--     nombre en `consola-core.ts` (segundo candado, con motivo escrito).
--
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═════════════════════════════════════════════════════════════════════════════
-- 1) LECTURA DE COACH EN LAS SIETE TABLAS QUE LE FALTAN
--
--    Misma forma exacta que las políticas ya vivas (008 en adelante): EXISTS
--    contra `coach_clients` activo. Solo SELECT: la consola no escribe en
--    ninguna de estas tablas y no debe poder.
--
--    Para qué sirve cada una en la pantalla:
--      electron_logs, daily_electrons  → los electrones del día. Señal de vida
--                                        y de que el hábito se está haciendo.
--      supplement_logs                 → cada toma registrada de suplemento.
--                                        Es la señal de adherencia más densa.
--      mind_sessions                   → meditación y respiración hechas.
--      argos_daily_usage               → un renglón por día que habló con
--                                        ARGOS. Solo se lee la FECHA (nunca el
--                                        contenido de la conversación, que vive
--                                        en argos_conversations y sigue cerrada).
--      user_master_quiz                → si contestó el cuestionario y cuáles
--                                        son sus objetivos declarados (B.1).
--      user_prescribed_interventions   → qué le prescribió el motor, para poder
--                                        comparar contra lo que sí está activo.
-- ═════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'electron_logs',
    'daily_electrons',
    'supplement_logs',
    'mind_sessions',
    'argos_daily_usage',
    'user_master_quiz',
    'user_prescribed_interventions'
  ] LOOP
    -- Idempotencia: se borra y se recrea, así una corrida posterior deja
    -- exactamente la misma definición aunque alguien la hubiera editado a mano.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Coach lee ' || t || ' de su cliente', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR SELECT
        USING (EXISTS (
          SELECT 1 FROM public.coach_clients cc
          WHERE cc.coach_id = auth.uid()
            AND cc.client_id = %I.user_id
            AND cc.status = 'active'
        ))
    $f$, 'Coach lee ' || t || ' de su cliente', t, t);
  END LOOP;
END $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 2) EL AGUJERO QUE LA CONSOLA DESTAPA, CERRADO DE VERDAD
--
--    ⚠️ ESTA SECCIÓN SE REESCRIBIÓ. El primer intento (política de INSERT con
--    una rama "o eres tú mismo el cliente") NO cerraba nada: movía el agujero
--    de INSERT a UPDATE. Se probó en un Postgres 16 local y la cadena de dos
--    pasos funcionaba. Queda escrito aquí para que no se vuelva a intentar:
--
--        paso 1  INSERT (coach_id = cualquiera, client_id = yo)   ← pasaba
--        paso 2  UPDATE SET coach_id = yo, client_id = <víctima>  ← pasaba
--                (el USING se evaluaba contra la fila VIEJA, donde yo era el
--                 cliente; el WITH CHECK contra la NUEVA, donde yo era el
--                 coach. Las dos mitades se cumplían con personas distintas.)
--
--    LA LECCIÓN: una política no puede ser el único candado de una tabla cuyas
--    columnas de identidad se pueden reescribir. RLS filtra RENGLONES; no
--    protege COLUMNAS. Por eso el candado de abajo vive en la capa de
--    PRIVILEGIOS, que se evalúa ANTES que RLS y que ninguna política puede
--    devolver.
--
-- ─── EL ESTADO DE HOY ────────────────────────────────────────────────────────
--    `coach_clients` tiene la política "System manages connections", FOR ALL,
--    USING (auth.uid() = coach_id OR auth.uid() = client_id) y sin WITH CHECK
--    propio. En Postgres una política ALL sin WITH CHECK usa su USING también
--    como verificación de INSERT. O sea que cualquier persona con sesión puede
--    insertar (coach_id = ella, client_id = cualquiera) y a partir de ahí las
--    treinta y tantas políticas de coach le abren laboratorios, síntomas,
--    comida y mapa funcional de esa persona. Existe desde la 008. Reproducido
--    en local: el atacante lee el `summary_text` de la víctima en UNA consulta.
--
-- ─── LO QUE SE HACE ──────────────────────────────────────────────────────────
--    a) Se parte la política ALL en cuatro. SELECT, UPDATE y DELETE conservan
--       el comportamiento de hoy (coach o cliente de esa fila), porque de ahí
--       viven `disconnectClient` y `disconnectCoach`.
--    b) INSERT queda SOLO para un admin verificado por el servidor y sobre su
--       propio coach_id. Se quitó la rama "o yo mismo": ningún camino de la app
--       hace un INSERT directo desde el cliente. El alta por código
--       (`connect_to_coach`) y por invitación (`invite_client_by_email`) son
--       SECURITY DEFINER y pasan por encima de RLS. Verificado el 8-sep-2026
--       contra `pg_proc`: las cuatro funciones que tocan esta tabla son
--       SECURITY DEFINER y su dueño es `postgres`.
--    c) EL CANDADO QUE NO SE ENCADENA: se revoca el UPDATE de tabla a `anon` y
--       `authenticated` y se vuelve a conceder SOLO sobre la columna `status`.
--
-- ─── POR QUÉ (c) NO SE PUEDE ENCADENAR CON OTRO PASO MÁS ─────────────────────
--    1. El privilegio por columna lo revisa el sistema de permisos, no el de
--       políticas, y se revisa ANTES. Una política solo puede RESTRINGIR qué
--       renglones tocas; no existe forma de que conceda el derecho a escribir
--       una columna que te fue revocada. Cualquier política futura que alguien
--       agregue sigue chocando contra el mismo muro.
--    2. Con el UPDATE limitado a `status`, no hay ninguna sentencia que cambie
--       `coach_id` o `client_id` desde el rol de la app. Se probaron las cuatro
--       formas: UPDATE de las dos columnas, UPDATE de una sola,
--       INSERT ... ON CONFLICT DO UPDATE, y UPDATE de `connected_at`. Las
--       cuatro devuelven "permission denied for table coach_clients".
--    3. La otra mitad de la cadena tampoco existe ya: con el INSERT en manos de
--       un admin, el atacante no puede crear la fila semilla que pivotaría. Son
--       dos candados independientes y en capas distintas; hay que romper los
--       dos, y el segundo no vive en la capa de políticas.
--    4. DELETE + INSERT tampoco: borrar su propia fila sigue permitido (es su
--       derecho), pero el INSERT de vuelta ya no pasa.
--
-- ─── POR QUÉ **NO** SE USÓ UN TRIGGER ────────────────────────────────────────
--    La otra salida era un trigger BEFORE UPDATE que rechace cambios de
--    `coach_id` y `client_id`. En ESTA base rompería el registro de usuarios.
--    `handle_new_user` (SECURITY DEFINER, dueño `postgres`, disparado en
--    auth.users) migra las referencias del perfil placeholder al usuario real
--    y para eso hace, literalmente:
--        UPDATE public.coach_clients SET client_id = $1 WHERE client_id = $2
--    Un trigger dispara para TODOS los roles, incluido el dueño, y dejaría al
--    invitado por correo sin su vínculo al registrarse. El privilegio por
--    columna, en cambio, no toca al dueño ni a `service_role`: solo cierra el
--    rol con el que corre la app. Comprobado en local: con el candado puesto,
--    ese UPDATE del dueño sigue pasando.
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "System manages connections" ON public.coach_clients;

DROP POLICY IF EXISTS "coach_clients_select_parte" ON public.coach_clients;
CREATE POLICY "coach_clients_select_parte" ON public.coach_clients
  FOR SELECT
  USING (auth.uid() = coach_id OR auth.uid() = client_id);

-- El UPDATE sigue siendo de las dos partes, pero lo único que la app puede
-- escribir es `status` (ver el bloque de privilegios más abajo). La política
-- acota el RENGLÓN; el GRANT acota la COLUMNA. Hacen falta los dos.
DROP POLICY IF EXISTS "coach_clients_update_estado" ON public.coach_clients;
CREATE POLICY "coach_clients_update_estado" ON public.coach_clients
  FOR UPDATE
  USING (auth.uid() = coach_id OR auth.uid() = client_id)
  WITH CHECK (auth.uid() = coach_id OR auth.uid() = client_id);

DROP POLICY IF EXISTS "coach_clients_delete_parte" ON public.coach_clients;
CREATE POLICY "coach_clients_delete_parte" ON public.coach_clients
  FOR DELETE
  USING (auth.uid() = coach_id OR auth.uid() = client_id);

-- Limpieza del intento anterior, por si alguien alcanzó a aplicarlo.
DROP POLICY IF EXISTS "coach_clients_update_parte" ON public.coach_clients;
DROP POLICY IF EXISTS "coach_clients_insert_admin_o_uno_mismo" ON public.coach_clients;

DROP POLICY IF EXISTS "coach_clients_insert_solo_admin" ON public.coach_clients;
CREATE POLICY "coach_clients_insert_solo_admin" ON public.coach_clients
  FOR INSERT
  WITH CHECK (public.is_admin() AND auth.uid() = coach_id);

-- ── El candado de columna. Idempotente: revocar dos veces no cambia nada. ──
-- `anon` no escribe nunca en esta tabla: la llave anónima viaja dentro del
-- paquete de la app y cualquiera la puede leer.
REVOKE INSERT, UPDATE, DELETE ON public.coach_clients FROM anon;
-- `authenticated` pierde el UPDATE de tabla y recupera SOLO `status`, que es la
-- única columna que el código de la app escribe hoy. Verificado el 8-sep-2026:
-- las dos únicas escrituras desde el cliente son `disconnectClient` y
-- `disconnectCoach` en src/services/coach-service.ts, y ambas hacen
-- `.update({ status: 'inactive' })`. Nada más toca esta tabla desde la app.
REVOKE UPDATE ON public.coach_clients FROM authenticated;
GRANT  UPDATE (status) ON public.coach_clients TO authenticated;

COMMENT ON TABLE public.coach_clients IS
  'Vinculo coach-cliente. Es la llave de TODAS las politicas de lectura de datos de salud entre personas: si aqui no hay fila activa, el coach no ve nada. Desde la 323 (8-sep-2026): el INSERT directo solo lo hace un admin verificado sobre su propio coach_id, y el rol de la app solo puede escribir la columna status. Cambiar coach_id o client_id desde la app es imposible por PRIVILEGIO, no por politica. Las altas por codigo y por invitacion siguen entrando por sus funciones SECURITY DEFINER, que corren como el dueno.';

-- ═════════════════════════════════════════════════════════════════════════════
-- 3) LA TERCERA CADENA: `profiles.role`, QUE HACÍA INÚTIL A `is_admin()`
--
--    Encontrado el 8-sep-2026 al auditar la sección 2. Sin esto, todo lo de
--    arriba se cae en dos consultas:
--
--        UPDATE profiles SET role = 'admin' WHERE id = auth.uid();   ← pasaba
--        INSERT INTO coach_clients (coach_id, client_id, status)
--          VALUES (auth.uid(), '<víctima>', 'active');               ← pasaba
--
--    Porque la política `profiles_update` es USING (id = auth.uid()) sin WITH
--    CHECK propio, y `authenticated` tiene GRANT UPDATE sobre TODAS las
--    columnas de `profiles`, incluida `role`. O sea que cualquiera se nombraba
--    admin a sí mismo, y `is_admin()` (que lee justamente `profiles.role`)
--    decía que sí. Verificado contra producción en
--    `information_schema.column_privileges`.
--
--    De paso cae otro: `tier` y `tier_expires_at` tienen el mismo problema.
--    Cualquiera podía ponerse `tier = 'elite'` y abrirse las funciones de pago.
--    Se cierra igual, con el mismo REVOKE, porque es la misma columna de
--    autoridad mal concedida.
--
--    MISMA RECETA QUE LA SECCIÓN 2 Y POR LA MISMA RAZÓN: el candado va en la
--    capa de PRIVILEGIOS, no en una política. Una política nueva aquí volvería
--    a ser encadenable; un privilegio revocado no lo devuelve nadie.
--
--    QUÉ SIGUE PUDIENDO ESCRIBIR LA APP. Se revisó una por una toda escritura
--    a `profiles` en src/ y app/ el 8-sep-2026. La lista de abajo es
--    exactamente esa, ni una columna más:
--      full_name                 onboarding/v2/welcome, coach-service (admin)
--      onboarding_step           onboarding-v2-service, primera-sesion-service
--      onboarding_completed_at   los mismos dos
--      medical_consent_at        onboarding-v2-service
--      age_verified_at           primera-sesion-service, onboarding/v2/profile
--      skin_type                 dx/fitzpatrick-service
--      fitness_level             fitness/fitness-profile-service
--      argos_introduced_at       argos-intro-service
--      argos_voice               argos-voice-service
--      avatar_url, timezone,
--      preferences, updated_at   campos propios de la persona, sin autoridad
--
--    QUÉ DEJA DE PODER ESCRIBIR: `role` (autorización), `tier` y
--    `tier_expires_at` (cobro; los escribe el webhook con `service_role`),
--    `coach_code`, `revenuecat_customer_id`, `is_test`, `id`, `email`,
--    `created_at`. `email` lo escribe `handle_new_user`, que corre como el
--    dueño y no se ve afectado.
-- ═════════════════════════════════════════════════════════════════════════════

REVOKE UPDATE, INSERT, DELETE ON public.profiles FROM anon;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT  UPDATE (
  full_name, avatar_url, timezone, preferences, updated_at,
  onboarding_step, onboarding_completed_at,
  skin_type, medical_consent_at, age_verified_at,
  argos_introduced_at, argos_voice, fitness_level
) ON public.profiles TO authenticated;

COMMENT ON COLUMN public.profiles.role IS
  'Autorizacion, NO preferencia. La lee is_admin() y de ahi cuelga el INSERT de coach_clients. Desde la 323 (8-sep-2026) el rol de la app no tiene privilegio de UPDATE sobre esta columna: solo service_role o el dueno la cambian. Antes cualquiera se nombraba admin a si mismo en una consulta.';


COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- CÓMO COMPROBAR QUE QUEDÓ BIEN (correr después del push, no forma parte)
--
--   -- 1. Las siete políticas nuevas existen y son solo de lectura:
--   select tablename, policyname, cmd from pg_policies
--    where schemaname='public' and policyname like 'Coach lee %'
--    order by tablename;
--
--   -- 2. coach_clients ya no tiene una política ALL:
--   select policyname, cmd from pg_policies
--    where schemaname='public' and tablename='coach_clients' order by cmd;
--
--   -- 3. EL CANDADO DE COLUMNA. `authenticated` debe aparecer con UPDATE
--   --    SOLO en 'status'. Si sale 'coach_id' o 'client_id', no se aplicó:
--   select grantee, column_name from information_schema.column_privileges
--    where table_schema='public' and table_name='coach_clients'
--      and privilege_type='UPDATE' and grantee in ('anon','authenticated')
--    order by grantee, column_name;
--
--   -- 4. Nadie gana acceso a quien no es su cliente. Debe dar 0:
--   select count(*) from coach_clients
--    where coach_id = '90a55e74-0e3d-477a-9ac5-2b339f7c40af'
--      and client_id = '7503a669-ab9c-41ab-a38a-365c0af672a6';
--
--   -- 5. LA TERCERA CADENA. `authenticated` NO debe poder escribir 'role',
--   --    'tier', 'tier_expires_at' ni 'coach_code'. Si aparece alguna, el
--   --    candado de admin no vale nada:
--   select column_name from information_schema.column_privileges
--    where table_schema='public' and table_name='profiles'
--      and privilege_type='UPDATE' and grantee='authenticated'
--      and column_name in ('role','tier','tier_expires_at','coach_code','email','id');
--   -- (debe devolver CERO renglones)
--
--   -- 6. Y con una sesión de cliente normal, esto debe dar
--   --    "permission denied for table profiles":
--   --    update profiles set role='admin' where id = auth.uid();
--
-- ─────────────────────────────────────────────────────────────────────────────
