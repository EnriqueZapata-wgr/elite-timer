-- 324_elite_cargar_completa.sql
-- Fecha: 2026-09-20 (noche Elite, bloque evaluacion y suplementos). NO se
-- ejecuta desde Cowork: la aplica Enrique con `npx supabase db push`.
-- Requiere 318, 321 y 323 aplicadas: envuelve a `elite_cargar_evaluacion`
-- (318 + 321) y su gate de admin lee `profiles.role`, columna que blinda la
-- 323 (sin ella cualquiera podia nombrarse admin en una consulta).
--
-- POR QUE EXISTE. La carga Elite dejaba la evaluacion en `functional_dx` y el
-- plan en `user_supplements`, y nada mas. Cuatro piezas del producto que el
-- cliente si paga se quedaban sin llenar, y cada una es una pantalla que el
-- dia uno se ve vacia o rota:
--
--   1. `coach_clients`. Sin fila activa entre Enrique y el cliente,
--      `assign_routine_to_client` (002) lanza "Not authorized", la consola de
--      coach (323) no ve a ese cliente y `curl-elite.sh ver` dice que no hay
--      evaluaciones. El cliente Elite no era cliente de su coach.
--   2. `nutrition_plans` (027). La seccion `alimentacion` de la evaluacion
--      (prioriza, evita, ventana, horarios) calca las columnas de esa tabla
--      y nunca se escribia: Comida no tenia plan que ensenar.
--   3. `user_day_preferences.goals`. Las metas de proteina y agua del manual
--      no llegaban al dia del cliente. Se escriben SOLO si la persona no
--      tiene ya las suyas: un numero que alguien fijo no se cambia en silencio.
--   4. `lab_values`. Los marcadores medidos vivian dentro del JSON. El
--      expediente de labs, el comparador y ARGOS leen `lab_values`, asi que
--      para ellos el cliente llegaba sin laboratorios aunque acabara de pagar
--      por la lectura de treinta.
--
-- COMO LO HACE. `elite_cargar_completa(p_user, p_payload)` tiene la MISMA
-- firma que `elite_cargar_evaluacion`, la llama primero (gate de admin con
-- sesion, version_elite = previas + 1, functional_dx append-only, plan de
-- suplementos con todas sus reglas) y, si esa respondio ok, hace las cuatro
-- escrituras de arriba en la MISMA transaccion. Una falla real de la base
-- revierte todo, incluida la evaluacion: nada queda a medias. Una regla de
-- negocio (cliente que ya tiene sus metas, laboratorio que ya existe para esa
-- fecha) no revierte nada: se respeta y se dice en `avisos`.
--
-- QUE NO HACE, a proposito:
--   - No revive un vinculo coach-cliente que el cliente puso en 'inactive'
--     (desde Ajustes puede desconectar a su coach). Se avisa y se deja.
--   - No pisa una fila viva de `lab_values` con el mismo dato y la misma
--     fecha, venga de donde venga (regla de la 308: un valor vivo por dato y
--     fecha). Se avisa por nombre.
--   - No inventa la clave canonica de un marcador. El payload trae
--     `lab_values_filas` ya resueltas por `elite-lab-values-core.ts` con los
--     mismos mapas del cliente (lab-canonical-map, matriz V7/V6); lo que no
--     mapea viene en `lab_values_omitidos` y aqui solo se repite como aviso.
--   - No inventa el dia de la toma. Si `cliente.fecha_toma` trae solo el mes
--     (YYYY-MM), los labs entran con el dia 1 y lo dicen: en `metadata`
--     (`dia_asumido: true`, `fecha_toma_documento`) y en `avisos`.
--   - No escribe `nutrition_plans` cuando la seccion viene vacia: un plan sin
--     contenido es una tarjeta vacia en Comida. Se avisa.
--   - No borra nada. Los planes activos anteriores del cliente pasan a
--     'paused' (misma regla que `createPlan` del panel de coach: un solo
--     plan activo por persona) y se cuentan en la respuesta.
--
-- Devuelve lo mismo que la 321 mas: `coach_client` ('creado' |
-- 'ya_activo' | 'inactivo_respetado'), `nutrition_plan_id`,
-- `nutrition_plans_pausados`, `metas_escritas`, `metas_respetadas`,
-- `lab_values_escritos`, `lab_values_respetados`, `lab_values_omitidos`,
-- `lab_values_measured_at`, y en `avisos` los codigos nuevos:
--   coach_client_inactivo, sin_plan_alimentacion, nutrition_plan_pausado,
--   metas_del_cliente_respetadas, sin_lab_values, labs_sin_fecha,
--   labs_dia_asumido, labs_existentes_respetados, marcadores_sin_clave,
--   marcadores_fuera_de_labs, labs_filas_invalidas.
--
-- Reversible: `lab_values` lleva `metadata->>'dx_id'` de la evaluacion y
-- `nutrition_plans.name` es 'Plan Elite vN'; con eso se anulan (is_voided /
-- status) sin tocar nada del cliente.
--
-- Idempotente: CREATE OR REPLACE, se puede correr dos veces. La carga en si
-- no lo es dos veces por diseno (version_mismatch en la segunda), igual que
-- en la 318.

