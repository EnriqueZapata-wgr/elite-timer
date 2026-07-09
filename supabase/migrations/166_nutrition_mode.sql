-- 166_nutrition_mode.sql — Modo SIMPLE vs COMPLETO de nutrición (#52, Sprint NUTRICIÓN T2)
-- Rango Fable: 158-199.
--
-- 'simple' (default): score + proteína, sin ruido. 'complete' (opt-in):
-- macros/micros/timing/calidad. Filosofía "guiado no prisionero".
-- Unifica el precursor client_profiles.macro_mode (booleano de PRD §6.6):
-- el service sincroniza ambos campos en cada escritura (transicional).

ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS nutrition_mode TEXT
  DEFAULT 'simple' CHECK (nutrition_mode IN ('simple', 'complete'));

-- Backfill de coherencia: usuarios que ya activaron macro_mode esperan ver
-- el detalle → arrancan en 'complete'. Idempotente (solo toca NULL/default
-- donde macro_mode dice otra cosa).
UPDATE client_profiles SET nutrition_mode = 'complete'
WHERE macro_mode = true AND (nutrition_mode IS NULL OR nutrition_mode = 'simple');
