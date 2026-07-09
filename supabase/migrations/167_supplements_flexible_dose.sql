-- 167_supplements_flexible_dose.sql — Dosis flexibles en suplementos (#54, Sprint NUTRICIÓN T4)
-- Rango Fable: 158-199.
--
-- dose_pattern: patrón de toma ('1× diario', '2× diario', 'lun/mié/vie',
-- 'semanal') — la adherencia semanal se calcula contra este patrón.
-- notes: notas libres del usuario (marca, con comida, etc.).

ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS dose_pattern TEXT;
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS notes TEXT;
