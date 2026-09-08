-- 321_elite_cargar_avisos.sql
-- Fecha: 2026-09-08 (bloque Elite, agente C3). Reemplaza el cuerpo del RPC de
-- la migracion 318 (`elite_cargar_evaluacion`). NO se ejecuta desde Cowork:
-- la aplica Enrique con `npx supabase db push`.
--
-- POR QUE EXISTE: la primera corrida completa del camino Elite (payload real
-- de O., Postgres local con las funciones de produccion) dejo cuatro huecos
-- que solo el RPC puede cerrar.
--
-- 1. Modo de falla silencioso. Si el JSON crudo se carga SIN pasar por
--    `scripts/elite/preparar-payload.js`, el payload no trae `suplementos_filas`
--    ni `resumen_argos`: el RPC respondia {ok:true, suplementos_insertados:0}
--    con summary_text en NULL, y la pantalla Elite seguia diciendo que el plan
--    estaba en el modulo (lee el snapshot, no la tabla). Cero suplementos,
--    cero aviso. Ahora la respuesta trae `avisos`: la carga sigue siendo
--    valida (la evaluacion si se guardo), pero quien la corrio se entera en la
--    misma linea de la terminal.
-- 2. Suplemento duplicado. La fila existente se buscaba solo entre las
--    `source='coach'`. Si el cliente ya tenia SU ficha manual del mismo
--    suplemento, quedaban dos renglones del mismo producto. La fila manual es
--    dato del usuario: no se pisa, no se borra, no se apaga. Lo que se hace es
--    NO insertar la del coach y avisar por nombre. El plan completo se sigue
--    leyendo en Mi evaluacion Elite.
-- 3. `roots_detected` siempre en '[]'. Sin raices, el Mapa funcional pierde su
--    seccion y la agenda no recibe nada de la Elite. Ahora entran del payload
--    (`raicesDetectadas` de elite-v3-core: raices declaradas por quien firma,
--    mas los sistemas y marcadores en atencion que tienen un gemelo LITERAL en
--    el vocabulario controlado). Aqui solo se normaliza la forma; el
--    vocabulario lo cuida el cliente, que es donde vive INTERVENTION_ROOTS.
-- 4. La hora inventada. `timing` caia en 'morning' cuando el manual no fijaba
--    momento: una hora que nadie escribio. Ahora se guarda NULL y el modulo
--    Suplementos las agrupa aparte ("Sin hora fijada"). La dosis sigue con su
--    COALESCE a "Sin dosis fijada", que por fin dispara: el cliente manda NULL
--    en `dosage` y ya no la raya.
-- 5. Un UPDATE que borraba dato del cliente. La 318 asignaba
--    `amount_per_unit`, `amount_unit`, `units_per_dose`, `notes`, `reason` e
--    `is_plan` a pelo: recargar el plan sin esos campos borraba lo que el
--    cliente habia escaneado de su frasco y la advertencia de seguridad de su
--    ficha. Ahora TODOS entran con COALESCE contra la columna: el plan nuevo
--    solo escribe lo que trae.
--
-- Lo demas del contrato de la 318 no cambia: gate de admin con sesion,
-- version_elite = previas + 1, append-only de functional_dx, las pausadas del
-- usuario NO se reviven, las filas manuales no se tocan y lo que salio del
-- plan se apaga en vez de borrarse.
--
-- Devuelve lo mismo que la 318 mas: `avisos` (arreglo de {codigo, detalle},
-- vacio cuando todo salio limpio), `suplementos_ya_del_cliente` y
-- `raices_detectadas`.
--
-- Idempotente: CREATE OR REPLACE, se puede correr dos veces.

BEGIN;

