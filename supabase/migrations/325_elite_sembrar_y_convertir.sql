-- 325_elite_sembrar_y_convertir.sql
-- Fecha: 2026-09-21 (bloque 325, noche Elite). NO se ejecuta desde Cowork:
-- la aplica Enrique con `npx supabase db push`, DESPUES de la 324.
-- Requiere 318, 321, 323 y 324 aplicadas: lee la evaluacion que dejo la 318
-- en `functional_dx` (sources_snapshot.elite_v3), usa el mismo gate de admin
-- que la 318 (profiles.role, columna que blinda la 323) y escribe las
-- comidas en el plan `Plan Elite vN` que crea la 324 en `nutrition_plans`.
-- Usa ademas, si estan, exercise_matrix (220, seed 223) para el clip de los
-- bloques y routines.archived_at (232) para archivar versiones anteriores;
-- si faltan, avisa (catalogo_no_disponible, archivado_sin_columna) y sigue.
--
-- Ronda de arreglos del 21-sep-2026 (revision en frio contra la matriz real
-- y los payloads reales de Vicente y Victor): el catalogo esta en INGLES y
-- el emparejamiento por nombre daba 0 de 23 y 0 de 16, y la duracion de
-- cada bloque se inventaba desde la prosa de reps ("30-45 s / 10 por lado"
-- -> 15 s). Ahora: `slug` por bloque (primero), nombre normalizado
-- (segundo), familia unica (tercero); duracion solo desde reps limpio, si
-- no 40 s y aviso; label con tope de 80; una version nueva archiva las
-- rutinas de la anterior; rutina propia del cliente con el mismo nombre no
-- se pisa ni se agenda encima.
--
-- POR QUE EXISTE (decision del dueno, 8 y 20 de septiembre): "el plan de
-- entrenamiento y alimentacion SE CONVIERTEN en rutinas y comidas" dentro de
-- la app, y la carga Elite debe sembrar lo que cardio y fitness necesitan
-- para calcular. Hoy el cliente del dia uno ve "falta tu fecha de
-- nacimiento", "sin FC maxima ni reposo no hay estimacion" y nivel SIN
-- DECLARAR, aunque Enrique ya tiene esos datos en su evaluacion; y el plan de
-- entrenamiento y las comidas se quedan como prosa dentro de "Mi evaluacion
-- Elite" en vez de ser rutinas que se corren y comidas que Comida ensena.
--
-- Tres funciones, todas SECURITY DEFINER, mismo gate que la 318 (sesion +
-- profiles.role = 'admin'), mismo advisory lock por usuario, IDEMPOTENTES y de
-- "solo rellenar lo vacio": un dato que el cliente ya puso NUNCA se pisa; si
-- existe, se respeta y se devuelve en `respetado` y en `avisos`. Las tres
-- leen la evaluacion Elite VIGENTE del cliente (la fila is_current de
-- functional_dx con elite_v3; si la vigente es del mapa de ARGOS, la ultima
-- Elite por version) y se llaman con solo el user_id, DESPUES de
-- `elite_cargar_completa` (curl-elite.sh las encadena):
--
--   1. elite_sembrar_perfil(p_user_id)  -> jsonb
--      cliente.sexo -> client_profiles.biological_sex ('F'/'female' -> female,
--      'M'/'male' -> male); cliente.fecha_nacimiento -> date_of_birth;
--      cliente.estatura_cm -> client_profiles.height_cm y
--      health_measurements.height_cm; cliente.peso_kg ->
--      health_measurements.weight_kg (client_profiles NO tiene peso: cardio,
--      Edad ATP y el puente de edad leen health_measurements);
--      cliente.fc_reposo -> health_measurements.resting_hr, que es la columna
--      que cardio-perfil-service lee (junto con health_os_daily.resting_hr del
--      wearable): SOLO si el cliente no tiene NINGUNA medicion propia de FC en
--      reposo en ninguna de las dos tablas. cliente.nivel_fitness ->
--      profiles.fitness_level (enum real de la 224: principiante, intermedio,
--      avanzado; 'atleta' no se siembra desde un documento). Si
--      client_profiles no tiene fila, la crea. La fila de health_measurements
--      se fecha con cliente.fecha_toma (si trae dia), si no con
--      generado_en, y lleva source='elite'.
--
--   2. elite_cargar_rutinas(p_user_id) -> jsonb
--      Por cada entrenamiento.rutinas[] crea una rutina REAL del cliente:
--      routines (creator_id = el cliente, para que aparezca en Mis rutinas
--      igual que las que deja assign_routine_to_client; original_creator_id =
--      el coach que corre; mode 'routine'; nombre tal cual, sin " (copia)") y
--      sus blocks en la forma exacta que compila src/engine/flatten.ts y
--      traduce routine-bridge-core.ts para /session: un bloque hoja `work`
--      por ejercicio, `rounds` = series, `rest_between_seconds` = descanso_s,
--      `suggested_rest_seconds` = descanso_s, `label` = ejercicio con la
--      prescripcion ("Sentadilla · 3 x 8-10", tope 80 caracteres), `notes`
--      con la prescripcion completa y las notas del clinico (tope 500), y
--      `matrix_slug` cuando el bloque se empareja con exercise_matrix (asi
--      el runner lo corre con clip y series; el puente toma series de
--      `rounds` y descanso de `rest_between_seconds`). El catalogo esta en
--      INGLES (MoveKit): el emparejamiento es 1) `slug` del bloque exacto
--      contra exercise_matrix.slug, 2) nombre normalizado, 3) `familia` en
--      espanol solo si es unica; el nombre en espanol se conserva como
--      etiqueta. Sin matriz, el bloque corre como tiempo: `duration_seconds`
--      se deriva SOLO de reps limpio ("8" o "8-10": 4 s por rep con el
--      ultimo numero; "30 s"; "45 min", tope 1800); con prosa queda en 40 s
--      y se avisa (duracion_no_derivada) por nombre. series fuera de 1..20
--      o descanso_s fuera de 0..600 se ignoran y se avisan
--      (bloque_fuera_de_rango). sort_order contiguo.
--      Agenda en scheduled_routines (assigned_by = auth.uid(),
--      schedule_type 'weekly_cycle') un renglon por dia UNICO de
--      dias_semana (1 = lunes ... 7 = domingo -> day_of_week 1..6 y 0). Sin
--      dias: solo en Mis rutinas. Idempotente por (cliente, evaluacion,
--      nombre) via la tabla elite_rutinas_cargadas: la segunda corrida avisa
--      rutina_ya_cargada y no duplica; si el cliente borro o archivo la
--      rutina, no se recrea (dato del usuario sagrado). Dos rutinas con el
--      mismo nombre en un documento: entra la primera y se avisa
--      (rutina_duplicada_en_documento).
--      VERSION NUEVA de la evaluacion (dx_id nuevo, con al menos una rutina
--      valida): las rutinas que ESTA funcion creo para versiones anteriores
--      del mismo cliente se ARCHIVAN (routines.archived_at = now(), como
--      archiveRoutines en Mis rutinas: siguen en la base, recuperables) y
--      sus agendas puestas por el coach se desactivan (is_active = false),
--      para que el hub corra la version nueva y no la vieja (la precedencia
--      elige la de created_at mas antiguo). Aviso
--      rutinas_version_anterior_archivadas con nombres. Las que el cliente
--      borro o ya archivo no se tocan ni se recrean.
--      Rutina PROPIA del cliente con el mismo nombre: la de la evaluacion se
--      crea aparte, se avisa (rutina_con_nombre_del_cliente) y no se agenda
--      en los dias donde la propia ya esta agendada: la propia manda.
--      Nunca borra, archiva ni desactiva rutinas ni agendas propias del
--      cliente.
--
--   3. elite_cargar_comidas(p_user_id) -> jsonb
--      Escribe alimentacion.comidas[] en nutrition_plans.meals (columna nueva
--      jsonb, misma forma del esquema: momento, hora, nombre, componentes,
--      notas) y alimentacion.metas.kcal_dia / grasa_g_dia / carbohidrato_g_dia
--      en calorie_target / fat_target / carb_target, SOLO en el plan
--      `Plan Elite vN` de esa misma version que creo la 324, y SOLO donde
--      esta vacio (meals = [] y target NULL). Sin ese plan: aviso
--      sin_plan_elite, no crea otro. Nunca toca otro plan del cliente.
--
-- QUE NO HACE, a proposito:
--   - No inventa datos: lo que el documento no trae se reporta en
--     `sin_dato` y en avisos (perfil_sin_datos). La edad de cliente.edad no
--     se convierte en fecha de nacimiento.
--   - No pisa: sexo, fecha de nacimiento, estatura, peso, FC en reposo y
--     nivel que el cliente ya tenga se quedan (respetado).
--   - No revive un vinculo coach-cliente inactivo ni exige uno para cargar
--     rutinas (lo crea la 324); si no esta activo, avisa
--     (sin_vinculo_coach_activo) porque el hub dira "tu coach" sin nombre.
--   - No manda las reps al runner con clip: routine-bridge-core usa 10 reps
--     por default para un bloque de matriz (deuda anotada); las reps del
--     clinico van en label y notes y se ven en el builder y en el runner de
--     tiempo.
--   - No crea nutrition_plans ni cambia su status.
--   - No borra nada. Lo unico que archiva y desactiva son las rutinas y
--     agendas que ella misma creo para una version anterior.
--
-- Reversible: routines de la carga estan en elite_rutinas_cargadas (por dx_id)
-- y se archivan con archived_at; health_measurements lleva source='elite';
-- nutrition_plans.meals se vacia con '[]'.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS, CREATE OR
-- REPLACE. Las tres funciones se pueden correr N veces: la segunda no
-- duplica nada y lo dice.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Esquema minimo
-- ---------------------------------------------------------------------------

ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS meals jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.nutrition_plans.meals IS
  'ATP 3.0 (325): comidas del plan por momento [{momento, hora, nombre, componentes[], notas}] (momento: desayuno|comida|cena|colacion|pre_entreno|post_entreno; hora HH:MM o null). Las escribe elite_cargar_comidas desde alimentacion.comidas de la evaluacion Elite; Comida las pinta bajo el plan del coach.';

