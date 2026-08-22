-- 308_colector_labs_placeholder_temporal.sql
--
-- EL COLECTOR DE LABORATORIOS: UN PASO INTERMEDIO REAL Y UN SOLO DATO VIVO.
--
-- POR QUÉ
-- Hasta hoy, lo que el parser extraía de un estudio vivía en un Map de memoria
-- de la sesión de JavaScript (src/services/edad-atp/lab-review-store.ts). Es
-- decir: la extracción NUNCA llegaba a la capa del colector. Si la app se
-- recargaba entre la extracción y el "aceptar", el trabajo se perdía; y como
-- la pantalla de confirmación reconstruía el payload desde el JSON crudo del
-- proveedor, la confianza por dato, el fragmento de texto de donde salió cada
-- número y el origen en fotos múltiples se perdían de todos modos.
--
-- Y del otro lado: lab_values tenía UNIQUE (user_id, parameter_key,
-- measured_at, source). Con el origen dentro de la llave, el mismo dato del
-- mismo día podía vivir tres veces, una por etiqueta de origen. La 307 limpió
-- el pasado (21 parámetros con más de una fila viva, seis con valores
-- distintos, colesterol total con 672 y 172 al mismo tiempo) pero no impuso
-- nada hacia adelante. La siguiente corrección reproducía el patrón.
--
-- LA DOCTRINA, decidida por el dueño el 21-ago-2026, verbatim:
--   "Solo un placeholder por dato vivo al mismo tiempo."
--   "En el momento en el que se cierren los cuadros de diálogo de importación
--    de datos, en ese momento se necesitan borrar los datos temporales."
--
-- QUÉ HACE ESTA MIGRACIÓN
--
--  1. lab_uploads.upload_type: el tipo que la persona eligió al subir
--     (laboratorio, ECG, genética, contexto…) por fin se guarda. Sin esa
--     columna, un archivo de contexto que se quedaba a medias lo re-encolaba
--     el arranque de la app y el motor lo parseaba como si fuera un estudio
--     de sangre.
--
--  2. lab_revision: el placeholder TEMPORAL. Una fila por dato extraído, con
--     UNIQUE (upload_id, parameter_key), así que un mismo estudio no puede
--     tener dos versiones del mismo dato compitiendo. Cada fila lleva SU
--     PROPIA fecha: dos estudios de fechas distintas fotografiados juntos ya
--     no se funden bajo una sola.
--
--  3. Un índice único parcial sobre lab_values SIN el origen: a lo más un
--     valor vivo por (usuario, dato, fecha). Es la regla escrita como
--     restricción, no como buena intención.
--
--  4. lab_valor_guardar(): la ÚNICA puerta de escritura. Anula el valor
--     vivo anterior y escribe el nuevo, en un solo acto. Nadie más escribe.
--
--  5. lab_revision_aprobar(): el paso final. En UNA transacción migra el
--     temporal a lab_values, marca el upload como confirmado y BORRA el
--     temporal. Si algo falla, no migra nada y no borra nada.
--
-- IDEMPOTENTE: correrla dos veces no cambia nada la segunda vez.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · EL TIPO DE ARCHIVO SE GUARDA
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE lab_uploads ADD COLUMN IF NOT EXISTS upload_type text;

-- Lo que ya existe se subió por la puerta de laboratorios: esa era la única
-- que llamaba al motor. Marcarlo explícito es más honesto que dejarlo nulo y
-- que cada lector adivine.
UPDATE lab_uploads SET upload_type = 'labs' WHERE upload_type IS NULL;

-- 4EP MEDIO-1: al recargar la app a media revisión se perdían los hermanos
-- del lote y las fotos que fallaron, porque solo vivían en memoria. Entonces
-- las otras fotos se quedaban en 'extracted' para siempre y el aviso global
-- las volvía a ofrecer una por una: el defecto 5 reapareciendo por atrás.
ALTER TABLE lab_uploads ADD COLUMN IF NOT EXISTS lote_upload_ids uuid[];
ALTER TABLE lab_uploads ADD COLUMN IF NOT EXISTS lote_fallos jsonb;