CREATE OR REPLACE FUNCTION public.elite_cargar_evaluacion(
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
  v_role text;
  v_tier text;
  v_tier_expira timestamptz;
  v_version_json jsonb;
  v_version_elite int;
  v_elite_previas int;
  v_hallazgos int := 0;
  v_quality smallint;
  v_evaluacion jsonb;
  v_snapshot jsonb;
  v_summary text;
  v_filas jsonb;
  v_roots jsonb := '[]'::jsonb;
  v_avisos jsonb := '[]'::jsonb;
  v_version int;
  v_dx_id uuid;
  v_fila jsonb;
  v_nombre text;
  v_existente_id uuid;
  v_existente_activa boolean;
  v_manual_id uuid;
  v_insertados int := 0;
  v_actualizados int := 0;
  v_pausados int := 0;
  v_desactivados int := 0;
  v_ya_manual int := 0;
  v_sin_dosis int := 0;
  v_sin_momento int := 0;
  v_sups_documento int := 0;
  v_nombres text[] := '{}';
  v_nombres_manual text[] := '{}';
  v_faltan text[] := '{}';
BEGIN
  -- 1. Gate: sesion obligatoria y rol admin.
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_sesion');
  END IF;
  -- role::text cubre ambos mundos: enum user_role (remoto) o TEXT (limpio).
  SELECT role::text INTO v_role FROM profiles WHERE id = v_caller;
  IF COALESCE(v_role, 'client') <> 'admin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
  END IF;

  -- 2. Usuario destino.
  IF p_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_required');
  END IF;
  SELECT tier, tier_expires_at INTO v_tier, v_tier_expira FROM profiles WHERE id = p_user;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  -- 3. Validacion minima del payload (la fina la hace validarEliteV3 en el cliente).
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'payload_invalido');
  END IF;
  IF p_payload->>'schema' IS DISTINCT FROM 'elite_v3' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'schema_invalido');
  END IF;
  v_version_json := p_payload->'version';
  IF v_version_json IS NULL OR jsonb_typeof(v_version_json) <> 'number'
     OR (v_version_json::text) !~ '^[0-9]+$' OR (v_version_json::text)::int < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'version_invalida');
  END IF;
  v_version_elite := (v_version_json::text)::int;
  IF jsonb_typeof(p_payload->'cliente') IS DISTINCT FROM 'object' THEN v_faltan := array_append(v_faltan, 'cliente'); END IF;
  IF jsonb_typeof(p_payload->'marcadores') IS DISTINCT FROM 'object' THEN v_faltan := array_append(v_faltan, 'marcadores'); END IF;
  IF jsonb_typeof(p_payload->'cierre') IS DISTINCT FROM 'object' THEN v_faltan := array_append(v_faltan, 'cierre'); END IF;
  IF array_length(v_faltan, 1) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'payload_incompleto', 'faltan', to_jsonb(v_faltan));
  END IF;
  v_filas := COALESCE(p_payload->'suplementos_filas', '[]'::jsonb);
  IF jsonb_typeof(v_filas) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'suplementos_filas_invalido');
  END IF;
  IF jsonb_typeof(p_payload->'suplementos') = 'array' THEN
    v_sups_documento := jsonb_array_length(p_payload->'suplementos');
  END IF;

  -- 321 (aviso 1): el documento trae plan y el payload no trae filas. Es el
  -- JSON crudo cargado sin preparar-payload.js. La evaluacion se guarda igual
  -- (el cliente ya la puede leer), pero el modulo Suplementos se queda vacio.
  IF jsonb_array_length(v_filas) = 0 AND v_sups_documento > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'plan_sin_filas',
      'detalle', format(
        'El documento trae %s suplementos y el payload no trae ninguna fila para el modulo: nada llego a Suplementos. Vuelve a armarlo con scripts/elite/preparar-payload.js y carga de nuevo (sube la version).',
        v_sups_documento));
  END IF;

  -- 4. Serializa por usuario (misma llave que create_dx_version, 195).
  PERFORM pg_advisory_xact_lock(hashtextextended('functional_dx:' || p_user::text, 0));

  -- 5. Numero de revision Elite: previas + 1, o se rechaza.
  SELECT count(*) INTO v_elite_previas
  FROM functional_dx
  WHERE user_id = p_user
    AND sources_snapshot->'elite_v3'->>'schema' = 'elite_v3';
  IF v_version_elite <> v_elite_previas + 1 THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'version_mismatch',
      'version_esperada', v_elite_previas + 1,
      'version_recibida', v_version_elite
    );
  END IF;

  -- 6. Calidad, raices y snapshot.
  IF jsonb_typeof(p_payload->'genetica'->'hallazgos') = 'array' THEN
    v_hallazgos := jsonb_array_length(p_payload->'genetica'->'hallazgos');
  END IF;
  v_quality := CASE WHEN v_hallazgos > 0 THEN 5 ELSE 4 END;

  -- 321: raices para functional_dx.roots_detected, con la misma forma que
  -- escribe el motor DX de ARGOS. Solo se normaliza: severidad entera 1..5,
  -- confianza 0..1, fuentes como arreglo. Una entrada sin root_key se ignora.
  IF jsonb_typeof(p_payload->'roots_detected') = 'array' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'root_key', btrim(r->>'root_key'),
             'severity', CASE
               WHEN (r->>'severity') ~ '^[0-9]+(\.[0-9]+)?$'
                 THEN LEAST(5, GREATEST(1, round((r->>'severity')::numeric)::int))
               ELSE 3 END,
             'confidence', CASE
               WHEN (r->>'confidence') ~ '^[0-9]+(\.[0-9]+)?$'
                 THEN LEAST(1::numeric, GREATEST(0::numeric, (r->>'confidence')::numeric))
               ELSE 0.5::numeric END,
             'sources', CASE WHEN jsonb_typeof(r->'sources') = 'array' THEN r->'sources' ELSE '[]'::jsonb END
           )), '[]'::jsonb)
      INTO v_roots
      FROM jsonb_array_elements(p_payload->'roots_detected') AS r
     WHERE jsonb_typeof(r) = 'object'
       AND COALESCE(btrim(r->>'root_key'), '') <> '';
  END IF;

  -- 321 (aviso 2): sin raices, el Mapa funcional se queda sin su seccion.
  IF jsonb_array_length(v_roots) = 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'sin_raices',
      'detalle', 'roots_detected quedo vacio: el Mapa funcional no va a mostrar raices y la agenda no recibe nada de esta evaluacion. Declara las raices en el campo "raices" del elite_v3 y vuelve a armar el payload.');
  END IF;

  -- Los tres derivados del cliente no son parte del esquema elite_v3: salen
  -- del snapshot para que lo guardado siga pasando validarEliteV3 tal cual.
  v_evaluacion := ((p_payload - 'resumen_argos') - 'suplementos_filas') - 'roots_detected';
  v_summary := NULLIF(btrim(COALESCE(p_payload->>'resumen_argos', '')), '');

  -- 321 (aviso 3): sin resumen, ARGOS no conoce la evaluacion del cliente.
  IF v_summary IS NULL THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'sin_resumen_argos',
      'detalle', 'summary_text quedo en NULL: ARGOS no va a tener el contexto de esta evaluacion. Es la firma de un payload armado a mano.');
  END IF;

  v_snapshot := jsonb_build_object(
    'elite_v3', v_evaluacion,
    'elite_carga', jsonb_build_object(
      'cargado_por', v_caller,
      'cargado_en', now(),
      'version_elite', v_version_elite,
      'suplementos_filas', jsonb_array_length(v_filas)
    )
  );

  -- 7. Fila nueva de functional_dx (cuerpo de create_dx_version para p_user).
  UPDATE functional_dx SET is_current = false
  WHERE user_id = p_user AND is_current;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM functional_dx WHERE user_id = p_user;

  INSERT INTO functional_dx
    (user_id, version, quality_level, roots_detected, summary_text,
     sources_snapshot, generated_by, model, is_current)
  VALUES
    (p_user, v_version, v_quality, v_roots, v_summary,
     v_snapshot, 'manual', 'enrique', true)
  RETURNING id INTO v_dx_id;

  -- 8. Plan de suplementos.
  FOR v_fila IN SELECT value FROM jsonb_array_elements(v_filas) LOOP
    IF jsonb_typeof(v_fila) <> 'object' THEN CONTINUE; END IF;
    v_nombre := btrim(COALESCE(v_fila->>'name', ''));
    IF v_nombre = '' THEN CONTINUE; END IF;
    v_nombres := array_append(v_nombres, lower(v_nombre));
    IF COALESCE(btrim(v_fila->>'dosage'), '') = '' THEN v_sin_dosis := v_sin_dosis + 1; END IF;
    IF COALESCE(btrim(v_fila->>'timing'), '') = '' THEN v_sin_momento := v_sin_momento + 1; END IF;

    v_existente_id := NULL;
    SELECT id, COALESCE(is_active, true) INTO v_existente_id, v_existente_activa
    FROM user_supplements
    WHERE user_id = p_user AND source = 'coach' AND lower(name) = lower(v_nombre)
    ORDER BY COALESCE(is_active, true) DESC, created_at DESC
    LIMIT 1;

    IF v_existente_id IS NOT NULL THEN
      -- 321, regla que no se cruza: una recarga del plan NUNCA borra lo que el
      -- cliente puso en su ficha. Cada campo entra solo si el plan nuevo trae
      -- algo; si no, se queda el valor que ya estaba. Antes de este arreglo,
      -- recargar el plan sin dosis por unidad borraba en silencio lo que el
      -- cliente habia escaneado de su frasco, y las notes se llevaban con
      -- ellas la advertencia de seguridad.
      -- `name` es el unico que se sobreescribe: la fila se encontro por
      -- lower(name), asi que lo unico que puede cambiar son las mayusculas.
      UPDATE user_supplements SET
        name = v_nombre,
        dosage = COALESCE(NULLIF(btrim(v_fila->>'dosage'), ''), dosage),
        -- Sin momento en el plan se respeta el que ya tenia la ficha (puede
        -- haberlo puesto el dueño); nunca se cae en 'morning'.
        timing = COALESCE(NULLIF(btrim(v_fila->>'timing'), ''), timing),
        reason = COALESCE(NULLIF(btrim(v_fila->>'reason'), ''), reason),
        -- Si el cliente movio esta ficha a EVENTUAL, ahi se queda: es su
        -- decision sobre su adherencia. NULL (fila anterior a 312) = del plan.
        is_plan = COALESCE(is_plan, true),
        amount_per_unit = COALESCE(NULLIF(v_fila->>'amount_per_unit', '')::numeric, amount_per_unit),
        amount_unit = COALESCE(NULLIF(btrim(v_fila->>'amount_unit'), ''), amount_unit),
        units_per_dose = COALESCE(NULLIF(v_fila->>'units_per_dose', '')::numeric, units_per_dose),
        notes = COALESCE(NULLIF(btrim(v_fila->>'notes'), ''), notes)
      WHERE id = v_existente_id;
      IF v_existente_activa THEN
        v_actualizados := v_actualizados + 1;
      ELSE
        -- Pausada por el usuario: se actualizan sus datos y NO se revive.
        v_pausados := v_pausados + 1;
      END IF;
      CONTINUE;
    END IF;

    -- 321: sin fila del coach, pero el cliente puede tener LA SUYA con ese
    -- mismo nombre. Su fila no se pisa ni se apaga, y tampoco se le pone otra
    -- al lado: se deja la del cliente y se avisa por nombre.
    v_manual_id := NULL;
    SELECT id INTO v_manual_id
    FROM user_supplements
    WHERE user_id = p_user AND COALESCE(source, 'manual') <> 'coach' AND lower(name) = lower(v_nombre)
    ORDER BY COALESCE(is_active, true) DESC, created_at DESC
    LIMIT 1;
    IF v_manual_id IS NOT NULL THEN
      v_ya_manual := v_ya_manual + 1;
      v_nombres_manual := array_append(v_nombres_manual, v_nombre);
      CONTINUE;
    END IF;

    INSERT INTO user_supplements
      (user_id, name, dosage, timing, source, reason, is_active, is_plan,
       amount_per_unit, amount_unit, units_per_dose, notes)
    VALUES
      (p_user, v_nombre,
       COALESCE(NULLIF(btrim(v_fila->>'dosage'), ''), 'Sin dosis fijada'),
       -- 321: NULL cuando el plan no fija hora. El modulo las agrupa en
       -- "Sin hora fijada"; antes se inventaba 'morning'.
       NULLIF(btrim(v_fila->>'timing'), ''),
       'coach', v_fila->>'reason', true, true,
       NULLIF(v_fila->>'amount_per_unit', '')::numeric,
       NULLIF(v_fila->>'amount_unit', ''),
       NULLIF(v_fila->>'units_per_dose', '')::numeric,
       NULLIF(v_fila->>'notes', ''));
    v_insertados := v_insertados + 1;
  END LOOP;

  -- Lo del plan anterior que ya no viene se pausa (no se borra). Solo si el
  -- plan nuevo trae algo: un payload sin plan no toca el modulo.
  IF array_length(v_nombres, 1) > 0 THEN
    UPDATE user_supplements SET is_active = false
    WHERE user_id = p_user AND source = 'coach' AND is_plan
      AND COALESCE(is_active, true)
      AND NOT (lower(name) = ANY (v_nombres));
    GET DIAGNOSTICS v_desactivados = ROW_COUNT;
  END IF;

  -- 321 (avisos 4 a 7): lo que quedo a medias en el plan, dicho con nombre.
  IF v_ya_manual > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'suplementos_ya_del_cliente',
      'detalle', format(
        '%s del plan ya existian como ficha del propio cliente y no se duplicaron: %s. Su ficha se respeta tal cual; el porque y la dosis del plan se leen en Mi evaluacion Elite.',
        v_ya_manual, array_to_string(v_nombres_manual, ', ')));
  END IF;
  IF v_pausados > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'suplementos_pausados',
      'detalle', format(
        '%s del plan estaban en pausa: se actualizaron y siguen en pausa (solo el cliente los reanuda, desde el modulo Suplementos).',
        v_pausados));
  END IF;
  IF v_sin_dosis > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'suplementos_sin_dosis',
      'detalle', format('%s filas del plan llegaron sin dosis: las nuevas entran con "Sin dosis fijada" y las que ya existian conservan la suya.', v_sin_dosis));
  END IF;
  IF v_sin_momento > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'suplementos_sin_momento',
      'detalle', format('%s filas del plan llegaron sin momento y aqui no se inventa la hora: las nuevas quedan sin hora (el cliente las ve en "Sin hora fijada") y las que ya existian conservan la suya.', v_sin_momento));
  END IF;

  -- 9. Rastro en tier_history (el nivel no cambia aqui).
  INSERT INTO tier_history (user_id, old_tier, new_tier, old_expires_at, new_expires_at, reason)
  VALUES (p_user, v_tier, COALESCE(v_tier, 'free'), v_tier_expira, v_tier_expira, 'elite_evaluacion_cargada');

  RETURN jsonb_build_object(
    'ok', true,
    'dx_id', v_dx_id,
    'version', v_version,
    'version_elite', v_version_elite,
    'quality_level', v_quality,
    'raices_detectadas', jsonb_array_length(v_roots),
    'suplementos_insertados', v_insertados,
    'suplementos_actualizados', v_actualizados,
    'suplementos_pausados_respetados', v_pausados,
    'suplementos_ya_del_cliente', v_ya_manual,
    'suplementos_desactivados', v_desactivados,
    'avisos', v_avisos
  );
END;
$function$;

-- El gate vive dentro (admin con sesion). anon y PUBLIC no lo llaman.
REVOKE ALL ON FUNCTION public.elite_cargar_evaluacion(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.elite_cargar_evaluacion(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.elite_cargar_evaluacion(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.elite_cargar_evaluacion(uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.elite_cargar_evaluacion(uuid, jsonb) IS
  'ATP 3.0 (318 + 321): carga una evaluacion Elite (elite_v3) como fila nueva de functional_dx con sus raices, e inserta o actualiza el plan de suplementos (source=coach) sin duplicar las fichas del propio cliente ni revivir las pausadas. Devuelve avisos cuando el payload llego incompleto. Solo admin con sesion.';

COMMIT;
