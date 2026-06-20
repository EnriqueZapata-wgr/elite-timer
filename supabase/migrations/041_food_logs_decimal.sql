-- ============================================================================
-- 041 — food_logs: columnas de macros INT → DECIMAL para soportar decimales
-- ============================================================================

ALTER TABLE food_logs ALTER COLUMN calories TYPE DECIMAL(7,1) USING calories::DECIMAL(7,1);
ALTER TABLE food_logs ALTER COLUMN protein_g TYPE DECIMAL(5,1) USING protein_g::DECIMAL(5,1);
ALTER TABLE food_logs ALTER COLUMN carbs_g TYPE DECIMAL(5,1) USING carbs_g::DECIMAL(5,1);
ALTER TABLE food_logs ALTER COLUMN fat_g TYPE DECIMAL(5,1) USING fat_g::DECIMAL(5,1);

-- fiber_g puede no existir (no estaba en migración 027 original)
DO $$ BEGIN
  ALTER TABLE food_logs ALTER COLUMN fiber_g TYPE DECIMAL(5,1) USING fiber_g::DECIMAL(5,1);
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Mismo fix para recipes si aplica
DO $$ BEGIN
  ALTER TABLE recipes ALTER COLUMN calories TYPE DECIMAL(7,1) USING calories::DECIMAL(7,1);
  ALTER TABLE recipes ALTER COLUMN protein_g TYPE DECIMAL(5,1) USING protein_g::DECIMAL(5,1);
  ALTER TABLE recipes ALTER COLUMN carbs_g TYPE DECIMAL(5,1) USING carbs_g::DECIMAL(5,1);
  ALTER TABLE recipes ALTER COLUMN fat_g TYPE DECIMAL(5,1) USING fat_g::DECIMAL(5,1);
EXCEPTION WHEN undefined_column THEN NULL;
END $$;