COMMENT ON COLUMN lab_uploads.upload_type IS
  'Tipo elegido por la persona al subir (ver src/constants/upload-types.ts). '
  'Solo los tipos que declaran motor se parsean como laboratorio; los demás '
  'son contexto y NO se re-encolan.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · EL PLACEHOLDER TEMPORAL
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lab_revision (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- El upload que abrió la revisión. En fotos múltiples es el PRIMERO del
  -- lote, y origen_upload_id dice de cuál foto salió cada dato.
  upload_id     uuid NOT NULL REFERENCES lab_uploads(id) ON DELETE CASCADE,
  parameter_key text NOT NULL,
  value         numeric NOT NULL,
  unit          text,
  -- LA FECHA VIVE POR DATO, no por lote. Dos estudios de fechas distintas
  -- fotografiados en la misma tanda conservan cada uno la suya.
  measured_at   date NOT NULL,
  confidence    text,
  -- false = el validador clínico lo rechazó. Un dato así NO se migra salvo
  -- que la persona lo haya editado o confirmado a mano.
  passed_validation boolean NOT NULL DEFAULT true,
  -- El humano lo miró y dijo "sí, mi valor es ese aunque esté fuera de rango".
  -- Ningún parser puede pisar un dato con esta marca (ver lab_valores_guardar).
  confirmado_fuera_de_rango boolean NOT NULL DEFAULT false,
  -- De qué archivo salió, cuando el lote trae varios.
  origen_upload_id uuid REFERENCES lab_uploads(id) ON DELETE SET NULL,
  -- Cómo se llegó a la unidad canónica: identity, explicit o heuristic. Se
  -- guarda porque la pantalla lo usa para decidir qué marcar con advertencia.
  -- Sin esto, al recargar TODO salía con el ícono de aviso y la señal dejaba
  -- de significar algo (4EP).
  conversion_method text,
  -- El pedazo de texto del documento del que salió el número. Es lo que
  -- permite que la persona compare contra su hoja sin adivinar.
  raw_snippet   text,
  -- Marca de tiempo de la última edición de la persona sobre este dato.
  -- null = tal como salió del extractor.
  editado_en    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- UN dato, UNA versión, por revisión. Corregir es reemplazar, no acumular.
  UNIQUE (upload_id, parameter_key)
);

CREATE INDEX IF NOT EXISTS idx_lab_revision_upload ON lab_revision (upload_id);
CREATE INDEX IF NOT EXISTS idx_lab_revision_user ON lab_revision (user_id, created_at DESC);

COMMENT ON TABLE lab_revision IS
  'Placeholder TEMPORAL del colector. Vive entre la extracción y el aceptar '
  'de la persona, y muere en la aprobación (lab_revision_aprobar la borra en '
  'la misma transacción que migra). Nunca debe haber un dato aquí y su gemelo '
  'vivo en lab_values al mismo tiempo.';

ALTER TABLE lab_revision ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario maneja su propia revision" ON lab_revision;
CREATE POLICY "Usuario maneja su propia revision" ON lab_revision
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coach maneja revision de su cliente" ON lab_revision;
CREATE POLICY "Coach maneja revision de su cliente" ON lab_revision
  FOR ALL USING (
    EXISTS (SELECT 1 FROM coach_clients cc
            WHERE cc.coach_id = auth.uid() AND cc.client_id = lab_revision.user_id
              AND cc.status = 'active')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM coach_clients cc
            WHERE cc.coach_id = auth.uid() AND cc.client_id = lab_revision.user_id
              AND cc.status = 'active')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · UN SOLO VALOR VIVO POR DATO Y FECHA, COMO RESTRICCIÓN
-- ═══════════════════════════════════════════════════════════════════════════

