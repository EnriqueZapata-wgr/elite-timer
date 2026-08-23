-- 307_lab_values_un_valor_por_fecha.sql
--
-- UN SOLO VALOR VIVO POR DATO Y POR FECHA.
--
-- POR QUÉ
-- lab_values tiene UNIQUE (user_id, parameter_key, measured_at, source). Al
-- incluir el origen en la llave, el mismo parámetro del mismo día puede vivir
-- tres veces: una por cada etiqueta de origen. Y cuando el motor lee, gana la
-- fila que Postgres devuelva primero, que no está definido.
--
-- No es teórico. En la cuenta de pruebas, al 21-ago-2026, hay 21 parámetros del
-- 14-jun con más de una fila viva, y seis con valores DISTINTOS. El peor:
-- colesterol total con 672 y con 172 al mismo tiempo. 672 es una urgencia
-- médica y 172 es casi normal, y cuál de los dos alimenta la Edad ATP es azar.
--
-- La secuencia que lo produjo está en las marcas de tiempo:
--   21:52  el parser lee mal el PDF y guarda 672 (origen lab_pdf)
--   22:41  el usuario lo corrige a mano y guarda 172 (origen manual)
--   03:49  una re-extracción vuelve a meter 672 con otro origen
-- La corrección del humano nunca ganó: solo se sumó a la pila.
--
-- Esos tres valores (LDL 2.27, HDL 2.15, colesterol total 672) son los mismos
-- que están documentados en src/constants/lab-clinical-ranges.ts como el
-- incidente que motivó ese módulo. La validación se construyó y funciona hacia
-- adelante, pero las filas viejas nunca se limpiaron.
--
-- QUÉ HACE ESTA MIGRACIÓN
-- Deja una sola fila viva por (usuario, parámetro, fecha). Las demás se anulan
-- con is_voided, NO se borran: el histórico se conserva y se puede revertir.
--
-- LA REGLA, en este orden:
--   1. Si los valores son iguales, se conserva uno y se anulan los repetidos.
--   2. Si difieren y uno cae FUERA del rango clínico absoluto, gana el que está
--      dentro. Aquí el humano puede perder, y debe: en MCV, el valor capturado
--      a mano (30.5) está fuera de rango y el leído del PDF (92.3) está dentro.
--      30.5 es un MCH escrito en el campo del MCV.
--   3. Si difieren y los dos son plausibles, gana el capturado a mano: la
--      persona lo escribió mirando su hoja.
--
-- LÍMITE CONOCIDO DE LA REGLA 2, y por eso el aviso de abajo.
-- Si una persona de verdad tiene un valor extremo real (colesterol de 620 en
-- una hipercolesterolemia familiar), el parser lo lee mal, y ella lo teclea
-- correcto, esta regla anularía el valor bueno por caer fuera del rango. En
-- estas 21 filas no ocurre: las seis en conflicto son tres errores de unidad,
-- un MCH escrito en el campo del MCV, y dos diferencias chicas entre valores
-- plausibles. Aun así, la migración AVISA cada vez que anula un valor
-- capturado a mano, para que si alguna vez corre sobre datos que nadie miró,
-- eso no pase en silencio.
--
-- Hacia adelante el problema no se repite: con la tabla temporal y la función
-- de migración, nunca hay dos filas compitiendo por el mismo dato. Y el valor
-- que un humano confirma fuera de rango se marca como tal y ningún parser lo
-- puede pisar.
--   4. A igualdad, gana la fila que trae unidad, y luego la más antigua.
--
-- Los rangos de abajo son copia de lab-clinical-ranges.ts para los seis
-- parámetros en conflicto. No se inventó ninguno.
--
-- Idempotente: correrla dos veces no cambia nada la segunda vez.

BEGIN;

CREATE TEMP TABLE _rangos (parameter_key text, minimo numeric, maximo numeric) ON COMMIT DROP;
INSERT INTO _rangos VALUES
  ('colesterol_total', 80, 500),
  ('colesterol_hdl', 15, 150),
  ('colesterol_ldl', 30, 400),
  ('mcv', 50, 150),
  ('tsh', 0.01, 100),
  ('proteina_c_reactiva_cuantitativa_pcr', 0, 50);

WITH vivos AS (
  SELECT v.*, 
         CASE WHEN r.minimo IS NULL THEN NULL
              WHEN v.value BETWEEN r.minimo AND r.maximo THEN true
              ELSE false END AS en_rango
  FROM lab_values v
  LEFT JOIN _rangos r USING (parameter_key)
  WHERE v.is_voided = false
),
grupos AS (
  SELECT user_id, parameter_key, measured_at,
         count(DISTINCT round(value, 6)) AS valores_distintos
  FROM vivos
  GROUP BY 1, 2, 3
  HAVING count(*) > 1
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
  FROM vivos v
  JOIN grupos g USING (user_id, parameter_key, measured_at)
),
ganador AS (
  SELECT DISTINCT ON (user_id, parameter_key, measured_at) id
  FROM puntuado
  ORDER BY user_id, parameter_key, measured_at, puntos DESC, unit NULLS LAST, created_at
)
UPDATE lab_values
SET is_voided = true
WHERE id IN (SELECT id FROM puntuado)
  AND id NOT IN (SELECT id FROM ganador);

-- Aviso: qué valores capturados A MANO se anularon. Que quede en el registro
-- de la corrida, no solo en el resultado.
DO $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN
    SELECT parameter_key, value, measured_at
    FROM lab_values
    WHERE is_voided = true AND source = 'manual'
      AND id IN (SELECT id FROM lab_values WHERE is_voided = true)
    ORDER BY parameter_key
  LOOP
    n := n + 1;
    RAISE NOTICE 'Se anulo un valor capturado a mano: % = % (%). Revisar si la persona tenia razon.',
      r.parameter_key, r.value, r.measured_at;
  END LOOP;
  IF n = 0 THEN
    RAISE NOTICE 'No se anulo ningun valor capturado a mano.';
  END IF;
END $$;

-- Candado: si después de esto queda un solo grupo con dos filas vivas, la
-- migración no hizo su trabajo y no debe darse por buena.
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
END $$;

COMMIT;
