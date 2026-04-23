-- 056 — Agregar columna goals JSONB a user_day_preferences
-- Almacena metas personalizadas: protein_goal_g, water_goal_ml, fasting_hours, etc.

ALTER TABLE user_day_preferences ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '{}';