-- Red de seguridad antes del índice: la 307 dejó esto limpio el 21-ago, pero
-- entre esa corrida y ésta pudo entrar otro duplicado por la puerta vieja.
--
-- 4EP MEDIO-4: la primera versión de este bloque decía "misma regla de la 307"
-- y NO lo era: se había caído la parte del rango clínico, que es la que hace
-- que el humano pueda perder. Sin ella el criterio se invierte justo en el
-- caso que la 307 documenta: en el MCV, el 30.5 tecleado a mano (que es un MCH
-- escrito en el campo equivocado) le ganaba al 92.3 correcto del PDF. Regla
-- completa, copiada de la 307, incluido el aviso.
CREATE TEMP TABLE _rangos_308 (parameter_key text, minimo numeric, maximo numeric) ON COMMIT DROP;
INSERT INTO _rangos_308 VALUES
  ('colesterol_total', 80, 500),
  ('colesterol_hdl', 15, 150),
  ('colesterol_ldl', 30, 400),
  ('mcv', 50, 150),
  ('tsh', 0.01, 100),
  ('proteina_c_reactiva_cuantitativa_pcr', 0, 50);

CREATE TEMP TABLE _anulados_308 (parameter_key text, value numeric, measured_at date) ON COMMIT DROP;

WITH vivos AS (
  SELECT v.*,
         CASE WHEN r.minimo IS NULL THEN NULL
              WHEN v.value BETWEEN r.minimo AND r.maximo THEN true
              ELSE false END AS en_rango
  FROM lab_values v
  LEFT JOIN _rangos_308 r USING (parameter_key)
  WHERE v.is_voided = false
),
grupos AS (
  SELECT user_id, parameter_key, measured_at,
         count(DISTINCT round(value, 6)) AS valores_distintos
  FROM vivos GROUP BY 1,2,3 HAVING count(*) > 1
),
puntuado AS (
  SELECT v.*, g.valores_distintos,
    (CASE
       WHEN g.valores_distintos = 1 THEN 0
       WHEN v.en_rango IS false THEN -100
       WHEN v.en_rango IS true AND v.source = 'manual' THEN 60
       WHEN v.en_rango IS true THEN 50
       WHEN v.source = 'manual' THEN 40
       ELSE 0
     END)
    + (CASE WHEN v.unit IS NOT NULL THEN 5 ELSE 0 END) AS puntos
  FROM vivos v JOIN grupos g USING (user_id, parameter_key, measured_at)
),
ganador AS (
  SELECT DISTINCT ON (user_id, parameter_key, measured_at) id
  FROM puntuado
  ORDER BY user_id, parameter_key, measured_at, puntos DESC, unit NULLS LAST, created_at
),
anulados AS (
  UPDATE lab_values SET is_voided = true
  WHERE id IN (SELECT id FROM puntuado) AND id NOT IN (SELECT id FROM ganador)
  RETURNING parameter_key, value, measured_at, source
)
INSERT INTO _anulados_308 (parameter_key, value, measured_at)
SELECT parameter_key, value, measured_at FROM anulados WHERE source = 'manual';

-- El aviso de la 307: que no se anule un valor capturado a mano en silencio.
DO $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT * FROM _anulados_308 ORDER BY parameter_key LOOP
    n := n + 1;
    RAISE NOTICE 'Se anulo un valor capturado a mano: % = % (%). Revisar si la persona tenia razon.',
      r.parameter_key, r.value, r.measured_at;
  END LOOP;
  IF n = 0 THEN
    RAISE NOTICE 'No se anulo ningun valor capturado a mano.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_lab_values_un_vivo
  ON lab_values (user_id, parameter_key, measured_at)
  WHERE is_voided = false;

-- Y la llave vieja se va. Tenía el origen dentro, que es justo el defecto que
-- esta migración corrige, y además impedía conservar el histórico: con ella
-- puesta, corregir un valor del mismo origen tenía que PISAR la fila anterior
-- para no chocar. Sin ella, la corrección anula la vieja y escribe una nueva,
-- así que queda el rastro de qué decía antes y desde cuándo.
ALTER TABLE lab_values
  DROP CONSTRAINT IF EXISTS lab_values_user_id_parameter_key_measured_at_source_key;

COMMENT ON INDEX ux_lab_values_un_vivo IS
  'La regla de la casa como restricción: a lo más un valor VIVO por usuario, '
  'dato y fecha, sin importar de dónde vino. Corregir es anular y escribir, '
  'nunca acumular. Ver 307 para el incidente que lo motivó.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · LA ÚNICA PUERTA DE ESCRITURA