BEGIN;

CREATE OR REPLACE FUNCTION public.elite_cargar_completa(
  p_user uuid,
  p_payload jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_base jsonb;
  v_avisos jsonb;
  v_dx_id uuid;
  v_version_elite int;
  v_firma text;
  -- coach_clients
  v_cc_status text;
  v_coach_client text;
  -- nutrition_plans
  v_alim jsonb;
  v_prioriza jsonb := '[]'::jsonb;
  v_evita jsonb := '[]'::jsonb;
  v_horarios jsonb := '[]'::jsonb;
  v_notas text;
  v_ventana_ini time;
  v_ventana_fin time;
  v_ayuno_horas int;
  v_meta_prot numeric;
  v_meta_agua numeric;
  v_plan_id uuid;
  v_planes_pausados int := 0;
  v_hay_alimentacion boolean;
  -- goals
  v_goals jsonb;
  v_goals_nuevos jsonb := '{}'::jsonb;
  v_metas_escritas jsonb := '[]'::jsonb;
  v_metas_respetadas jsonb := '[]'::jsonb;
  -- lab_values
  v_labs jsonb;
  v_omitidos jsonb;
  v_fecha_toma text;
  v_fecha date;
  v_dia_asumido boolean := false;
  v_fila jsonb;
  v_key text;
  v_valor numeric;
  v_labs_escritos int := 0;
  v_labs_respetados int := 0;
  v_labs_invalidas int := 0;
  v_labs_omitidos int := 0;
  v_marcadores_con_valor int := 0;
  v_nombres_respetados text[] := '{}';
  v_sin_clave text[] := '{}';
  v_fuera_tipo text[] := '{}';
BEGIN
  -- 1. La carga de siempre (318 + 321). Ahi vive el gate de admin con
  --    sesion y la regla de version; si dice que no, aqui no se toca nada.
  --    Los derivados de labs salen del payload interno para que el snapshot
  --    `elite_v3` siga siendo el esquema limpio que valida el cliente.
  v_base := public.elite_cargar_evaluacion(
    p_user,
    (p_payload - 'lab_values_filas') - 'lab_values_omitidos'
  );
  IF v_base IS NULL OR COALESCE((v_base->>'ok')::boolean, false) IS DISTINCT FROM true THEN
    RETURN v_base;
  END IF;
  v_avisos := COALESCE(v_base->'avisos', '[]'::jsonb);
  v_dx_id := (v_base->>'dx_id')::uuid;
  v_version_elite := (v_base->>'version_elite')::int;
  v_firma := COALESCE(NULLIF(btrim(p_payload->'interpretado_por'->>'evaluacion'), ''), 'Enrique');

  -- 2. coach_clients: el vinculo que abre rutinas, consola y lectura.
  SELECT status INTO v_cc_status
  FROM coach_clients
  WHERE coach_id = v_caller AND client_id = p_user;
  IF NOT FOUND THEN
    INSERT INTO coach_clients (coach_id, client_id, status)
    VALUES (v_caller, p_user, 'active')
    ON CONFLICT (coach_id, client_id) DO NOTHING;
    v_coach_client := 'creado';
  ELSIF v_cc_status = 'active' THEN
    v_coach_client := 'ya_activo';
  ELSE
    -- El cliente (o el propio coach) lo puso en inactivo. Revivirlo desde
    -- una carga seria decidir por el: se deja y se dice.
    v_coach_client := 'inactivo_respetado';
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'coach_client_inactivo',
      'detalle', format(
        'El vinculo coach-cliente existe pero esta en "%s" y no se reactivo desde aqui. Sin vinculo activo no se le pueden asignar rutinas ni verlo en la consola: reactivalo desde el panel de coach si el cliente esta de acuerdo.',
        v_cc_status));
  END IF;

  -- 3. nutrition_plans desde `alimentacion`. Cada campo entra solo si tiene
  --    forma; nada se rellena.
  v_alim := CASE WHEN jsonb_typeof(p_payload->'alimentacion') = 'object' THEN p_payload->'alimentacion' ELSE '{}'::jsonb END;
  IF jsonb_typeof(v_alim->'prioriza') = 'array' THEN v_prioriza := v_alim->'prioriza'; END IF;
  IF jsonb_typeof(v_alim->'evita') = 'array' THEN v_evita := v_alim->'evita'; END IF;
  IF jsonb_typeof(v_alim->'horarios') = 'array' THEN v_horarios := v_alim->'horarios'; END IF;
  IF jsonb_typeof(v_alim->'notas') = 'array' THEN
    SELECT string_agg(x, E'\n') INTO v_notas
    FROM jsonb_array_elements_text(v_alim->'notas') AS x
    WHERE btrim(x) <> '';
  END IF;
  IF (v_alim->'ventana'->>'inicio') ~ '^\d{2}:\d{2}$' AND (v_alim->'ventana'->>'fin') ~ '^\d{2}:\d{2}$' THEN
    BEGIN
      v_ventana_ini := (v_alim->'ventana'->>'inicio')::time;
      v_ventana_fin := (v_alim->'ventana'->>'fin')::time;
      -- Horas de ayuno = 24 menos la ventana; si la ventana cruza medianoche
      -- se calcula modulo 24. Aritmetica, no criterio clinico.
      v_ayuno_horas := 24 - (((EXTRACT(EPOCH FROM (v_ventana_fin - v_ventana_ini)) / 3600)::int + 24) % 24);
    EXCEPTION WHEN OTHERS THEN
      v_ventana_ini := NULL; v_ventana_fin := NULL; v_ayuno_horas := NULL;
    END;
  END IF;
  IF (v_alim->'metas'->>'proteina_g_dia') ~ '^[0-9]+(\.[0-9]+)?$' AND (v_alim->'metas'->>'proteina_g_dia')::numeric > 0 THEN
    v_meta_prot := (v_alim->'metas'->>'proteina_g_dia')::numeric;
  END IF;
  IF (v_alim->'metas'->>'agua_ml_dia') ~ '^[0-9]+(\.[0-9]+)?$' AND (v_alim->'metas'->>'agua_ml_dia')::numeric > 0 THEN
    v_meta_agua := (v_alim->'metas'->>'agua_ml_dia')::numeric;
  END IF;

  v_hay_alimentacion := jsonb_array_length(v_prioriza) + jsonb_array_length(v_evita) + jsonb_array_length(v_horarios) > 0
    OR v_ventana_ini IS NOT NULL OR v_meta_prot IS NOT NULL OR v_meta_agua IS NOT NULL;

  IF NOT v_hay_alimentacion THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'sin_plan_alimentacion',
      'detalle', 'La seccion alimentacion vino vacia (sin prioriza, evita, ventana, horarios ni metas): no se escribio nutrition_plans y Comida no muestra plan. Si el manual lo trae, va en el JSON y se recarga como version nueva.');
  ELSE
    -- Un solo plan activo por persona (misma regla que createPlan del panel).
    -- Los anteriores se pausan, no se borran.
    UPDATE nutrition_plans SET status = 'paused', updated_at = now()
    WHERE user_id = p_user AND status = 'active';
    GET DIAGNOSTICS v_planes_pausados = ROW_COUNT;
    IF v_planes_pausados > 0 THEN
      v_avisos := v_avisos || jsonb_build_object(
        'codigo', 'nutrition_plan_pausado',
        'detalle', format('%s plan(es) de alimentacion que el cliente tenia activos pasaron a pausa para dejar vigente el de esta version. No se borro ninguno.', v_planes_pausados));
    END IF;

    INSERT INTO nutrition_plans
      (user_id, created_by, name, description,
       protein_target, water_target,
       feeding_window_start, feeding_window_end, fasting_hours,
       meal_schedule, foods_to_avoid, foods_to_prioritize, notes,
       status, start_date)
    VALUES
      (p_user, v_caller,
       format('Plan Elite v%s', v_version_elite),
       format('Plan de alimentación de tu evaluación Elite, versión %s. Lo asignó %s.', v_version_elite, v_firma),
       CASE WHEN v_meta_prot IS NULL THEN NULL ELSE round(v_meta_prot)::int END,
       -- nutrition_plans.water_target esta en LITROS (panel de coach: "Agua (L)").
       CASE WHEN v_meta_agua IS NULL THEN NULL ELSE round(v_meta_agua / 1000.0, 2) END,
       v_ventana_ini, v_ventana_fin, v_ayuno_horas,
       v_horarios, v_evita, v_prioriza, v_notas,
       'active', CURRENT_DATE)
    RETURNING id INTO v_plan_id;
  END IF;

  -- 4. Metas del dia: proteina y agua, SOLO donde el cliente no tiene la suya.
  IF v_meta_prot IS NOT NULL OR v_meta_agua IS NOT NULL THEN
    SELECT COALESCE(goals, '{}'::jsonb) INTO v_goals
    FROM user_day_preferences WHERE user_id = p_user;
    IF NOT FOUND THEN v_goals := '{}'::jsonb; END IF;

    IF v_meta_prot IS NOT NULL THEN
      IF (v_goals->>'protein_goal_g') IS NOT NULL THEN
        v_metas_respetadas := v_metas_respetadas || jsonb_build_object(
          'meta', 'protein_goal_g', 'del_cliente', v_goals->'protein_goal_g', 'del_plan', round(v_meta_prot));
      ELSE
        v_goals_nuevos := v_goals_nuevos || jsonb_build_object('protein_goal_g', round(v_meta_prot));
        v_metas_escritas := v_metas_escritas || to_jsonb('protein_goal_g'::text);
      END IF;
    END IF;
    IF v_meta_agua IS NOT NULL THEN
      IF (v_goals->>'water_goal_ml') IS NOT NULL THEN
        v_metas_respetadas := v_metas_respetadas || jsonb_build_object(
          'meta', 'water_goal_ml', 'del_cliente', v_goals->'water_goal_ml', 'del_plan', round(v_meta_agua));
      ELSE
        v_goals_nuevos := v_goals_nuevos || jsonb_build_object('water_goal_ml', round(v_meta_agua));
        v_metas_escritas := v_metas_escritas || to_jsonb('water_goal_ml'::text);
      END IF;
    END IF;

    IF v_goals_nuevos <> '{}'::jsonb THEN
      -- `nuevos || existentes`: si entre la lectura y la escritura el cliente
      -- fijo una meta, la suya gana (la derecha pisa a la izquierda en jsonb).
      INSERT INTO user_day_preferences (user_id, goals, updated_at)
      VALUES (p_user, v_goals_nuevos, now())
      ON CONFLICT (user_id) DO UPDATE
        SET goals = v_goals_nuevos || COALESCE(user_day_preferences.goals, '{}'::jsonb),
            updated_at = now();
    END IF;
    IF jsonb_array_length(v_metas_respetadas) > 0 THEN
      v_avisos := v_avisos || jsonb_build_object(
        'codigo', 'metas_del_cliente_respetadas',
        'detalle', format('El cliente ya tenia fijadas %s meta(s) del dia y se respetaron; las del plan solo se leen en la evaluacion: %s',
          jsonb_array_length(v_metas_respetadas), v_metas_respetadas::text));
    END IF;
  END IF;

  -- 5. lab_values: los marcadores medidos, con clave canonica ya resuelta
  --    por el cliente (elite-lab-values-core.ts). Aqui no se mapea nada.
  v_labs := p_payload->'lab_values_filas';
  v_omitidos := CASE WHEN jsonb_typeof(p_payload->'lab_values_omitidos') = 'array' THEN p_payload->'lab_values_omitidos' ELSE '[]'::jsonb END;
  v_labs_omitidos := jsonb_array_length(v_omitidos);
  v_fecha_toma := btrim(COALESCE(p_payload->'cliente'->>'fecha_toma', ''));

  -- Cuantos marcadores con valor trae el documento (para detectar el payload
  -- armado con un script anterior a la 324).
  SELECT count(*) INTO v_marcadores_con_valor
  FROM jsonb_array_elements(COALESCE(p_payload->'marcadores'->'grupos', '[]'::jsonb)) AS g,
       jsonb_array_elements(COALESCE(g->'marcadores', '[]'::jsonb)) AS m
  WHERE jsonb_typeof(m->'valor') = 'number';

  IF jsonb_typeof(v_labs) IS DISTINCT FROM 'array' THEN
    IF v_marcadores_con_valor > 0 THEN
      v_avisos := v_avisos || jsonb_build_object(
        'codigo', 'sin_lab_values',
        'detalle', format(
          'El documento trae %s marcadores con valor y el payload no trae lab_values_filas: nada llego al expediente de labs ni a ARGOS. Es un payload armado con un preparar-payload.js anterior al 20-sep-2026. Vuelve a armarlo y carga de nuevo (sube la version).',
          v_marcadores_con_valor));
    END IF;
  ELSE
    -- La forma la reviso el validador del cliente (YYYY-MM o YYYY-MM-DD),
    -- pero "2026-09-31" pasa esa regex y no es una fecha: se atrapa aqui
    -- para que sea un aviso y no una excepcion que revierta toda la carga.
    BEGIN
      IF v_fecha_toma ~ '^\d{4}-\d{2}$' THEN
        v_fecha := (v_fecha_toma || '-01')::date;
        v_dia_asumido := true;
      ELSIF v_fecha_toma ~ '^\d{4}-\d{2}-\d{2}$' THEN
        v_fecha := v_fecha_toma::date;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_fecha := NULL;
      v_dia_asumido := false;
    END;
  END IF;

  IF jsonb_typeof(v_labs) = 'array' AND v_fecha IS NOT NULL THEN
    FOR v_fila IN SELECT value FROM jsonb_array_elements(v_labs) LOOP
      IF jsonb_typeof(v_fila) <> 'object' THEN v_labs_invalidas := v_labs_invalidas + 1; CONTINUE; END IF;
      v_key := btrim(COALESCE(v_fila->>'parameter_key', ''));
      IF v_key = '' OR v_key !~ '^[a-z0-9_]+$' OR jsonb_typeof(v_fila->'value') <> 'number' THEN
        v_labs_invalidas := v_labs_invalidas + 1; CONTINUE;
      END IF;
      v_valor := (v_fila->>'value')::numeric;

      -- Un valor vivo por dato y fecha (308), venga de donde venga. Si ya
      -- hay uno, se respeta: el cliente pudo haberlo capturado o corregido.
      IF EXISTS (
        SELECT 1 FROM lab_values
        WHERE user_id = p_user AND parameter_key = v_key AND measured_at = v_fecha AND is_voided = false
      ) THEN
        v_labs_respetados := v_labs_respetados + 1;
        v_nombres_respetados := array_append(v_nombres_respetados, COALESCE(NULLIF(v_fila->>'nombre', ''), v_key));
        CONTINUE;
      END IF;

      INSERT INTO lab_values (user_id, parameter_key, value, unit, measured_at, source, metadata)
      VALUES (
        p_user, v_key, v_valor, NULLIF(btrim(COALESCE(v_fila->>'unit', '')), ''), v_fecha, 'elite',
        jsonb_build_object(
          'origen', 'elite',
          'dx_id', v_dx_id,
          'version_elite', v_version_elite,
          'nombre', v_fila->>'nombre',
          'key_documento', v_fila->>'key_documento',
          'fecha_toma_documento', v_fecha_toma,
          'dia_asumido', v_dia_asumido,
          -- Mismas llaves que lab_valor_guardar (308): lo escribio una
          -- persona (quien firma la evaluacion), no un parser.
          'escrito_por_humano', true,
          'confirmado_fuera_de_rango', false
        )
      );
      v_labs_escritos := v_labs_escritos + 1;
    END LOOP;

    IF v_dia_asumido AND v_labs_escritos > 0 THEN
      v_avisos := v_avisos || jsonb_build_object(
        'codigo', 'labs_dia_asumido',
        'detalle', format('cliente.fecha_toma trae solo el mes (%s): los %s laboratorios entraron con fecha %s, dia 1 asumido y anotado en metadata. Con el dia exacto en el JSON, la siguiente version los fecha bien.',
          v_fecha_toma, v_labs_escritos, v_fecha));
    END IF;
    IF v_labs_respetados > 0 THEN
      v_avisos := v_avisos || jsonb_build_object(
        'codigo', 'labs_existentes_respetados',
        'detalle', format('%s laboratorios ya tenian un valor vivo con esa misma fecha y no se pisaron: %s. Se leen en la evaluacion; el expediente conserva lo que ya estaba.',
          v_labs_respetados, array_to_string(v_nombres_respetados, ', ')));
    END IF;
    IF v_labs_invalidas > 0 THEN
      v_avisos := v_avisos || jsonb_build_object(
        'codigo', 'labs_filas_invalidas',
        'detalle', format('%s filas de lab_values_filas no tenian clave o valor numerico y se saltaron.', v_labs_invalidas));
    END IF;
  ELSIF jsonb_typeof(v_labs) = 'array' THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'labs_sin_fecha',
      'detalle', format('cliente.fecha_toma no es una fecha valida ("%s"): los %s laboratorios no se escribieron en lab_values porque la fecha de la muestra es obligatoria y no se inventa. Corrige la fecha y carga de nuevo como version nueva.', v_fecha_toma, jsonb_array_length(v_labs)));
  END IF;

  -- Lo que el cliente dejo fuera a proposito, repetido aqui para que quede
  -- en la respuesta oficial de la carga y no solo en la terminal del paso 2.
  SELECT COALESCE(array_agg(format('%s (%s)', COALESCE(o->>'nombre', o->>'key'), o->>'key')), '{}')
    INTO v_sin_clave
  FROM jsonb_array_elements(v_omitidos) AS o
  WHERE o->>'motivo' = 'sin_clave_canonica';
  IF array_length(v_sin_clave, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'marcadores_sin_clave',
      'detalle', format('%s marcadores con valor no tienen clave canonica y no fueron a lab_values: %s. Se leen en la evaluacion, no en el expediente de labs.',
        array_length(v_sin_clave, 1), array_to_string(v_sin_clave, ', ')));
  END IF;
  SELECT COALESCE(array_agg(format('%s (%s)', COALESCE(o->>'nombre', o->>'key'), o->>'motivo')), '{}')
    INTO v_fuera_tipo
  FROM jsonb_array_elements(v_omitidos) AS o
  WHERE o->>'motivo' IN ('estimado', 'no_es_laboratorio');
  IF array_length(v_fuera_tipo, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'marcadores_fuera_de_labs',
      'detalle', format('%s marcadores no van a lab_values por su tipo (estimado, composicion, wearable, test o calculo): %s.',
        array_length(v_fuera_tipo, 1), array_to_string(v_fuera_tipo, '; ')));
  END IF;

  RETURN v_base || jsonb_build_object(
    'coach_client', v_coach_client,
    'nutrition_plan_id', v_plan_id,
    'nutrition_plans_pausados', v_planes_pausados,
    'metas_escritas', v_metas_escritas,
    'metas_respetadas', v_metas_respetadas,
    'lab_values_escritos', v_labs_escritos,
    'lab_values_respetados', v_labs_respetados,
    'lab_values_omitidos', v_labs_omitidos,
    'lab_values_measured_at', v_fecha,
    'avisos', v_avisos
  );
END;
$function$;

-- Mismo gate que la 318: vive adentro (admin con sesion). anon y PUBLIC no.
REVOKE ALL ON FUNCTION public.elite_cargar_completa(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.elite_cargar_completa(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.elite_cargar_completa(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.elite_cargar_completa(uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.elite_cargar_completa(uuid, jsonb) IS
  'ATP 3.0 (324): envuelve a elite_cargar_evaluacion (318 + 321) y en la misma transaccion crea el vinculo coach_clients, escribe nutrition_plans desde alimentacion, las metas de proteina y agua solo donde el cliente no tiene las suyas, y los marcadores en lab_values (source=elite) sin pisar valores vivos. Solo admin con sesion.';

COMMIT;
