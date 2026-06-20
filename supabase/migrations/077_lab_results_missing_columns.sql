-- ============================================================================
-- 077 — LAB_RESULTS columnas faltantes (audit L2, 19-jun)
-- Biomarcadores que el parser AI extrae pero que lab_results (tabla ancha, flujo v1) no tenía
-- como columna → se perdían al guardar por columna. El flujo CANÓNICO actual escribe a
-- lab_values (key-value, no necesita columnas) vía lab-canonical-map; estas columnas son para
-- compatibilidad del flujo v1/expediente ancho. Idempotente.
-- ⚠️ NO EJECUTAR AUTOMÁTICAMENTE — Enrique la corre con `npx supabase db push` (regla #12).
-- ============================================================================

ALTER TABLE lab_results
  -- Tiroides extendida
  ADD COLUMN IF NOT EXISTS t4_free NUMERIC,
  ADD COLUMN IF NOT EXISTS total_t3 NUMERIC,
  ADD COLUMN IF NOT EXISTS total_t4 NUMERIC,
  ADD COLUMN IF NOT EXISTS anti_tpo NUMERIC,
  ADD COLUMN IF NOT EXISTS anti_tg NUMERIC,
  -- Hormonal extendida
  ADD COLUMN IF NOT EXISTS estradiol NUMERIC,
  ADD COLUMN IF NOT EXISTS progesterone NUMERIC,
  ADD COLUMN IF NOT EXISTS dhea NUMERIC,
  ADD COLUMN IF NOT EXISTS shbg NUMERIC,
  ADD COLUMN IF NOT EXISTS igf1 NUMERIC,
  -- Lípidos extendidos
  ADD COLUMN IF NOT EXISTS non_hdl_cholesterol NUMERIC,
  ADD COLUMN IF NOT EXISTS lp_a NUMERIC,
  -- Minerales
  ADD COLUMN IF NOT EXISTS calcium NUMERIC,
  ADD COLUMN IF NOT EXISTS phosphorus NUMERIC,
  ADD COLUMN IF NOT EXISTS zinc NUMERIC,
  -- Inflamación / coagulación
  ADD COLUMN IF NOT EXISTS esr NUMERIC,
  ADD COLUMN IF NOT EXISTS fibrinogen NUMERIC,
  ADD COLUMN IF NOT EXISTS complement_c3 NUMERIC,
  ADD COLUMN IF NOT EXISTS complement_c4 NUMERIC,
  ADD COLUMN IF NOT EXISTS pt NUMERIC,
  ADD COLUMN IF NOT EXISTS ptt NUMERIC,
  ADD COLUMN IF NOT EXISTS inr NUMERIC,
  -- Hepático / proteínas
  ADD COLUMN IF NOT EXISTS bilirubin_direct NUMERIC,
  ADD COLUMN IF NOT EXISTS bilirubin_indirect NUMERIC,
  ADD COLUMN IF NOT EXISTS total_protein NUMERIC,
  ADD COLUMN IF NOT EXISTS globulin NUMERIC,
  ADD COLUMN IF NOT EXISTS ag_ratio NUMERIC,
  -- Renal / electrolitos
  ADD COLUMN IF NOT EXISTS co2 NUMERIC,
  ADD COLUMN IF NOT EXISTS gfr NUMERIC,
  -- Biometría hemática extendida
  ADD COLUMN IF NOT EXISTS platelets NUMERIC,
  ADD COLUMN IF NOT EXISTS rbc NUMERIC,
  ADD COLUMN IF NOT EXISTS mch NUMERIC,
  ADD COLUMN IF NOT EXISTS mchc NUMERIC,
  ADD COLUMN IF NOT EXISTS mpv NUMERIC,
  ADD COLUMN IF NOT EXISTS neutrophils_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS monocytes_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS eosinophils_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS basophils_pct NUMERIC,
  -- Metabólico extendido
  ADD COLUMN IF NOT EXISTS fructosamine NUMERIC,
  ADD COLUMN IF NOT EXISTS c_peptide NUMERIC;