CREATE TABLE IF NOT EXISTS public.elite_rutinas_cargadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dx_id uuid NOT NULL,
  version_elite int NOT NULL,
  nombre text NOT NULL,
  nombre_norm text NOT NULL,
  -- NULL si el cliente borro la rutina: la fila queda para NO recrearla.
  routine_id uuid REFERENCES public.routines(id) ON DELETE SET NULL,
  cargado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dx_id, nombre_norm)
);
COMMENT ON TABLE public.elite_rutinas_cargadas IS
  'ATP 3.0 (325): rastro de cada rutina creada por elite_cargar_rutinas (cliente, evaluacion, nombre). Es la llave de idempotencia y el mapa para revertir. routine_id NULL = el cliente la borro y no se recrea.';
ALTER TABLE public.elite_rutinas_cargadas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'elite_rutinas_cargadas' AND policyname = 'elite_rutinas_cargadas_select_own') THEN
    CREATE POLICY elite_rutinas_cargadas_select_own ON public.elite_rutinas_cargadas
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
REVOKE ALL ON TABLE public.elite_rutinas_cargadas FROM PUBLIC;
REVOKE ALL ON TABLE public.elite_rutinas_cargadas FROM anon;
GRANT SELECT ON TABLE public.elite_rutinas_cargadas TO authenticated;
GRANT ALL ON TABLE public.elite_rutinas_cargadas TO service_role;

-- ---------------------------------------------------------------------------
-- 1. Helpers internos (solo los llaman las funciones de abajo; sin EXECUTE
--    para anon/authenticated).
-- ---------------------------------------------------------------------------

