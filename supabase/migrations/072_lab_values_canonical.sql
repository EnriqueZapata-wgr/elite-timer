-- ============================================================
-- Migración 072 — lab_values: fuente de verdad time-series canónica de labs
-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor (Enrique) ANTES del deploy.
--
-- Causa raíz que resuelve: la lectura de labs usaba lab_results.limit(1) +
-- lab_uploads.limit(1) + edad_atp_biomarkers con prioridad POR FUENTE. Un panel parcial
-- nuevo BORRABA (para la lectura) glucosa/tiroides de paneles anteriores, y un valor viejo
-- a mano ganaba a un lab fresco. Aquí: una fila por valor con fecha+procedencia → último
-- por parámetro, sin perder nada.
--
-- Idempotente: re-ejecutable. CREATE ... IF NOT EXISTS, políticas con DROP previo, y el
-- backfill usa ON CONFLICT DO NOTHING contra el UNIQUE.
-- ============================================================

CREATE TABLE IF NOT EXISTS lab_values (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id),
  parameter_key text NOT NULL,          -- CLAVE CANÓNICA = key de matriz V7/V6 (español);
                                        -- PhenoAge-only (albumin/mcv/alp/lymphocyte_pct) en inglés.
  value         numeric NOT NULL,
  unit          text,
  measured_at   date NOT NULL,          -- fecha de la muestra (recencia + gráfica)
  source        text NOT NULL,          -- 'lab_pdf' | 'manual' | 'upload_extract' | 'wearable' | 'form'
  upload_id     uuid REFERENCES lab_uploads(id),
  lab_result_id uuid REFERENCES lab_results(id),
  is_voided     boolean NOT NULL DEFAULT false,  -- soft-delete (archivo mal subido, #11)
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, parameter_key, measured_at, source)  -- idempotente al re-extraer
);

ALTER TABLE lab_values ENABLE ROW LEVEL SECURITY;  -- regla CLAUDE.md #4

-- Patrón EXACTO de lab_uploads (018/019): tabla coach = coach_clients, status = 'active'.
DROP POLICY IF EXISTS "User manages own lab_values" ON lab_values;
DROP POLICY IF EXISTS "Coach manages client lab_values" ON lab_values;
CREATE POLICY "User manages own lab_values" ON lab_values FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach manages client lab_values" ON lab_values FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients cc
          WHERE cc.coach_id = auth.uid() AND cc.client_id = lab_values.user_id AND cc.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_lab_values_latest
  ON lab_values (user_id, parameter_key, measured_at DESC) WHERE NOT is_voided;
CREATE INDEX IF NOT EXISTS idx_lab_values_upload ON lab_values (upload_id);

-- ============================================================
-- Mapeo english-column → parameter_key canónico (espejo de src/constants/lab-canonical-map.ts).
-- Si se edita uno, editar el otro. `convert_pct` = hba1c/hematocrito/rdw %→fracción decimal.
-- Algunas columnas tienen 2 claves (AST, GGT comparten columna en la matriz) → 2 filas aquí.
-- ============================================================
CREATE TEMP TABLE _lab_canon_map (col_name text, parameter_key text, convert_pct boolean) ON COMMIT DROP;
INSERT INTO _lab_canon_map (col_name, parameter_key, convert_pct) VALUES
  ('glucose','glucosa_en_ayuno',false),
  ('hba1c','hba1c',true),
  ('insulin','insulina',false),
  ('homa_ir','homair',false),
  ('cholesterol_total','colesterol_total',false),
  ('hdl','colesterol_hdl',false),
  ('ldl','colesterol_ldl',false),
  ('triglycerides','trigliceridos',false),
  ('vldl','vldl',false),
  ('apo_b','apolipoproteinas_b',false),
  ('tsh','tsh',false),
  ('t3_free','t3_libre',false),
  ('testosterone','testosterona_total',false),
  ('testosterone_free','testosterona_libre_pgml',false),
  ('cortisol','cortisol_matutino',false),
  ('fsh','fsh',false),
  ('lh','lh',false),
  ('prolactin','prolactina',false),
  ('vitamin_d','vitamina_d',false),
  ('vitamin_b12','vitamina_b12',false),
  ('iron','hierro_serico',false),
  ('ferritin','ferritina',false),
  ('magnesium','magnesio',false),
  ('folate','folato_acido_folico',false),
  ('iron_binding','capacidad_de_fijacion_de_hierro',false),
  ('iron_saturation','saturacion_de_hierro',false),
  ('transferrin','transferrina',false),
  ('pcr','proteina_c_reactiva_cuantitativa_pcr',false),
  ('homocysteine','homocisteina',false),
  ('rheumatoid_factor','factor_reumatoide',false),
  ('aso','antiestreptolisinas',false),
  ('ldh','ldh',false),
  ('cpk','cpk',false),
  ('iga','iga',false),
  ('ige','ige',false),
  ('igg','igg',false),
  ('igm','igm',false),
  ('alt','transaminasa_glutamico_piruvica_alt',false),
  ('ast','transaminasa_glutamico_oxalacetica_ast',false),
  ('ast','transaminasa_g_oxalacetica_ast_tgo',false),
  ('ggt','gama_glutamil_transferasa',false),
  ('ggt','ggt',false),
  ('bilirubin','bilirrubina',false),
  ('creatinine','creatinina_serica',false),
  ('uric_acid','acido_urico',false),
  ('bun','nitrogeno_ureico_bun',false),
  ('urea','urea',false),
  ('sodium','sodio',false),
  ('potassium','potasio',false),
  ('chloride','cloro',false),
  ('hemoglobin','hemoglobina',false),
  ('hematocrit','hematocrito',true),
  ('rdw','rdw_cv',true),
  ('wbc','leucocitos_totales',false),
  ('albumin','albumin',false),
  ('mcv','mcv',false),
  ('alp','alp',false),
  ('lymphocyte_pct','lymphocyte_pct',false);

