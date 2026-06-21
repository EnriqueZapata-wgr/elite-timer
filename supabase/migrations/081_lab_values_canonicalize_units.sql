-- 081_lab_values_canonicalize_units.sql
-- L3 — Canonicaliza unidades de registros históricos en `lab_values`.
--
-- CONTEXTO (leer antes de ejecutar):
--   El path EN VIVO de PDF ya canoniza unidades en el borde de extracción (Parser v2,
--   Capa 2: lab-parser-process.ts → normalizeLabValue). Esta migración SOLO corrige
--   registros VIEJOS escritos antes de ese wiring, o por la captura manual con unidad
--   explícita no canónica.
--
-- DISEÑO (por qué NO es la versión del handoff):
--   1. `lab_values.parameter_key` es la clave ESPAÑOLA de matriz (testosterona_total),
--      no la inglesa del converter. Las conversiones de abajo usan las claves reales.
--   2. `lab_values.unit` es nullable y los inserts del pipeline NO la poblaban → la mayoría
--      de filas viejas tienen unit = NULL. Por eso esta migración corrige SOLO filas con
--      `unit` EXPLÍCITO no canónico (conversión 100% determinista y segura).
--   3. NO se hace fix por MAGNITUD (ej. "testosterona < 20 → ×100") porque es clínicamente
--      AMBIGUO: 15 ng/dL es testosterona femenina real, pero también 15 podría ser ng/mL.
--      Sin sexo en `lab_values` no se puede desambiguar sin riesgo de corromper datos reales.
--      → Filas con unit NULL se dejan intactas (flag en COWORK_REPORT, decisión de Enrique).
--   4. NO se tocan hba1c / hematocrito / rdw_cv: `lab_values` los guarda como FRACCIÓN
--      DECIMAL canónica (CANONICAL_PCT_KEYS), NO como %. La conversión "%×100" del handoff
--      los CORROMPERÍA. Su normalización ya ocurre en el borde de escritura (toCanonicalUnit).
--
-- IDEMPOTENTE: tras convertir, `unit` queda en su valor canónico → una segunda corrida no
--   vuelve a matchear. Re-ejecutable sin efecto acumulado.
--
-- ⚠️ NO EJECUTADA. Enrique audita y aplica con `npx supabase db push` tras revisar.

-- Testosterona total: ng/mL → ng/dL (×100), nmol/L → ng/dL (×28.84). Canónica: ng/dL.
UPDATE lab_values SET value = value * 100,   unit = 'ng/dL'
  WHERE parameter_key = 'testosterona_total' AND lower(replace(unit,' ','')) = 'ng/ml';
UPDATE lab_values SET value = value * 28.84, unit = 'ng/dL'
  WHERE parameter_key = 'testosterona_total' AND lower(replace(unit,' ','')) = 'nmol/l';

-- Glucosa en ayuno: mmol/L → mg/dL (×18). Canónica: mg/dL.
UPDATE lab_values SET value = value * 18, unit = 'mg/dL'
  WHERE parameter_key = 'glucosa_en_ayuno' AND lower(replace(unit,' ','')) = 'mmol/l';

-- Lípidos: mmol/L → mg/dL. Colesterol total/HDL/LDL ×38.67, triglicéridos ×88.5.
UPDATE lab_values SET value = value * 38.67, unit = 'mg/dL'
  WHERE parameter_key IN ('colesterol_total','colesterol_hdl','colesterol_ldl')
    AND lower(replace(unit,' ','')) = 'mmol/l';
UPDATE lab_values SET value = value * 88.5, unit = 'mg/dL'
  WHERE parameter_key = 'trigliceridos' AND lower(replace(unit,' ','')) = 'mmol/l';

-- Vitamina D: nmol/L → ng/mL (÷2.5). Canónica: ng/mL.
UPDATE lab_values SET value = value / 2.5, unit = 'ng/mL'
  WHERE parameter_key = 'vitamina_d' AND lower(replace(unit,' ','')) = 'nmol/l';

-- Creatinina sérica: µmol/L → mg/dL (÷88.4). Canónica: mg/dL.
UPDATE lab_values SET value = value / 88.4, unit = 'mg/dL'
  WHERE parameter_key = 'creatinina_serica'
    AND lower(replace(unit,' ','')) IN ('µmol/l','umol/l');

-- PCR cuantitativa: mg/L → mg/dL (÷10). Canónica: mg/dL.
UPDATE lab_values SET value = value / 10, unit = 'mg/dL'
  WHERE parameter_key = 'proteina_c_reactiva_cuantitativa_pcr'
    AND lower(replace(unit,' ','')) = 'mg/l';

-- WBC (leucocitos): miles/µL (×10³) → /µL (×1000). Canónica: /µL.
UPDATE lab_values SET value = value * 1000, unit = '/µL'
  WHERE parameter_key = 'leucocitos_totales'
    AND lower(replace(unit,' ','')) IN ('k/µl','k/ul','×10³/µl','10^3/µl','x10^3/ul');