-- minusculas, sin acentos, espacios colapsados: para comparar nombres.
CREATE OR REPLACE FUNCTION public.elite_325_norm(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT lower(translate(btrim(regexp_replace(COALESCE(p, ''), '\s+', ' ', 'g')),
    'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'));
$function$;

-- Gate + evaluacion vigente. Devuelve {ok:false,error} o
-- {ok:true, caller, dx_id, version_elite, elite_v3}.
CREATE OR REPLACE FUNCTION public.elite_325_contexto(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_role text;
  v_dx_id uuid;
  v_ev jsonb;
  v_version int;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_sesion');
  END IF;
  SELECT role::text INTO v_role FROM profiles WHERE id = v_caller;
  IF COALESCE(v_role, 'client') <> 'admin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
  END IF;
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_required');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  -- La vigente; si la vigente es del mapa de ARGOS, la ultima Elite.
  SELECT id, sources_snapshot->'elite_v3'
    INTO v_dx_id, v_ev
  FROM functional_dx
  WHERE user_id = p_user_id
    AND sources_snapshot->'elite_v3'->>'schema' = 'elite_v3'
  ORDER BY is_current DESC, version DESC
  LIMIT 1;
  IF v_dx_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_evaluacion_elite');
  END IF;
  IF (v_ev->>'version') ~ '^[0-9]+$' THEN
    v_version := (v_ev->>'version')::int;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'caller', v_caller, 'dx_id', v_dx_id,
    'version_elite', v_version, 'elite_v3', v_ev);
END;
$function$;

REVOKE ALL ON FUNCTION public.elite_325_norm(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.elite_325_norm(text) FROM anon;
REVOKE ALL ON FUNCTION public.elite_325_norm(text) FROM authenticated;
REVOKE ALL ON FUNCTION public.elite_325_contexto(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.elite_325_contexto(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.elite_325_contexto(uuid) FROM authenticated;

-- ---------------------------------------------------------------------------
-- 2. elite_sembrar_perfil
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.elite_sembrar_perfil(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_ctx jsonb;
  v_caller uuid;
  v_dx_id uuid;
  v_version int;
  v_ev jsonb;
  v_cli jsonb;
  -- valores del documento, ya validados (NULL = no viene o fuera de rango)
  v_sexo text;
  v_nac date;
  v_estatura numeric;
  v_peso numeric;
  v_fc int;
  v_nivel text;
  v_fecha date;
  v_txt text;
  -- destino
  v_cp record;
  v_nivel_actual text;
  v_hm_id uuid;
  v_hm_peso numeric;
  v_hm_estatura numeric;
  v_hm_fc int;
  v_hay_peso boolean;
  v_hay_estatura boolean;
  v_hay_fc boolean;
  v_hm_escribir boolean := false;
  v_nuevo_peso numeric;
  v_nueva_estatura numeric;
  v_nuevo_fc int;
  -- salida
  v_sembrado jsonb := '{}'::jsonb;
  v_respetado jsonb := '{}'::jsonb;
  v_sin_dato text[] := '{}';
  v_fuera text[] := '{}';
  v_avisos jsonb := '[]'::jsonb;
BEGIN
  v_ctx := public.elite_325_contexto(p_user_id);
  IF COALESCE((v_ctx->>'ok')::boolean, false) IS DISTINCT FROM true THEN
    RETURN v_ctx;
  END IF;
  v_caller := (v_ctx->>'caller')::uuid;
  v_dx_id := (v_ctx->>'dx_id')::uuid;
  v_version := (v_ctx->>'version_elite')::int;
  v_ev := v_ctx->'elite_v3';
  v_cli := CASE WHEN jsonb_typeof(v_ev->'cliente') = 'object' THEN v_ev->'cliente' ELSE '{}'::jsonb END;

  PERFORM pg_advisory_xact_lock(hashtextextended('functional_dx:' || p_user_id::text, 0));

  -- 1. Lo que trae el documento, con rango sano (la app ya lo valido; aqui
  --    se repite para que un JSON viejo o editado a mano no escriba basura).
  v_txt := lower(btrim(COALESCE(v_cli->>'sexo', '')));
  v_sexo := CASE WHEN v_txt IN ('f', 'female') THEN 'female' WHEN v_txt IN ('m', 'male') THEN 'male' ELSE NULL END;
  IF v_sexo IS NULL THEN
    IF v_txt = '' THEN v_sin_dato := array_append(v_sin_dato, 'sexo'); ELSE v_fuera := array_append(v_fuera, format('sexo (%s)', v_txt)); END IF;
  END IF;

  v_txt := btrim(COALESCE(v_cli->>'fecha_nacimiento', ''));
  IF v_txt = '' THEN
    v_sin_dato := array_append(v_sin_dato, 'fecha_nacimiento');
  ELSE
    BEGIN
      IF v_txt ~ '^\d{4}-\d{2}-\d{2}$' THEN v_nac := v_txt::date; END IF;
    EXCEPTION WHEN OTHERS THEN v_nac := NULL;
    END;
    IF v_nac IS NULL OR v_nac < DATE '1900-01-01' OR v_nac > CURRENT_DATE THEN
      v_nac := NULL; v_fuera := array_append(v_fuera, format('fecha_nacimiento (%s)', v_txt));
    END IF;
  END IF;

  IF jsonb_typeof(v_cli->'estatura_cm') = 'number' THEN
    v_estatura := (v_cli->>'estatura_cm')::numeric;
    IF v_estatura < 100 OR v_estatura > 250 THEN v_fuera := array_append(v_fuera, format('estatura_cm (%s)', v_estatura)); v_estatura := NULL; END IF;
  ELSE
    v_sin_dato := array_append(v_sin_dato, 'estatura_cm');
  END IF;

  IF jsonb_typeof(v_cli->'peso_kg') = 'number' THEN
    v_peso := (v_cli->>'peso_kg')::numeric;
    IF v_peso < 30 OR v_peso > 300 THEN v_fuera := array_append(v_fuera, format('peso_kg (%s)', v_peso)); v_peso := NULL; END IF;
  ELSE
    v_sin_dato := array_append(v_sin_dato, 'peso_kg');
  END IF;

  IF jsonb_typeof(v_cli->'fc_reposo') = 'number' THEN
    v_fc := round((v_cli->>'fc_reposo')::numeric)::int;
    IF v_fc < 30 OR v_fc > 120 THEN v_fuera := array_append(v_fuera, format('fc_reposo (%s)', v_cli->>'fc_reposo')); v_fc := NULL; END IF;
  ELSE
    v_sin_dato := array_append(v_sin_dato, 'fc_reposo');
  END IF;

  v_txt := lower(btrim(COALESCE(v_cli->>'nivel_fitness', '')));
  IF v_txt = '' THEN
    v_sin_dato := array_append(v_sin_dato, 'nivel_fitness');
  ELSIF v_txt IN ('principiante', 'intermedio', 'avanzado') THEN
    v_nivel := v_txt;
  ELSE
    v_fuera := array_append(v_fuera, format('nivel_fitness (%s)', v_txt));
  END IF;

  -- Fecha de la medicion: la toma del documento si trae dia; si no, la fecha
  -- del documento; si no, hoy.
  BEGIN
    v_txt := btrim(COALESCE(v_ev->'cliente'->>'fecha_toma', ''));
    IF v_txt ~ '^\d{4}-\d{2}-\d{2}$' THEN v_fecha := v_txt::date; END IF;
  EXCEPTION WHEN OTHERS THEN v_fecha := NULL;
  END;
  IF v_fecha IS NULL THEN
    BEGIN
      v_fecha := left(btrim(COALESCE(v_ev->>'generado_en', '')), 10)::date;
    EXCEPTION WHEN OTHERS THEN v_fecha := NULL;
    END;
  END IF;
  IF v_fecha IS NULL OR v_fecha > CURRENT_DATE THEN v_fecha := CURRENT_DATE; END IF;

  -- 2. client_profiles: sexo, fecha de nacimiento, estatura. Solo NULLs.
  SELECT * INTO v_cp FROM client_profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO client_profiles (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO v_cp FROM client_profiles WHERE user_id = p_user_id FOR UPDATE;
  END IF;

  IF v_sexo IS NOT NULL THEN
    IF v_cp.biological_sex IS NULL THEN
      UPDATE client_profiles SET biological_sex = v_sexo, updated_at = now() WHERE user_id = p_user_id;
      v_sembrado := v_sembrado || jsonb_build_object('biological_sex', v_sexo);
    ELSE
      v_respetado := v_respetado || jsonb_build_object('biological_sex', v_cp.biological_sex);
    END IF;
  END IF;
  IF v_nac IS NOT NULL THEN
    IF v_cp.date_of_birth IS NULL THEN
      UPDATE client_profiles SET date_of_birth = v_nac, updated_at = now() WHERE user_id = p_user_id;
      v_sembrado := v_sembrado || jsonb_build_object('date_of_birth', v_nac);
    ELSE
      v_respetado := v_respetado || jsonb_build_object('date_of_birth', v_cp.date_of_birth);
    END IF;
  END IF;
  IF v_estatura IS NOT NULL THEN
    IF v_cp.height_cm IS NULL THEN
      UPDATE client_profiles SET height_cm = v_estatura, updated_at = now() WHERE user_id = p_user_id;
      v_sembrado := v_sembrado || jsonb_build_object('height_cm', v_estatura);
    ELSE
      v_respetado := v_respetado || jsonb_build_object('height_cm', v_cp.height_cm);
    END IF;
  END IF;

  -- 3. profiles.fitness_level (224): el nivel del generador y del hub. Si
  --    la columna no existiera (224 sin aplicar) se avisa en vez de tirar
  --    toda la siembra.
  IF v_nivel IS NOT NULL THEN
    BEGIN
      SELECT fitness_level INTO v_nivel_actual FROM profiles WHERE id = p_user_id;
      IF v_nivel_actual IS NULL THEN
        UPDATE profiles SET fitness_level = v_nivel WHERE id = p_user_id;
        v_sembrado := v_sembrado || jsonb_build_object('fitness_level', v_nivel);
      ELSE
        v_respetado := v_respetado || jsonb_build_object('fitness_level', v_nivel_actual);
      END IF;
    EXCEPTION WHEN undefined_column THEN
      v_avisos := v_avisos || jsonb_build_object(
        'codigo', 'fitness_level_sin_columna',
        'detalle', 'profiles.fitness_level no existe en esta base (migracion 224 sin aplicar): el nivel no se sembro.');
    END;
  END IF;

  -- 4. health_measurements: peso, estatura y FC en reposo, donde cardio y
  --    Edad ATP los leen. "Vacio" = el cliente no tiene NINGUNA fila con ese
  --    dato (cardio toma la mas reciente que lo traiga, asi que una sola fila
  --    del cliente ya cuenta como su dato).
  IF v_peso IS NOT NULL OR v_estatura IS NOT NULL OR v_fc IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM health_measurements WHERE user_id = p_user_id AND weight_kg IS NOT NULL) INTO v_hay_peso;
    SELECT EXISTS (SELECT 1 FROM health_measurements WHERE user_id = p_user_id AND height_cm IS NOT NULL) INTO v_hay_estatura;
    SELECT EXISTS (SELECT 1 FROM health_measurements WHERE user_id = p_user_id AND resting_hr IS NOT NULL) INTO v_hay_fc;
    -- El wearable tambien es medicion del cliente (health_os_daily puede no
    -- existir en remoto: se degrada a "no hay").
    IF NOT v_hay_fc THEN
      BEGIN
        SELECT EXISTS (SELECT 1 FROM health_os_daily WHERE user_id = p_user_id AND resting_hr IS NOT NULL) INTO v_hay_fc;
      EXCEPTION WHEN undefined_table THEN v_hay_fc := false;
      END;
    END IF;

    IF v_peso IS NOT NULL THEN
      IF v_hay_peso THEN
        SELECT weight_kg INTO v_hm_peso FROM health_measurements WHERE user_id = p_user_id AND weight_kg IS NOT NULL ORDER BY date DESC LIMIT 1;
        v_respetado := v_respetado || jsonb_build_object('weight_kg', v_hm_peso);
      ELSE
        v_nuevo_peso := v_peso; v_hm_escribir := true;
      END IF;
    END IF;
    IF v_estatura IS NOT NULL THEN
      IF v_hay_estatura THEN
        SELECT height_cm INTO v_hm_estatura FROM health_measurements WHERE user_id = p_user_id AND height_cm IS NOT NULL ORDER BY date DESC LIMIT 1;
        v_respetado := v_respetado || jsonb_build_object('health_measurements.height_cm', v_hm_estatura);
      ELSE
        v_nueva_estatura := v_estatura; v_hm_escribir := true;
      END IF;
    END IF;
    IF v_fc IS NOT NULL THEN
      IF v_hay_fc THEN
        SELECT resting_hr INTO v_hm_fc FROM health_measurements WHERE user_id = p_user_id AND resting_hr IS NOT NULL ORDER BY date DESC LIMIT 1;
        v_respetado := v_respetado || jsonb_build_object('resting_hr', COALESCE(to_jsonb(v_hm_fc), to_jsonb('wearable'::text)));
      ELSE
        v_nuevo_fc := v_fc; v_hm_escribir := true;
      END IF;
    END IF;

    IF v_hm_escribir THEN
      SELECT id INTO v_hm_id FROM health_measurements WHERE user_id = p_user_id AND date = v_fecha FOR UPDATE;
      IF v_hm_id IS NULL THEN
        INSERT INTO health_measurements (user_id, date, weight_kg, height_cm, resting_hr, source)
        VALUES (p_user_id, v_fecha, v_nuevo_peso, v_nueva_estatura, v_nuevo_fc, 'elite');
      ELSE
        -- La fila del dia ya existe (otra metrica del cliente): se rellenan
        -- solo las columnas vacias y se conserva su source.
        UPDATE health_measurements SET
          weight_kg = COALESCE(weight_kg, v_nuevo_peso),
          height_cm = COALESCE(height_cm, v_nueva_estatura),
          resting_hr = COALESCE(resting_hr, v_nuevo_fc),
          updated_at = now()
        WHERE id = v_hm_id;
      END IF;
      IF v_nuevo_peso IS NOT NULL THEN v_sembrado := v_sembrado || jsonb_build_object('weight_kg', v_nuevo_peso); END IF;
      IF v_nueva_estatura IS NOT NULL THEN v_sembrado := v_sembrado || jsonb_build_object('health_measurements.height_cm', v_nueva_estatura); END IF;
      IF v_nuevo_fc IS NOT NULL THEN v_sembrado := v_sembrado || jsonb_build_object('resting_hr', v_nuevo_fc); END IF;
      v_sembrado := v_sembrado || jsonb_build_object('health_measurements_date', v_fecha);
    END IF;
  END IF;

  -- 5. Avisos.
  IF v_respetado <> '{}'::jsonb THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'perfil_respetado',
      'detalle', format('El cliente ya tenia estos datos y se respetaron (los del documento solo se leen en la evaluacion): %s', v_respetado::text));
  END IF;
  IF array_length(v_sin_dato, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'perfil_sin_datos',
      'detalle', format('La evaluacion no trae %s. Sin fecha de nacimiento y FC en reposo cardio no calcula zonas; sin nivel el generador pregunta. Van en cliente.* del elite_v3 (version nueva) o el cliente los llena en la app.', array_to_string(v_sin_dato, ', ')));
  END IF;
  IF array_length(v_fuera, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'perfil_valores_fuera_de_rango',
      'detalle', format('Se ignoraron por forma o rango: %s.', array_to_string(v_fuera, ', ')));
  END IF;
  IF v_sembrado = '{}'::jsonb AND v_respetado = '{}'::jsonb THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'sin_perfil_que_sembrar',
      'detalle', 'La evaluacion no trae ningun dato de perfil con forma valida: no se escribio nada.');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'dx_id', v_dx_id,
    'version_elite', v_version,
    'sembrado', v_sembrado,
    'respetado', v_respetado,
    'sin_dato', to_jsonb(v_sin_dato),
    'avisos', v_avisos);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. elite_cargar_rutinas
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.elite_cargar_rutinas(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_ctx jsonb;
  v_caller uuid;
  v_dx_id uuid;
  v_version int;
  v_ev jsonb;
  v_firma text;
  v_rutinas jsonb;
  v_cc_status text;
  -- catalogo (exercise_matrix, 220) y columna archived_at (232): si faltan,
  -- la funcion sigue y lo dice; no truena entera.
  v_catalogo boolean := true;
  v_hay_archived boolean := false;
  v_hay_validas boolean := false;
  -- version anterior (M2)
  v_prev record;
  v_prev_nombres text[] := '{}';
  v_prev_archivadas int := 0;
  v_prev_agendas int := 0;
  v_n int;
  -- por rutina
  v_r jsonb;
  v_idx int;
  v_nombre text;
  v_norm text;
  v_norms_vistas text[] := '{}';
  v_objetivo text;
  v_notas_r text;
  v_descripcion text;
  v_previa record;
  v_routine_id uuid;
  v_propias int;
  v_dias jsonb;
  v_dia jsonb;
  v_dow int;
  v_dias_ok int;
  v_dias_vistos int[];
  v_dias_propia int;
  v_agendas_rutina int;
  -- por bloque
  v_b jsonb;
  v_ejercicio text;
  v_series int;
  v_reps text;
  v_descanso int;
  v_notas_b text;
  v_slug_doc text;
  v_slug text;
  v_ex_id uuid;
  v_label text;
  v_prescripcion text;
  v_notes text;
  v_duracion int;
  v_num numeric;
  v_bloques_rutina int;
  v_fuera boolean;
  -- contadores
  v_creadas int := 0;
  v_ya int := 0;
  v_invalidas int := 0;
  v_agendas int := 0;
  v_bloques int := 0;
  v_con_matriz int := 0;
  v_sin_matriz int := 0;
  v_sin_matriz_nombres text[] := '{}';
  v_slug_no_encontrado text[] := '{}';
  v_no_derivada text[] := '{}';
  v_fuera_rango text[] := '{}';
  v_duplicadas text[] := '{}';
  v_con_nombre_propio text[] := '{}';
  v_sin_agenda text[] := '{}';
  v_ya_nombres text[] := '{}';
  v_ids jsonb := '[]'::jsonb;
  v_avisos jsonb := '[]'::jsonb;
BEGIN
  v_ctx := public.elite_325_contexto(p_user_id);
  IF COALESCE((v_ctx->>'ok')::boolean, false) IS DISTINCT FROM true THEN
    RETURN v_ctx;
  END IF;
  v_caller := (v_ctx->>'caller')::uuid;
  v_dx_id := (v_ctx->>'dx_id')::uuid;
  v_version := (v_ctx->>'version_elite')::int;
  v_ev := v_ctx->'elite_v3';
  v_firma := COALESCE(NULLIF(btrim(v_ev->'interpretado_por'->>'evaluacion'), ''), 'tu coach');

  PERFORM pg_advisory_xact_lock(hashtextextended('functional_dx:' || p_user_id::text, 0));

  v_rutinas := v_ev->'entrenamiento'->'rutinas';
  IF jsonb_typeof(v_rutinas) IS DISTINCT FROM 'array' OR jsonb_array_length(v_rutinas) = 0 THEN
    RETURN jsonb_build_object(
      'ok', true, 'dx_id', v_dx_id, 'version_elite', v_version,
      'rutinas', 0, 'aviso', 'sin_rutinas',
      'avisos', jsonb_build_array(jsonb_build_object(
        'codigo', 'sin_rutinas',
        'detalle', 'La evaluacion no trae entrenamiento.rutinas: no se creo ninguna rutina. El plan de entrenamiento se lee como prosa en la evaluacion. Si el manual lo trae, va en el JSON como rutinas y se recarga como version nueva.')));
  END IF;

  -- Vinculo coach-cliente: no bloquea (lo crea la 324), pero sin el el hub
  -- dice "tu coach" sin nombre y la consola no ve al cliente.
  SELECT status INTO v_cc_status FROM coach_clients WHERE coach_id = v_caller AND client_id = p_user_id;
  IF COALESCE(v_cc_status, '') <> 'active' THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'sin_vinculo_coach_activo',
      'detalle', format('No hay vinculo coach-cliente activo entre quien corre (%s) y el cliente (estado: %s). Las rutinas se crean igual, pero el hub dira "tu coach" sin nombre. Corre elite_cargar_completa primero o reactiva el vinculo desde el panel.', v_caller, COALESCE(v_cc_status, 'ninguno')));
  END IF;

  -- Catalogo (220) y columna archived_at (232): se comprueban una vez.
  v_catalogo := to_regclass('public.exercise_matrix') IS NOT NULL;
  IF NOT v_catalogo THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'catalogo_no_disponible',
      'detalle', 'exercise_matrix no existe en esta base (migracion 220 sin aplicar): ningun ejercicio se emparejo con el catalogo y todos corren como bloque de tiempo.');
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.routines'::regclass AND attname = 'archived_at' AND NOT attisdropped
  ) INTO v_hay_archived;

  -- M2 (revision en frio, 21-sep-2026): una version NUEVA de la evaluacion
  -- reemplaza el plan. Las rutinas que ESTA funcion creo para versiones
  -- anteriores del mismo cliente (elite_rutinas_cargadas con routine_id y
  -- sin archivar) se ARCHIVAN (routines.archived_at = now(), igual que
  -- archiveRoutines en my-routines) y sus agendas puestas por el coach se
  -- desactivan (is_active = false), para que el hub corra la version nueva y
  -- no la vieja por precedencia (created_at mas antiguo). Las que el cliente
  -- borro (routine_id NULL) o ya archivo no se tocan; una agenda que el
  -- cliente puso el mismo (assigned_by = el) tampoco. Solo cuando la
  -- version nueva trae al menos una rutina con nombre y ejercicios: una
  -- version sin rutinas no deja al cliente sin plan.
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_rutinas) x
    WHERE jsonb_typeof(x) = 'object' AND btrim(COALESCE(x->>'nombre', '')) <> ''
      AND jsonb_typeof(x->'bloques') = 'array' AND jsonb_array_length(x->'bloques') > 0
  ) INTO v_hay_validas;
  IF v_hay_validas THEN
    FOR v_prev IN
      SELECT c.routine_id, c.nombre, c.version_elite, c.cargado_por
      FROM elite_rutinas_cargadas c
      JOIN routines r ON r.id = c.routine_id
      WHERE c.user_id = p_user_id AND c.dx_id <> v_dx_id AND c.routine_id IS NOT NULL
        AND (to_jsonb(r)->>'archived_at') IS NULL
      ORDER BY c.version_elite, c.created_at
    LOOP
      IF NOT v_hay_archived THEN
        v_avisos := v_avisos || jsonb_build_object(
          'codigo', 'archivado_sin_columna',
          'detalle', 'routines.archived_at no existe en esta base (migracion 232 sin aplicar): las rutinas de la version anterior siguen vigentes y agendadas. Archivalas a mano o aplica la 232 y vuelve a correr.');
        EXIT;
      END IF;
      UPDATE routines SET archived_at = now() WHERE id = v_prev.routine_id;
      v_prev_archivadas := v_prev_archivadas + 1;
      UPDATE scheduled_routines SET is_active = false
      WHERE user_id = p_user_id AND routine_id = v_prev.routine_id AND is_active
        AND assigned_by IS NOT NULL AND assigned_by IN (v_prev.cargado_por, v_caller);
      GET DIAGNOSTICS v_n = ROW_COUNT;
      v_prev_agendas := v_prev_agendas + v_n;
      v_prev_nombres := array_append(v_prev_nombres, format('%s (v%s)', v_prev.nombre, COALESCE(v_prev.version_elite::text, '?')));
    END LOOP;
  END IF;

  FOR v_r, v_idx IN SELECT value, ordinality FROM jsonb_array_elements(v_rutinas) WITH ORDINALITY LOOP
    IF jsonb_typeof(v_r) <> 'object' THEN v_invalidas := v_invalidas + 1; CONTINUE; END IF;
    v_nombre := btrim(COALESCE(v_r->>'nombre', ''));
    IF v_nombre = '' OR jsonb_typeof(v_r->'bloques') <> 'array' OR jsonb_array_length(v_r->'bloques') = 0 THEN
      v_invalidas := v_invalidas + 1; CONTINUE;
    END IF;
    v_norm := public.elite_325_norm(v_nombre);

    -- m6: dos rutinas del mismo documento con el mismo nombre: entra la
    -- primera, la segunda se avisa (la llave de idempotencia es por nombre).
    IF v_norm = ANY(v_norms_vistas) THEN
      v_duplicadas := array_append(v_duplicadas, v_nombre);
      CONTINUE;
    END IF;
    v_norms_vistas := array_append(v_norms_vistas, v_norm);

    -- Idempotencia por (cliente, evaluacion, nombre). archived_at se lee via
    -- to_jsonb para no depender de que la 232 este aplicada.
    SELECT c.routine_id, (to_jsonb(r)->>'archived_at') IS NOT NULL AS archivada INTO v_previa
    FROM elite_rutinas_cargadas c
    LEFT JOIN routines r ON r.id = c.routine_id
    WHERE c.user_id = p_user_id AND c.dx_id = v_dx_id AND c.nombre_norm = v_norm;
    IF FOUND THEN
      v_ya := v_ya + 1;
      v_ya_nombres := array_append(v_ya_nombres, format('%s (%s)', v_nombre,
        CASE WHEN v_previa.routine_id IS NULL THEN 'el cliente la borro; no se recrea'
             WHEN v_previa.archivada THEN 'el cliente la archivo; se queda asi'
             ELSE 'vigente' END));
      CONTINUE;
    END IF;

    -- m2: rutina PROPIA del cliente (no creada por esta funcion) con el
    -- mismo nombre. Se crea la de la evaluacion igual (es otra rutina), se
    -- avisa, y NO se agenda en los dias donde la propia ya esta agendada:
    -- la propia manda; el cliente decide.
    SELECT count(*) INTO v_propias
    FROM routines r
    WHERE r.creator_id = p_user_id
      AND (to_jsonb(r)->>'archived_at') IS NULL
      AND public.elite_325_norm(r.name) = v_norm
      AND NOT EXISTS (SELECT 1 FROM elite_rutinas_cargadas c WHERE c.routine_id = r.id);
    IF v_propias > 0 THEN
      v_con_nombre_propio := array_append(v_con_nombre_propio, v_nombre);
    END IF;

    v_objetivo := NULLIF(btrim(COALESCE(v_r->>'objetivo', '')), '');
    v_notas_r := NULLIF(btrim(COALESCE(v_r->>'notas', '')), '');
    v_descripcion := concat_ws(' ',
      CASE WHEN v_objetivo IS NULL THEN NULL ELSE rtrim(v_objetivo, '.') || '.' END,
      CASE WHEN v_notas_r IS NULL THEN NULL ELSE rtrim(v_notas_r, '.') || '.' END,
      format('De tu evaluación Elite v%s, asignada por %s.', v_version, v_firma));

    -- La rutina es DEL CLIENTE (creator_id), como las que deja
    -- assign_routine_to_client via clone_routine; el coach queda como
    -- original_creator_id. Mismas columnas que escribe clone_routine (232).
    INSERT INTO routines (creator_id, name, description, category, mode)
    VALUES (p_user_id, v_nombre, v_descripcion, 'workout', 'routine')
    RETURNING id INTO v_routine_id;
    UPDATE routines SET original_creator_id = v_caller WHERE id = v_routine_id;

    -- Bloques: un `work` hoja por ejercicio, en el orden del documento.
    -- sort_order es contiguo (cuenta solo bloques validos, m4).
    v_bloques_rutina := 0;
    FOR v_b IN SELECT value FROM jsonb_array_elements(v_r->'bloques') LOOP
      IF jsonb_typeof(v_b) <> 'object' THEN CONTINUE; END IF;
      v_ejercicio := btrim(COALESCE(v_b->>'ejercicio', ''));
      IF v_ejercicio = '' THEN CONTINUE; END IF;

      -- series 1..20 y descanso_s 0..600: fuera de rango se degrada (NULL)
      -- y se avisa por nombre (m5). Se compara en numeric para que un
      -- numero enorme no reviente el cast a int.
      v_series := NULL; v_descanso := NULL; v_fuera := false;
      IF v_b ? 'series' AND jsonb_typeof(v_b->'series') <> 'null' THEN
        IF jsonb_typeof(v_b->'series') = 'number' AND (v_b->>'series') ~ '^[0-9]+$'
           AND (v_b->>'series')::numeric BETWEEN 1 AND 20 THEN
          v_series := (v_b->>'series')::int;
        ELSE
          v_fuera := true;
        END IF;
      END IF;
      IF v_b ? 'descanso_s' AND jsonb_typeof(v_b->'descanso_s') <> 'null' THEN
        IF jsonb_typeof(v_b->'descanso_s') = 'number' AND (v_b->>'descanso_s')::numeric BETWEEN 0 AND 600 THEN
          v_descanso := round((v_b->>'descanso_s')::numeric)::int;
        ELSE
          v_fuera := true;
        END IF;
      END IF;
      IF v_fuera THEN
        v_fuera_rango := array_append(v_fuera_rango, format('%s (series %s, descanso_s %s)', v_ejercicio, COALESCE(v_b->>'series', 'null'), COALESCE(v_b->>'descanso_s', 'null')));
      END IF;
      v_reps := NULLIF(btrim(COALESCE(v_b->>'reps', '')), '');
      v_notas_b := NULLIF(btrim(COALESCE(v_b->>'notas', '')), '');
      v_slug_doc := NULLIF(btrim(COALESCE(v_b->>'slug', '')), '');

      -- Ejercicio del catalogo (M1-b). El catalogo exercise_matrix (220,
      -- seed 223) esta en INGLES (MoveKit: "Barbell Bench Press"); el
      -- nombre en espanol del documento casi nunca pega. Orden:
      --   1. `slug` del bloque, exacto contra exercise_matrix.slug (la
      --      forma segura de fijar el clip);
      --   2. nombre normalizado (sin acentos ni mayusculas) contra nombre;
      --   3. `familia` (en espanol: "Peso muerto", "Face pull") SOLO si es
      --      una sola fila del catalogo.
      -- Sin prefijos ni parecidos: un emparejamiento equivocado pone un
      -- clip ajeno en la rutina del cliente.
      v_slug := NULL;
      IF v_catalogo THEN
        BEGIN
          IF v_slug_doc IS NOT NULL THEN
            SELECT slug INTO v_slug FROM exercise_matrix WHERE slug = v_slug_doc;
            IF v_slug IS NULL THEN
              v_slug_no_encontrado := array_append(v_slug_no_encontrado, format('%s (%s)', v_ejercicio, v_slug_doc));
            END IF;
          END IF;
          IF v_slug IS NULL THEN
            SELECT slug INTO v_slug FROM exercise_matrix
            WHERE public.elite_325_norm(nombre) = public.elite_325_norm(v_ejercicio)
            ORDER BY slug LIMIT 1;
          END IF;
          IF v_slug IS NULL THEN
            SELECT CASE WHEN count(*) = 1 THEN min(slug) ELSE NULL END INTO v_slug
            FROM exercise_matrix
            WHERE public.elite_325_norm(familia) = public.elite_325_norm(v_ejercicio);
          END IF;
        EXCEPTION WHEN undefined_table OR undefined_column THEN
          v_catalogo := false; v_slug := NULL;
          v_avisos := v_avisos || jsonb_build_object(
            'codigo', 'catalogo_no_disponible',
            'detalle', format('exercise_matrix no se pudo leer (%s): ningun ejercicio se emparejo con el catalogo y todos corren como bloque de tiempo.', SQLERRM));
        END;
      END IF;
      v_ex_id := NULL;
      IF v_slug IS NOT NULL THEN
        BEGIN
          SELECT id INTO v_ex_id FROM exercises WHERE matrix_slug = v_slug LIMIT 1;
        EXCEPTION WHEN undefined_table OR undefined_column THEN v_ex_id := NULL;
        END;
      END IF;

      -- "3 x 8-10" cuando hay series y reps; una sola serie se dice con sus
      -- reps a secas ("45 min"), no "1 x 45 min".
      v_prescripcion := concat_ws(', ',
        CASE WHEN v_series IS NOT NULL AND v_series > 1 AND v_reps IS NOT NULL THEN format('%s series x %s', v_series, v_reps)
             WHEN v_series IS NOT NULL AND v_series > 1 THEN format('%s series', v_series)
             WHEN v_reps IS NOT NULL THEN v_reps END,
        CASE WHEN v_descanso IS NOT NULL AND v_descanso > 0 THEN format('descanso %s s', v_descanso) END);
      -- label: etiqueta corta para el runner y el builder, tope 80 (M1-d).
      -- La prosa completa (prescripcion + notas del clinico) va en notes,
      -- tope 500. El nombre en espanol se conserva como etiqueta aunque el
      -- bloque traiga clip del catalogo en ingles.
      v_label := v_ejercicio || CASE
        WHEN v_series IS NOT NULL AND v_series > 1 AND v_reps IS NOT NULL THEN format(' · %s x %s', v_series, v_reps)
        WHEN v_series IS NOT NULL AND v_series > 1 THEN format(' · %s series', v_series)
        WHEN v_reps IS NOT NULL THEN ' · ' || v_reps
        ELSE '' END;
      IF length(v_label) > 80 THEN v_label := rtrim(left(v_label, 79)) || '…'; END IF;
      v_notes := concat_ws('. ', NULLIF(v_prescripcion, ''), v_notas_b);
      IF length(v_notes) > 500 THEN v_notes := rtrim(left(v_notes, 499)) || '…'; END IF;

      -- Sin matriz el runner lo corre como tiempo. La duracion se deriva
      -- SOLO cuando reps es limpio (M1-a): "8", "8-10" -> 4 s por rep con el
      -- ultimo numero; "30 s" / "30 seg" -> segundos; "45 min" -> minutos.
      -- Cualquier prosa ("10 por lado", "6 reps", "8 min · 8 al minuto",
      -- "15 dejando 2 en el tanque + 3 mini") NO se interpreta: 40 s fijos y
      -- aviso duracion_no_derivada con el nombre, para que Enrique lo fije.
      -- Tope 1800 s (30 min) en todos los casos. Con matriz la duracion no
      -- se usa (series y descanso salen de rounds y rest_between_seconds).
      v_duracion := NULL;
      IF v_slug IS NULL THEN
        IF v_reps ~ '^\d+(-\d+)?$' THEN
          v_num := (regexp_match(v_reps, '(\d+)$'))[1]::numeric;
          v_duracion := LEAST(GREATEST(v_num * 4, 15), 1800)::int;
        ELSIF v_reps ~* '^\d+ ?(s|seg)$' THEN
          v_num := (regexp_match(v_reps, '^(\d+)'))[1]::numeric;
          v_duracion := LEAST(GREATEST(v_num, 5), 1800)::int;
        ELSIF v_reps ~* '^\d+ ?min$' THEN
          v_num := (regexp_match(v_reps, '^(\d+)'))[1]::numeric;
          v_duracion := LEAST(GREATEST(v_num * 60, 60), 1800)::int;
        ELSE
          v_duracion := 40;
          v_no_derivada := array_append(v_no_derivada, format('%s (reps: %s)', v_ejercicio, COALESCE(v_reps, 'sin reps')));
        END IF;
      END IF;

      INSERT INTO blocks (
        routine_id, parent_block_id, sort_order, type, label,
        duration_seconds, rounds, rest_between_seconds,
        color, sound_start, sound_end, notes,
        exercise_id, suggested_rest_seconds, matrix_slug
      ) VALUES (
        v_routine_id, NULL, v_bloques_rutina, 'work', v_label,
        v_duracion, COALESCE(v_series, 1), COALESCE(v_descanso, 0),
        NULL, 'default', 'default', v_notes,
        v_ex_id, v_descanso, v_slug
      );
      v_bloques := v_bloques + 1;
      v_bloques_rutina := v_bloques_rutina + 1;
      IF v_slug IS NULL THEN
        v_sin_matriz := v_sin_matriz + 1;
        v_sin_matriz_nombres := array_append(v_sin_matriz_nombres, v_ejercicio);
      ELSE
        v_con_matriz := v_con_matriz + 1;
      END IF;
    END LOOP;

    IF v_bloques_rutina = 0 THEN
      -- Todos los bloques venian sin ejercicio: una rutina vacia manda al
      -- builder. Se deshace y se cuenta como invalida.
      DELETE FROM routines WHERE id = v_routine_id;
      v_invalidas := v_invalidas + 1;
      CONTINUE;
    END IF;

    -- Agenda: un renglon por dia UNICO valido (1 = lunes ... 7 = domingo ->
    -- DOW 1..6, 0). Un dia donde la rutina propia del cliente con el mismo
    -- nombre ya esta agendada no se pisa (m2).
    v_dias_ok := 0; v_dias_propia := 0; v_agendas_rutina := 0; v_dias_vistos := '{}';
    v_dias := v_r->'dias_semana';
    IF jsonb_typeof(v_dias) = 'array' THEN
      FOR v_dia IN SELECT value FROM jsonb_array_elements(v_dias) LOOP
        IF jsonb_typeof(v_dia) <> 'number' OR (v_dia::text) !~ '^[1-7]$' THEN CONTINUE; END IF;
        v_dow := (v_dia::text)::int % 7;
        IF v_dow = ANY(v_dias_vistos) THEN CONTINUE; END IF;
        v_dias_vistos := array_append(v_dias_vistos, v_dow);
        v_dias_ok := v_dias_ok + 1;
        IF v_propias > 0 AND EXISTS (
          SELECT 1 FROM scheduled_routines s
          JOIN routines r ON r.id = s.routine_id
          WHERE s.user_id = p_user_id AND s.is_active AND s.schedule_type = 'weekly_cycle' AND s.day_of_week = v_dow
            AND r.creator_id = p_user_id AND (to_jsonb(r)->>'archived_at') IS NULL
            AND public.elite_325_norm(r.name) = v_norm
            AND NOT EXISTS (SELECT 1 FROM elite_rutinas_cargadas c WHERE c.routine_id = r.id)
        ) THEN
          v_dias_propia := v_dias_propia + 1;
          CONTINUE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM scheduled_routines
          WHERE user_id = p_user_id AND routine_id = v_routine_id
            AND schedule_type = 'weekly_cycle' AND day_of_week = v_dow
        ) THEN
          INSERT INTO scheduled_routines (user_id, routine_id, assigned_by, schedule_type, day_of_week, specific_date, is_active)
          VALUES (p_user_id, v_routine_id, v_caller, 'weekly_cycle', v_dow, NULL, true);
          v_agendas := v_agendas + 1;
          v_agendas_rutina := v_agendas_rutina + 1;
        END IF;
      END LOOP;
    END IF;
    IF v_dias_ok = 0 THEN v_sin_agenda := array_append(v_sin_agenda, v_nombre); END IF;
    IF v_dias_propia > 0 THEN
      -- Se anota en el mismo aviso de nombre propio, con los dias que no se
      -- agendaron.
      v_con_nombre_propio[array_length(v_con_nombre_propio, 1)] :=
        format('%s (%s dia(s) sin agendar porque la propia ya esta ahi)', v_nombre, v_dias_propia);
    END IF;

    INSERT INTO elite_rutinas_cargadas (user_id, dx_id, version_elite, nombre, nombre_norm, routine_id, cargado_por)
    VALUES (p_user_id, v_dx_id, v_version, v_nombre, v_norm, v_routine_id, v_caller);
    v_creadas := v_creadas + 1;
    v_ids := v_ids || jsonb_build_object('nombre', v_nombre, 'routine_id', v_routine_id, 'bloques', v_bloques_rutina, 'dias', v_dias_ok, 'agendas', v_agendas_rutina);
  END LOOP;

  IF v_prev_archivadas > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'rutinas_version_anterior_archivadas',
      'detalle', format('%s rutina(s) de versiones anteriores de la evaluacion se archivaron (siguen en la base, recuperables) y %s agenda(s) del coach se desactivaron para que el hub corra la version %s: %s.', v_prev_archivadas, v_prev_agendas, COALESCE(v_version::text, '?'), array_to_string(v_prev_nombres, '; ')));
  END IF;
  IF v_ya > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'rutina_ya_cargada',
      'detalle', format('%s rutina(s) de esta evaluacion ya estaban cargadas y no se duplicaron: %s.', v_ya, array_to_string(v_ya_nombres, '; ')));
  END IF;
  IF array_length(v_duplicadas, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'rutina_duplicada_en_documento',
      'detalle', format('%s rutina(s) repiten el nombre de otra del mismo documento y se saltaron (solo entro la primera): %s. Ponles nombre distinto en el JSON.', array_length(v_duplicadas, 1), array_to_string(v_duplicadas, '; ')));
  END IF;
  IF array_length(v_con_nombre_propio, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'rutina_con_nombre_del_cliente',
      'detalle', format('%s rutina(s) tienen el mismo nombre que una rutina propia del cliente. La de la evaluacion se creo aparte y no se agendo en los dias donde la propia ya esta agendada (la propia manda; el cliente decide): %s.', array_length(v_con_nombre_propio, 1), array_to_string(v_con_nombre_propio, '; ')));
  END IF;
  IF array_length(v_sin_agenda, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'rutina_sin_agenda',
      'detalle', format('%s rutina(s) sin dias_semana: quedan en Mis rutinas sin agenda semanal: %s.', array_length(v_sin_agenda, 1), array_to_string(v_sin_agenda, '; ')));
  END IF;
  IF array_length(v_slug_no_encontrado, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'slug_no_encontrado',
      'detalle', format('%s bloque(s) traen un slug que no existe en exercise_matrix y se emparejaron por nombre o quedaron sin clip: %s. Copia el slug tal cual del catalogo.', array_length(v_slug_no_encontrado, 1), array_to_string(v_slug_no_encontrado, '; ')));
  END IF;
  IF v_sin_matriz > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'ejercicios_fuera_del_catalogo',
      'detalle', format('%s ejercicio(s) no se emparejaron con exercise_matrix y corren como bloque de tiempo (sin clip ni registro de series): %s. El catalogo esta en ingles (MoveKit: "Barbell Bench Press", "Machine Leg Press"); el nombre en espanol se conserva como etiqueta del bloque. Para que corra con clip, pon en el bloque `slug` con el slug exacto del catalogo (barbell-bench-press, machine-leg-press) o asignalo en el builder.', v_sin_matriz, array_to_string(v_sin_matriz_nombres, ', ')));
  END IF;
  IF array_length(v_no_derivada, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'duracion_no_derivada',
      'detalle', format('%s bloque(s) sin clip traen reps en prosa y quedaron con 40 s fijos por serie (la prescripcion completa va en las notas del bloque): %s. Para que el tiempo salga de las reps, escribe reps limpio ("8", "8-10", "30 s", "45 min") o fija el slug del catalogo.', array_length(v_no_derivada, 1), array_to_string(v_no_derivada, '; ')));
  END IF;
  IF array_length(v_fuera_rango, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'bloque_fuera_de_rango',
      'detalle', format('%s bloque(s) traen series fuera de 1..20 o descanso_s fuera de 0..600 y ese dato se ignoro (rounds 1 o descanso 0): %s.', array_length(v_fuera_rango, 1), array_to_string(v_fuera_rango, '; ')));
  END IF;
  IF v_invalidas > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'rutinas_invalidas',
      'detalle', format('%s rutina(s) sin nombre o sin ejercicios se saltaron.', v_invalidas));
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'dx_id', v_dx_id,
    'version_elite', v_version,
    'rutinas', v_creadas,
    'rutinas_ya_cargadas', v_ya,
    'rutinas_invalidas', v_invalidas,
    'rutinas_version_anterior_archivadas', v_prev_archivadas,
    'agendas', v_agendas,
    'agendas_version_anterior_desactivadas', v_prev_agendas,
    'bloques', v_bloques,
    'bloques_con_matriz', v_con_matriz,
    'bloques_sin_matriz', v_sin_matriz,
    'rutinas_detalle', v_ids,
    'avisos', v_avisos);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. elite_cargar_comidas
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.elite_cargar_comidas(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_ctx jsonb;
  v_dx_id uuid;
  v_version int;
  v_ev jsonb;
  v_alim jsonb;
  v_comidas jsonb;
  v_metas jsonb;
  v_plan record;
  v_c jsonb;
  v_momento text;
  v_hora text;
  v_nombre text;
  v_componentes jsonb;
  v_notas text;
  v_meals jsonb := '[]'::jsonb;
  v_invalidas int := 0;
  v_horas_malas int := 0;
  v_kcal int;
  v_grasa int;
  v_carb int;
  v_comidas_escritas int := 0;
  v_comidas_respetadas int := 0;
  v_macros_escritos jsonb := '[]'::jsonb;
  v_macros_respetados jsonb := '[]'::jsonb;
  v_hay_cambio boolean := false;
  v_avisos jsonb := '[]'::jsonb;
BEGIN
  v_ctx := public.elite_325_contexto(p_user_id);
  IF COALESCE((v_ctx->>'ok')::boolean, false) IS DISTINCT FROM true THEN
    RETURN v_ctx;
  END IF;
  v_dx_id := (v_ctx->>'dx_id')::uuid;
  v_version := (v_ctx->>'version_elite')::int;
  v_ev := v_ctx->'elite_v3';

  PERFORM pg_advisory_xact_lock(hashtextextended('functional_dx:' || p_user_id::text, 0));

  v_alim := CASE WHEN jsonb_typeof(v_ev->'alimentacion') = 'object' THEN v_ev->'alimentacion' ELSE '{}'::jsonb END;
  v_comidas := CASE WHEN jsonb_typeof(v_alim->'comidas') = 'array' THEN v_alim->'comidas' ELSE '[]'::jsonb END;
  v_metas := CASE WHEN jsonb_typeof(v_alim->'metas') = 'object' THEN v_alim->'metas' ELSE '{}'::jsonb END;

  IF (v_metas->>'kcal_dia') ~ '^[0-9]+(\.[0-9]+)?$' AND (v_metas->>'kcal_dia')::numeric > 0 THEN v_kcal := round((v_metas->>'kcal_dia')::numeric)::int; END IF;
  IF (v_metas->>'grasa_g_dia') ~ '^[0-9]+(\.[0-9]+)?$' AND (v_metas->>'grasa_g_dia')::numeric > 0 THEN v_grasa := round((v_metas->>'grasa_g_dia')::numeric)::int; END IF;
  IF (v_metas->>'carbohidrato_g_dia') ~ '^[0-9]+(\.[0-9]+)?$' AND (v_metas->>'carbohidrato_g_dia')::numeric > 0 THEN v_carb := round((v_metas->>'carbohidrato_g_dia')::numeric)::int; END IF;

  -- Comidas con forma: momento del enum, nombre, componentes de texto; hora
  -- de reloj o null. Se guardan normalizadas, tal cual el esquema.
  FOR v_c IN SELECT value FROM jsonb_array_elements(v_comidas) LOOP
    IF jsonb_typeof(v_c) <> 'object' THEN v_invalidas := v_invalidas + 1; CONTINUE; END IF;
    v_momento := lower(btrim(COALESCE(v_c->>'momento', '')));
    v_nombre := btrim(COALESCE(v_c->>'nombre', ''));
    v_componentes := CASE WHEN jsonb_typeof(v_c->'componentes') = 'array' THEN v_c->'componentes' ELSE NULL END;
    IF v_momento NOT IN ('desayuno', 'comida', 'cena', 'colacion', 'pre_entreno', 'post_entreno')
       OR v_nombre = '' OR v_componentes IS NULL
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_componentes) x WHERE jsonb_typeof(x) <> 'string') THEN
      v_invalidas := v_invalidas + 1; CONTINUE;
    END IF;
    v_hora := btrim(COALESCE(v_c->>'hora', ''));
    IF v_hora = '' THEN
      v_hora := NULL;
    ELSIF v_hora !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
      v_horas_malas := v_horas_malas + 1; v_hora := NULL;
    END IF;
    v_notas := NULLIF(btrim(COALESCE(v_c->>'notas', '')), '');
    v_meals := v_meals || jsonb_build_object(
      'momento', v_momento, 'hora', v_hora, 'nombre', v_nombre,
      'componentes', v_componentes, 'notas', v_notas);
  END LOOP;

  IF jsonb_array_length(v_meals) = 0 AND v_kcal IS NULL AND v_grasa IS NULL AND v_carb IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true, 'dx_id', v_dx_id, 'version_elite', v_version,
      'comidas', 0, 'aviso', 'sin_comidas',
      'avisos', jsonb_build_array(jsonb_build_object(
        'codigo', 'sin_comidas',
        'detalle', 'La evaluacion no trae alimentacion.comidas ni metas de kcal, grasa o carbohidrato: el plan de Comida se queda como lo dejo la 324 (prioriza, evita, ventana, horarios, proteina y agua). Si el manual trae comidas, van en el JSON y se recargan como version nueva.'))
        || CASE WHEN v_invalidas > 0 THEN jsonb_build_array(jsonb_build_object('codigo', 'comidas_invalidas', 'detalle', format('%s comida(s) sin momento valido, nombre o componentes se saltaron.', v_invalidas))) ELSE '[]'::jsonb END);
  END IF;

  -- El plan Elite de ESTA version, el que creo la 324. Ningun otro.
  SELECT id, meals, calorie_target, fat_target, carb_target, status INTO v_plan
  FROM nutrition_plans
  WHERE user_id = p_user_id AND name = format('Plan Elite v%s', v_version)
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true, 'dx_id', v_dx_id, 'version_elite', v_version,
      'comidas', 0, 'aviso', 'sin_plan_elite',
      'avisos', jsonb_build_array(jsonb_build_object(
        'codigo', 'sin_plan_elite',
        'detalle', format('No existe el plan "Plan Elite v%s" en nutrition_plans (la 324 no lo creo, por ejemplo porque alimentacion vino sin prioriza, evita, ventana, horarios ni metas de proteina o agua). No se crea otro desde aqui: las %s comidas y las metas se leen en la evaluacion. Corre elite_cargar_completa con una version que traiga la seccion alimentacion.', v_version, jsonb_array_length(v_meals)))));
  END IF;

  IF jsonb_array_length(v_meals) > 0 THEN
    IF v_plan.meals IS NULL OR jsonb_typeof(v_plan.meals) <> 'array' OR jsonb_array_length(v_plan.meals) = 0 THEN
      UPDATE nutrition_plans SET meals = v_meals, updated_at = now() WHERE id = v_plan.id;
      v_comidas_escritas := jsonb_array_length(v_meals);
      v_hay_cambio := true;
    ELSE
      v_comidas_respetadas := jsonb_array_length(v_plan.meals);
      v_avisos := v_avisos || jsonb_build_object(
        'codigo', 'comidas_ya_cargadas',
        'detalle', format('El plan Elite v%s ya tiene %s comida(s) y no se pisaron.', v_version, v_comidas_respetadas));
    END IF;
  END IF;

  IF v_kcal IS NOT NULL THEN
    IF v_plan.calorie_target IS NULL THEN
      UPDATE nutrition_plans SET calorie_target = v_kcal, updated_at = now() WHERE id = v_plan.id;
      v_macros_escritos := v_macros_escritos || to_jsonb('calorie_target'::text);
    ELSE
      v_macros_respetados := v_macros_respetados || jsonb_build_object('meta', 'calorie_target', 'del_plan', v_plan.calorie_target, 'del_documento', v_kcal);
    END IF;
  END IF;
  IF v_grasa IS NOT NULL THEN
    IF v_plan.fat_target IS NULL THEN
      UPDATE nutrition_plans SET fat_target = v_grasa, updated_at = now() WHERE id = v_plan.id;
      v_macros_escritos := v_macros_escritos || to_jsonb('fat_target'::text);
    ELSE
      v_macros_respetados := v_macros_respetados || jsonb_build_object('meta', 'fat_target', 'del_plan', v_plan.fat_target, 'del_documento', v_grasa);
    END IF;
  END IF;
  IF v_carb IS NOT NULL THEN
    IF v_plan.carb_target IS NULL THEN
      UPDATE nutrition_plans SET carb_target = v_carb, updated_at = now() WHERE id = v_plan.id;
      v_macros_escritos := v_macros_escritos || to_jsonb('carb_target'::text);
    ELSE
      v_macros_respetados := v_macros_respetados || jsonb_build_object('meta', 'carb_target', 'del_plan', v_plan.carb_target, 'del_documento', v_carb);
    END IF;
  END IF;
  IF jsonb_array_length(v_macros_respetados) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'metas_del_plan_respetadas',
      'detalle', format('El plan Elite v%s ya tenia %s meta(s) de macros y se respetaron: %s', v_version, jsonb_array_length(v_macros_respetados), v_macros_respetados::text));
  END IF;
  IF v_invalidas > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'comidas_invalidas',
      'detalle', format('%s comida(s) sin momento valido, nombre o componentes se saltaron.', v_invalidas));
  END IF;
  IF v_horas_malas > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'comidas_hora_invalida',
      'detalle', format('%s comida(s) traian una hora que no es de reloj (HH:MM) y entraron sin hora.', v_horas_malas));
  END IF;
  IF v_plan.status IS DISTINCT FROM 'active' THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'plan_elite_no_activo',
      'detalle', format('El plan Elite v%s esta en "%s": las comidas quedaron escritas ahi, pero Comida solo pinta el plan activo. No se cambio el estado desde aqui.', v_version, v_plan.status));
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'dx_id', v_dx_id,
    'version_elite', v_version,
    'nutrition_plan_id', v_plan.id,
    'comidas', v_comidas_escritas,
    'comidas_respetadas', v_comidas_respetadas,
    'macros_escritos', v_macros_escritos,
    'macros_respetados', v_macros_respetados,
    'avisos', v_avisos);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Permisos: mismo gate que la 318 (admin con sesion, adentro). anon y
