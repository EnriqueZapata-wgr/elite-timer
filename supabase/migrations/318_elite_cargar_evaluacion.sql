-- 318_elite_cargar_evaluacion.sql
-- Fecha: 2026-09-06 (noche ATP 3.0, agente C2). Referencia: PIVOTE_ATP_3.0
-- Parte 2.3 punto 2 y 2.4, RUTA_A_ATP_3.0 paso 3.2 (y 3.10: cada revision es
-- una version nueva). Esquema del payload: R and D/diagnostico/ESQUEMA_ELITE_V3.md
-- y src/services/elite/elite-v3-core.ts.
--
-- Que hace: RPC elite_cargar_evaluacion(p_user uuid, p_payload jsonb) que
-- carga la evaluacion ATP Elite de un cliente como una fila nueva de
-- functional_dx (append-only, is_current) e inserta o actualiza las filas del
-- plan de suplementos en user_supplements (source='coach', is_plan=true).
-- Lo invoca Enrique con su JWT de admin (curl de scripts/elite/curl-elite.sh);
-- nunca desde Cowork ni con service_role suelto.
--
-- Gate: auth.uid() nulo se rechaza (sin_sesion): a diferencia de
-- generate_activation_codes (315), aqui no hay llamada de servicio valida,
-- porque la carga debe dejar rastro con el auth.uid() de quien la hizo.
-- El llamante debe tener profiles.role = 'admin' (not_authorized).
--
-- Por que NO envuelve a create_dx_version (195): esa funcion toma el usuario
-- de auth.uid() (a proposito, para que nadie inserte a nombre de otro), y aqui
-- auth.uid() es el admin, no el cliente. Se replica su cuerpo exacto para
-- p_user (advisory lock por usuario, baja la vigente, MAX(version)+1,
-- INSERT vigente) dentro de esta misma transaccion. Si la 195 cambia de
-- forma, hay que revisar este bloque.
--
-- Que se guarda en sources_snapshot:
--   elite_v3:    el payload SIN resumen_argos ni suplementos_filas. Esos dos
--                son derivados que el cliente calcula (resumenParaArgos,
--                suplementosAFilas) y que no pasan validarEliteV3 tal cual
--                (dosage trae la raya de sin dato). La pantalla valida el
--                objeto guardado con validarEliteV3: tiene que ser el limpio.
--   elite_carga: quien cargo, cuando, version_elite y cuantas filas de plan.
--   summary_text = resumen_argos (ARGOS y la Card A leen lo mismo).
--   quality_level = 5 si genetica.hallazgos trae algo, 4 si no (170: el 5 ya
--   es "con geneticos"). generated_by='manual', model='enrique'.
--
-- Version: p_payload.version es el numero de revision de la evaluacion Elite
-- (1 para la Entrega 1, 2 para la de la semana 8 o la revision a 6 meses) y
-- debe ser exactamente (evaluaciones elite_v3 previas del usuario) + 1. Si
-- no coincide se rechaza con version_mismatch y version_esperada: asi un
-- curl repetido por accidente no crea dos filas iguales (idempotencia de la
-- carga). functional_dx.version es aparte: el usuario puede traer versiones
-- del mapa funcional de ARGOS antes de su primera Elite.
--
-- Suplementos (dato del usuario sagrado):
--   - Si ya existe una fila source='coach' con el mismo nombre (sin
--     mayusculas), se ACTUALIZA en vez de duplicar. Si esa fila estaba
--     pausada por el usuario (is_active=false) se actualizan sus datos pero
--     NO se revive: cuenta en suplementos_pausados_respetados.
--   - Las filas source='coach' e is_plan del plan ANTERIOR que ya no vienen
--     en el plan nuevo se pasan a is_active=false (no se borran; los logs de
--     adherencia se conservan). Solo ocurre cuando el plan nuevo trae al
--     menos una fila: un payload sin suplementos no toca nada.
--   - Nunca toca filas source='manual' del usuario.
--
-- tier_history: deja una fila reason='elite_evaluacion_cargada' con el tier
-- vigente en old_tier y new_tier (no cambia el nivel: el nivel entra por el
-- codigo de activacion, pivote 2.4).
--
-- Devuelve {ok:true, dx_id, version, version_elite, quality_level,
-- suplementos_insertados, suplementos_actualizados,
-- suplementos_pausados_respetados, suplementos_desactivados} o
-- {ok:false, error}. Nunca lanza por reglas de negocio; solo por fallas
-- reales de la base (que revierten todo).
--
-- Idempotente: CREATE OR REPLACE. Se aplica con npx supabase db push
-- (Enrique), nunca desde Cowork.

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
  v_version int;
  v_dx_id uuid;
  v_fila jsonb;
  v_nombre text;
  v_existente_id uuid;
  v_existente_activa boolean;
  v_insertados int := 0;
  v_actualizados int := 0;
  v_pausados int := 0;
  v_desactivados int := 0;
  v_nombres text[] := '{}';
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

  -- 6. Calidad y snapshot.
  IF jsonb_typeof(p_payload->'genetica'->'hallazgos') = 'array' THEN
    v_hallazgos := jsonb_array_length(p_payload->'genetica'->'hallazgos');
  END IF;
  v_quality := CASE WHEN v_hallazgos > 0 THEN 5 ELSE 4 END;
  v_evaluacion := (p_payload - 'resumen_argos') - 'suplementos_filas';
  v_summary := NULLIF(btrim(COALESCE(p_payload->>'resumen_argos', '')), '');
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
    (p_user, v_version, v_quality, '[]'::jsonb, v_summary,
     v_snapshot, 'manual', 'enrique', true)
  RETURNING id INTO v_dx_id;

  -- 8. Plan de suplementos.
  FOR v_fila IN SELECT value FROM jsonb_array_elements(v_filas) LOOP
    IF jsonb_typeof(v_fila) <> 'object' THEN CONTINUE; END IF;
    v_nombre := btrim(COALESCE(v_fila->>'name', ''));
    IF v_nombre = '' THEN CONTINUE; END IF;
    v_nombres := array_append(v_nombres, lower(v_nombre));

    v_existente_id := NULL;
    SELECT id, COALESCE(is_active, true) INTO v_existente_id, v_existente_activa
    FROM user_supplements
    WHERE user_id = p_user AND source = 'coach' AND lower(name) = lower(v_nombre)
    ORDER BY COALESCE(is_active, true) DESC, created_at DESC
    LIMIT 1;

    IF v_existente_id IS NOT NULL THEN
      UPDATE user_supplements SET
        name = v_nombre,
        dosage = COALESCE(NULLIF(btrim(v_fila->>'dosage'), ''), dosage),
        timing = COALESCE(NULLIF(btrim(v_fila->>'timing'), ''), timing, 'morning'),
        reason = v_fila->>'reason',
        is_plan = true,
        amount_per_unit = NULLIF(v_fila->>'amount_per_unit', '')::numeric,
        amount_unit = NULLIF(v_fila->>'amount_unit', ''),
        units_per_dose = NULLIF(v_fila->>'units_per_dose', '')::numeric,
        notes = NULLIF(v_fila->>'notes', '')
      WHERE id = v_existente_id;
      IF v_existente_activa THEN
        v_actualizados := v_actualizados + 1;
      ELSE
        v_pausados := v_pausados + 1;
      END IF;
    ELSE
      INSERT INTO user_supplements
        (user_id, name, dosage, timing, source, reason, is_active, is_plan,
         amount_per_unit, amount_unit, units_per_dose, notes)
      VALUES
        (p_user, v_nombre,
         COALESCE(NULLIF(btrim(v_fila->>'dosage'), ''), 'Sin dosis fijada'),
         COALESCE(NULLIF(btrim(v_fila->>'timing'), ''), 'morning'),
         'coach', v_fila->>'reason', true, true,
         NULLIF(v_fila->>'amount_per_unit', '')::numeric,
         NULLIF(v_fila->>'amount_unit', ''),
         NULLIF(v_fila->>'units_per_dose', '')::numeric,
         NULLIF(v_fila->>'notes', ''));
      v_insertados := v_insertados + 1;
    END IF;
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

  -- 9. Rastro en tier_history (el nivel no cambia aqui).
  INSERT INTO tier_history (user_id, old_tier, new_tier, old_expires_at, new_expires_at, reason)
  VALUES (p_user, v_tier, COALESCE(v_tier, 'free'), v_tier_expira, v_tier_expira, 'elite_evaluacion_cargada');

  RETURN jsonb_build_object(
    'ok', true,
    'dx_id', v_dx_id,
    'version', v_version,
    'version_elite', v_version_elite,
    'quality_level', v_quality,
    'suplementos_insertados', v_insertados,
    'suplementos_actualizados', v_actualizados,
    'suplementos_pausados_respetados', v_pausados,
    'suplementos_desactivados', v_desactivados
  );
END;
$function$;

-- El gate vive dentro (admin con sesion). anon y PUBLIC no lo llaman.
REVOKE ALL ON FUNCTION public.elite_cargar_evaluacion(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.elite_cargar_evaluacion(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.elite_cargar_evaluacion(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.elite_cargar_evaluacion(uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.elite_cargar_evaluacion(uuid, jsonb) IS
  'ATP 3.0 (318): carga una evaluacion Elite (elite_v3) como fila nueva de functional_dx e inserta o actualiza el plan de suplementos (source=coach). Solo admin con sesion.';

COMMIT;
