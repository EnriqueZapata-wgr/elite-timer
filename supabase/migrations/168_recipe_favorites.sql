-- 168_recipe_favorites.sql — Favoritos en recetas (#56 parcial, Sprint NUTRICIÓN T5)
-- Rango Fable: 158-199.

ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