--    PUBLIC no las llaman.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.elite_sembrar_perfil(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.elite_sembrar_perfil(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.elite_sembrar_perfil(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.elite_sembrar_perfil(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.elite_cargar_rutinas(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.elite_cargar_rutinas(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.elite_cargar_rutinas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.elite_cargar_rutinas(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.elite_cargar_comidas(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.elite_cargar_comidas(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.elite_cargar_comidas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.elite_cargar_comidas(uuid) TO service_role;

COMMENT ON FUNCTION public.elite_sembrar_perfil(uuid) IS
  'ATP 3.0 (325): siembra desde la evaluacion Elite vigente lo que cardio y fitness necesitan (sexo, fecha de nacimiento, estatura, peso, FC en reposo, nivel), SOLO donde el cliente no tiene el suyo. Solo admin con sesion.';
COMMENT ON FUNCTION public.elite_cargar_rutinas(uuid) IS
  'ATP 3.0 (325): convierte entrenamiento.rutinas de la evaluacion Elite vigente en rutinas del cliente (routines + blocks) agendadas en scheduled_routines; clip por slug, nombre o familia unica de exercise_matrix. Idempotente por (cliente, evaluacion, nombre); una version nueva archiva las rutinas que esta funcion creo para la anterior. Solo admin con sesion.';
COMMENT ON FUNCTION public.elite_cargar_comidas(uuid) IS
  'ATP 3.0 (325): escribe alimentacion.comidas y las metas de kcal, grasa y carbohidrato en el Plan Elite vN de nutrition_plans, solo donde esta vacio. Solo admin con sesion.';

COMMIT;