-- ============================================================
-- BACKFILL 1 — lab_results (ancha) → lab_values. Unpivot por columna.
-- measured_at = lab_date; source 'lab_pdf'; conserva lab_result_id + upload_id (void-able).
-- ============================================================
INSERT INTO lab_values (user_id, parameter_key, value, unit, measured_at, source, lab_result_id, upload_id)
SELECT lr.user_id,
       m.parameter_key,
       CASE WHEN m.convert_pct AND col.value > 1 THEN col.value / 100.0 ELSE col.value END,
       NULL,
       lr.lab_date,
       'lab_pdf',
       lr.id,
       lr.upload_id
FROM lab_results lr
CROSS JOIN LATERAL (VALUES
  ('glucose', lr.glucose), ('hba1c', lr.hba1c), ('insulin', lr.insulin), ('homa_ir', lr.homa_ir),
  ('cholesterol_total', lr.cholesterol_total), ('hdl', lr.hdl), ('ldl', lr.ldl),
  ('triglycerides', lr.triglycerides), ('vldl', lr.vldl), ('apo_b', lr.apo_b),
  ('tsh', lr.tsh), ('t3_free', lr.t3_free), ('testosterone', lr.testosterone),
  ('testosterone_free', lr.testosterone_free), ('cortisol', lr.cortisol), ('fsh', lr.fsh),
  ('lh', lr.lh), ('prolactin', lr.prolactin), ('vitamin_d', lr.vitamin_d),
  ('vitamin_b12', lr.vitamin_b12), ('iron', lr.iron), ('ferritin', lr.ferritin),
  ('magnesium', lr.magnesium), ('folate', lr.folate), ('iron_binding', lr.iron_binding),
  ('iron_saturation', lr.iron_saturation), ('transferrin', lr.transferrin), ('pcr', lr.pcr),
  ('homocysteine', lr.homocysteine), ('rheumatoid_factor', lr.rheumatoid_factor), ('aso', lr.aso),
  ('ldh', lr.ldh), ('cpk', lr.cpk), ('iga', lr.iga), ('ige', lr.ige), ('igg', lr.igg), ('igm', lr.igm),
  ('alt', lr.alt), ('ast', lr.ast), ('ggt', lr.ggt), ('bilirubin', lr.bilirubin),
  ('creatinine', lr.creatinine), ('uric_acid', lr.uric_acid), ('bun', lr.bun), ('urea', lr.urea),
  ('sodium', lr.sodium), ('potassium', lr.potassium), ('chloride', lr.chloride),
  ('hemoglobin', lr.hemoglobin), ('hematocrit', lr.hematocrit), ('rdw', lr.rdw), ('wbc', lr.wbc),
  ('albumin', lr.albumin), ('mcv', lr.mcv), ('alp', lr.alp), ('lymphocyte_pct', lr.lymphocyte_pct)
) AS col(col_name, value)
JOIN _lab_canon_map m ON m.col_name = col.col_name
WHERE col.value IS NOT NULL
ON CONFLICT (user_id, parameter_key, measured_at, source) DO NOTHING;

-- ============================================================
-- BACKFILL 2 — lab_uploads.extracted_data (JSONB) → lab_values.
-- Soporta shape nested { values: { k: { value } } } y flat { k: value }. Guarda contra
-- valores no-numéricos (filtro regex antes del cast). source 'upload_extract'.
-- ============================================================
INSERT INTO lab_values (user_id, parameter_key, value, unit, measured_at, source, upload_id)
SELECT lu.user_id,
       m.parameter_key,
       CASE WHEN m.convert_pct AND v.num > 1 THEN v.num / 100.0 ELSE v.num END,
       NULL,
       lu.uploaded_at::date,
       'upload_extract',
       lu.id
FROM lab_uploads lu
CROSS JOIN LATERAL jsonb_each(COALESCE(lu.extracted_data->'values', lu.extracted_data)) AS e(k, val)
JOIN _lab_canon_map m ON m.col_name = e.k
CROSS JOIN LATERAL (
  SELECT CASE WHEN jsonb_typeof(e.val) = 'object' THEN e.val->>'value' ELSE trim(both '"' from e.val::text) END AS txt
) AS raw
CROSS JOIN LATERAL (SELECT raw.txt::numeric AS num) AS v
WHERE lu.extracted_data IS NOT NULL
  AND raw.txt ~ '^-?[0-9]+(\.[0-9]+)?$'
ON CONFLICT (user_id, parameter_key, measured_at, source) DO NOTHING;

-- ============================================================
-- BACKFILL 3 — edad_atp_biomarkers → lab_values (source 'manual').
-- biomarker_key ya es clave canónica. Convierte pct para hba1c/hematocrito/rdw_cv.
-- ============================================================
INSERT INTO lab_values (user_id, parameter_key, value, unit, measured_at, source)
SELECT b.user_id,
       b.biomarker_key,
       CASE WHEN b.biomarker_key IN ('hba1c','hematocrito','rdw_cv') AND b.value > 1
            THEN b.value / 100.0 ELSE b.value END,
       b.unit,
       b.measured_at::date,
       'manual'
FROM edad_atp_biomarkers b
WHERE b.value IS NOT NULL
ON CONFLICT (user_id, parameter_key, measured_at, source) DO NOTHING;

-- Verificación rápida (correr a mano tras la migración):
--   SELECT source, count(*) FROM lab_values GROUP BY source;
--   SELECT parameter_key, value, measured_at, source FROM lab_values
--     WHERE user_id = '<uid>' AND NOT is_voided ORDER BY parameter_key, measured_at DESC;
