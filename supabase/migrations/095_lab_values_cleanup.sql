-- 095_lab_values_cleanup.sql — Limpieza del "desmadre" de ATP LABS (smoke Enrique 23-jun).
--
-- Basado en cowork_handoff/INVENTARIO_LABS.md (queries reales sobre lab_values). Resuelve:
--   (A) duplicados en/es — el parser/captura persistió la key inglesa cruda (`testosterone`)
--       junto a la canónica español (`testosterona_total`) → 2 filas por biomarcador.
--   (B) valor absurdo — testosterona_total 9–9.93 (ng/mL etiquetado como ng/dL).
--   (C) basura del parser — void defensivo (0 matches actuales, red de seguridad).
--
-- Doctrina conservadora:
--   - Soft-delete con is_voided=true (REVERSIBLE), nunca DELETE.
--   - Colisión-segura: el UNIQUE(user_id,parameter_key,measured_at,source) impide renombrar
--     inglés→español si el usuario ya tiene la fila española ese día → en ese caso se voida el
--     duplicado inglés (su valor se reconcilia con la corrección ×100 de abajo).
--   - Idempotente: re-correr es no-op (las keys inglesas dejan de existir; value<50 deja de matchear).
--
-- ⚠️ NO ejecutar aquí — Enrique aplica con `npx supabase db push` tras auditar.
-- ⚠️ Implicación: el merge inglés→español AGREGA esos valores a lo que ve el motor de Edad ATP
--    (que lee por parameter_key español). Es lo correcto, pero Enrique debe validar el smoke.

-- Columna de trazabilidad de correcciones (no existía).
ALTER TABLE lab_values ADD COLUMN IF NOT EXISTS metadata jsonb;

-- (C) Basura del parser AI — void defensivo. Lista del screenshot; 0 matches hoy en lab_values.
UPDATE lab_values SET is_voided = true
WHERE NOT is_voided AND parameter_key IN (
  'levocartine_fatum', 'h41', 'iuf', 'iuf_105', 'bio_leukocitos_total', 'bio_leukocitos'
);

-- (A) Merge en/es: void de colisiones + rename del resto. Pares del INVENTARIO_LABS §2.
DO $$
DECLARE
  pairs text[][] := ARRAY[
    ['testosterone','testosterona_total'],
    ['insulin','insulina'],
    ['cortisol','cortisol_matutino'],
    ['uric_acid','acido_urico'],
    ['t3_free','t3_libre'],
    ['total_cholesterol','colesterol_total'],
    ['ldl','colesterol_ldl'],
    ['hdl','colesterol_hdl'],
    ['crp','proteina_c_reactiva_cuantitativa_pcr'],
    ['glucose','glucosa_en_ayuno'],
    ['creatinine','creatinina_serica'],
    ['homocysteine','homocisteina'],
    ['triglycerides','trigliceridos'],
    ['wbc','leucocitos_totales']
  ];
  i int;
  en text;
  es text;
BEGIN
  FOR i IN 1 .. array_length(pairs, 1) LOOP
    en := pairs[i][1];
    es := pairs[i][2];
    -- Void de la fila inglesa que colisionaría con una española existente (mismo user/fecha/source).
    UPDATE lab_values e SET is_voided = true
    FROM lab_values s
    WHERE e.parameter_key = en AND s.parameter_key = es
      AND e.user_id = s.user_id AND e.measured_at = s.measured_at AND e.source = s.source
      AND NOT e.is_voided AND NOT s.is_voided;
    -- Rename del resto (sin colisión) inglés → español.
    UPDATE lab_values SET parameter_key = es
    WHERE parameter_key = en AND NOT is_voided;
  END LOOP;
END $$;

-- (B) Corrección de unidad: testosterona_total < 50 ng/dL es implausible → estaba en ng/mL.
-- ×100 lo lleva al rango real (9.93 → 993, reconcilia con el `testosterone` 994 que se mergeó).
UPDATE lab_values
  SET value = value * 100,
      metadata = COALESCE(metadata, '{}'::jsonb)
                 || jsonb_build_object('auto_corrected_unit', 'ng/mL->ng/dL x100', 'original_value', value)
WHERE parameter_key = 'testosterona_total' AND NOT is_voided AND value < 50;

-- FLAGS (NO auto-corregidos — requieren decisión, ver INVENTARIO_LABS §5):
--   - leucocitos_totales: unidades mixtas (miles vs /µL) — riesgoso auto-fijar.
--   - vitamina_b12 6000 (> max clínico) / testosterona_libre_pgml 0.022 — revisar manual.
--   - AST/GGT doble-key (transaminasa_*_ast ×2, gama_glutamil/ggt) — decisión de matriz V7/V6.