-- ═══════════════════════════════════════════════════════════════════════════

-- Devuelve: 'escrito' | 'sin_cambio' | 'protegido'
--   escrito     → se anuló el anterior (si había) y entró el nuevo
--   sin_cambio  → ya existía ese mismo valor vivo, no se tocó nada
--   protegido   → hay un valor que un humano confirmó fuera de rango y quien
--                 escribe es un parser: no se pisa
--
-- 4EP GRAVE-3 — DOS PREGUNTAS DISTINTAS, DOS PARÁMETROS DISTINTOS.
--
-- La primera versión tenía un solo booleano, "confirmado por humano", que
-- servía a la vez para "quién escribe" y para "este valor está fuera de rango
-- y la persona lo sostiene". Mezclarlas producía dos daños opuestos:
--
--   · La captura manual marcaba TODO como confirmado fuera de rango, incluidos
--     los valores normales. Después, subir el PDF del mismo estudio no podía
--     corregir nada: el parser chocaba contra la protección de valores que
--     nunca estuvieron fuera de rango.
--   · Y al revés: una persona corrigiendo a mano un valor suyo que sí estaba
--     protegido se bloqueaba a sí misma.
--
-- La protección es contra los PARSERS, no contra las personas. Por eso:
--   p_es_humano       → quién escribe. Un humano siempre puede corregir.
--   p_fuera_confirmado→ este valor cae fuera del rango clínico y una persona
--                       lo sostiene de todos modos. Es lo que se protege.
CREATE OR REPLACE FUNCTION lab_valor_guardar(
  p_user_id       uuid,
  p_parameter_key text,
  p_value         numeric,
  p_unit          text,
  p_measured_at   date,
  p_source        text,
  p_upload_id     uuid DEFAULT NULL,
  p_lab_result_id uuid DEFAULT NULL,
  p_es_humano     boolean DEFAULT false,
  p_fuera_confirmado boolean DEFAULT false
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actual   lab_values%ROWTYPE;
  v_protegido boolean;
BEGIN
  -- SECURITY DEFINER con user_id por parámetro: sin esta comprobación,
  -- cualquiera con sesión podría escribir en el expediente de otra persona.
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND NOT EXISTS (
       SELECT 1 FROM coach_clients cc
       WHERE cc.coach_id = auth.uid() AND cc.client_id = p_user_id AND cc.status = 'active'
     ) THEN
    RAISE EXCEPTION 'Sin permiso para escribir valores de %', p_user_id;
  END IF;

  SELECT * INTO v_actual FROM lab_values
  WHERE user_id = p_user_id AND parameter_key = p_parameter_key
    AND measured_at = p_measured_at AND is_voided = false
  LIMIT 1;

  IF FOUND THEN
    -- Mismo número: no hay nada que hacer. Reescribir por reescribir cambiaría
    -- el created_at y el rastro de auditoría sin cambiar el dato.
    IF round(v_actual.value, 6) = round(p_value, 6) THEN
      RETURN 'sin_cambio';
    END IF;

    -- Dato del usuario sagrado: si una persona sostuvo a mano un valor que cae
    -- fuera del rango clínico, ningún parser lo pisa. Otra persona sí puede.
    v_protegido := COALESCE((v_actual.metadata->>'confirmado_fuera_de_rango')::boolean, false);
    IF v_protegido AND NOT p_es_humano THEN
      RETURN 'protegido';
    END IF;

    UPDATE lab_values SET is_voided = true WHERE id = v_actual.id;
  END IF;

  -- Insert limpio: la fila anterior quedó anulada arriba, así que el índice
  -- parcial deja pasar ésta. Lo anulado se queda como histórico.
  INSERT INTO lab_values (
    user_id, parameter_key, value, unit, measured_at, source,
    upload_id, lab_result_id, metadata
  ) VALUES (
    p_user_id, p_parameter_key, p_value, p_unit, p_measured_at, p_source,
    p_upload_id, p_lab_result_id,
    jsonb_build_object(
      'confirmado_fuera_de_rango', p_fuera_confirmado,
      'escrito_por_humano', p_es_humano
    )
  );

  RETURN 'escrito';
END;
$$;

COMMENT ON FUNCTION lab_valor_guardar IS
  'La ÚNICA puerta de escritura a lab_values. Anula el valor vivo anterior y '
  'escribe el nuevo en un solo acto, así que nunca hay dos compitiendo. '
  'Respeta el valor que un humano confirmó fuera de rango.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · EL PASO FINAL: MIGRAR Y MORIR, EN LA MISMA TRANSACCIÓN
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION lab_revision_aprobar(
  p_upload_id     uuid,
  p_valores       jsonb,
  p_lab_result_id uuid DEFAULT NULL,
  p_source        text DEFAULT 'lab_pdf'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r            jsonb;
  v_user_id    uuid;
  v_estado     text;
  v_escritos   int := 0;
  v_sin_cambio int := 0;
  v_protegidos int := 0;
  v_res        text;
BEGIN
  SELECT user_id, status INTO v_user_id, v_estado FROM lab_uploads WHERE id = p_upload_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'El estudio % no existe', p_upload_id;
  END IF;

  -- 4EP MEDIO-3: aprobar dos veces no duplicaba valores (el índice único lo
  -- impide), pero SÍ creaba dos filas en lab_results, y lab_uploads acababa
  -- apuntando a la segunda mientras los valores apuntaban a la primera. La
  -- invariante no puede depender de que la navegación no rebote.
  IF v_estado = 'confirmed' THEN
    RAISE EXCEPTION 'El estudio % ya estaba confirmado', p_upload_id
      USING ERRCODE = '23505';
  END IF;

  -- 4EP GRAVE-4: si no llega ni un valor, esto NO es una aprobación. Antes
  -- marcaba el estudio como confirmado igual, y quedaba una fila ancha que la
  -- persona veía y un motor que no tenía nada.
  IF jsonb_array_length(COALESCE(p_valores, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'No hay valores que guardar para el estudio %', p_upload_id;
  END IF;

  -- Quien aprueba tiene que ser el dueño o su coach activo. La función es
  -- SECURITY DEFINER, así que la comprobación va explícita: si no, cualquiera
  -- con la llave del estudio escribiría en el expediente de otro.
  IF auth.uid() IS DISTINCT FROM v_user_id
     AND NOT EXISTS (
       SELECT 1 FROM coach_clients cc
       WHERE cc.coach_id = auth.uid() AND cc.client_id = v_user_id AND cc.status = 'active'
     ) THEN
    RAISE EXCEPTION 'Sin permiso para aprobar el estudio %', p_upload_id;
  END IF;

  -- POR QUÉ LOS VALORES LLEGAN POR PARÁMETRO Y NO SE LEEN DE lab_revision:
  -- la canonicalización de claves (inglés a español, alias como ggt que se
  -- desdobla en dos filas) y la conversión de unidades viven en TypeScript,
  -- probadas (lab-canonical-map, lab-unit-converters, lab-parser-process).
  -- Duplicarlas aquí en SQL sería una segunda resolución del mismo problema,
  -- que es exactamente el defecto que este proyecto lleva meses cerrando.
  -- Así que TypeScript canoniza y esta función hace lo único que TypeScript
  -- no puede: escribir, borrar el temporal y confirmar el estudio SIN que
  -- exista un instante donde el dato viva en dos lugares. Si algo revienta,
  -- no se escribió nada y el temporal sigue ahí para reintentar.
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_valores, '[]'::jsonb))
  LOOP
    v_res := lab_valor_guardar(
      v_user_id,
      r->>'parameter_key',
      (r->>'value')::numeric,
      r->>'unit',
      (r->>'measured_at')::date,
      -- 4EP MEDIO-5: la procedencia viaja POR DATO. Un valor que la persona
      -- corrigió a mano en la pantalla es 'manual', no 'lab_pdf'. La 307 pudo
      -- reconstruir el incidente del colesterol precisamente porque el origen
      -- distinguía quién había escrito cada fila.
      COALESCE(r->>'source', p_source),
      COALESCE((r->>'upload_id')::uuid, p_upload_id),
      p_lab_result_id,
      COALESCE((r->>'es_humano')::boolean, false),
      COALESCE((r->>'fuera_confirmado')::boolean, false)
    );
    IF v_res = 'escrito' THEN v_escritos := v_escritos + 1;
    ELSIF v_res = 'sin_cambio' THEN v_sin_cambio := v_sin_cambio + 1;
    ELSE v_protegidos := v_protegidos + 1;
    END IF;
  END LOOP;

  -- El temporal muere aquí, en la misma transacción que lo migró.
  DELETE FROM lab_revision WHERE upload_id = p_upload_id;

  UPDATE lab_uploads
  SET status = 'confirmed',
      lab_result_id = COALESCE(p_lab_result_id, lab_result_id)
  WHERE id = p_upload_id;

  RETURN jsonb_build_object(
    'escritos', v_escritos,
    'sin_cambio', v_sin_cambio,
    'protegidos', v_protegidos
  );
END;
$$;

COMMENT ON FUNCTION lab_revision_aprobar IS
  'El paso final del colector: escribe los valores ya canonizados, BORRA el '
  'placeholder temporal y marca el estudio como confirmado, todo en una '
  'transacción. Aprobar dos veces no duplica: la segunda vuelta devuelve '
  'sin_cambio porque el valor ya está vivo con ese número.';

-- Descartar una revisión: el temporal muere sin migrar nada.
CREATE OR REPLACE FUNCTION lab_revision_descartar(p_upload_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_user_id uuid; v_borradas int;
BEGIN
  SELECT user_id INTO v_user_id FROM lab_uploads WHERE id = p_upload_id;
  IF v_user_id IS NULL THEN RETURN 0; END IF;
  IF auth.uid() IS DISTINCT FROM v_user_id
     AND NOT EXISTS (
       SELECT 1 FROM coach_clients cc
       WHERE cc.coach_id = auth.uid() AND cc.client_id = v_user_id AND cc.status = 'active'
     ) THEN
    RAISE EXCEPTION 'Sin permiso para descartar el estudio %', p_upload_id;
  END IF;
  DELETE FROM lab_revision WHERE upload_id = p_upload_id;
  GET DIAGNOSTICS v_borradas = ROW_COUNT;
  UPDATE lab_uploads SET status = 'cancelled' WHERE id = p_upload_id;
  RETURN v_borradas;
END;
$$;

REVOKE ALL ON FUNCTION lab_valor_guardar FROM public;
REVOKE ALL ON FUNCTION lab_revision_aprobar FROM public;
REVOKE ALL ON FUNCTION lab_revision_descartar FROM public;
GRANT EXECUTE ON FUNCTION lab_valor_guardar TO authenticated;
GRANT EXECUTE ON FUNCTION lab_revision_aprobar TO authenticated;
GRANT EXECUTE ON FUNCTION lab_revision_descartar TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- CANDADOS DE LA PROPIA MIGRACIÓN
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE sobrantes int;
BEGIN
  SELECT count(*) INTO sobrantes FROM (
    SELECT 1 FROM lab_values WHERE is_voided = false
    GROUP BY user_id, parameter_key, measured_at HAVING count(*) > 1
  ) t;
  IF sobrantes > 0 THEN
    RAISE EXCEPTION 'Quedaron % grupos con mas de un valor vivo por fecha', sobrantes;
  END IF;
  RAISE NOTICE 'Un solo valor vivo por dato y fecha: verificado.';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ux_lab_values_un_vivo') THEN
    RAISE EXCEPTION 'El indice ux_lab_values_un_vivo no quedo creado';
  END IF;
  IF to_regclass('public.lab_revision') IS NULL THEN
    RAISE EXCEPTION 'La tabla lab_revision no quedo creada';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lab_values_user_id_parameter_key_measured_at_source_key'
  ) THEN
    RAISE EXCEPTION 'La llave vieja con source sigue viva';
  END IF;
  RAISE NOTICE 'Colector: tabla temporal, indice y funciones en su lugar.';
END $$;

COMMIT;
