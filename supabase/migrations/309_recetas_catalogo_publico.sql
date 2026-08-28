-- 309_recetas_catalogo_publico.sql
-- Catalogo publico de recetas. Generado el 28-ago-2026 DESDE
-- src/data/starter-recipes.ts, no transcrito a mano.
--
-- Por que existe: las 10 recetas vivian solo en el archivo TS y a seedRecipes()
-- no la llamaba nadie. La tabla recipes tenia 0 filas, y la pantalla leia de
-- user_recipes, que es otra tabla y no tiene columnas para los pasos.
-- Enrique decidio: catalogo para TODOS, con ingredientes y pasos, porque son
-- materia prima de nutricion y de la pantalla Super.
--
-- created_by = NULL a proposito: sin dueno, ninguna policy de cliente puede
-- editarlas ni borrarlas (la policy "Creator manages own" evalua
-- auth.uid() = NULL, que nunca es cierto). Catalogo de solo lectura.
--
-- Los ingredientes se guardan como {name, quantity} y NO como
-- {name, amount, unit}, que es la forma del archivo TS: shopping-list-core solo
-- lee o.quantity, asi que con la forma original la lista de super habria
-- perdido TODAS las cantidades en silencio. No truena: degrada callado, que es
-- peor de encontrar.
--
-- Idempotente: correr N veces deja exactamente 10 filas.

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public recipes visible to all" ON public.recipes;
CREATE POLICY "Public recipes visible to all"
  ON public.recipes FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Creator manages own recipes" ON public.recipes;
CREATE POLICY "Creator manages own recipes"
  ON public.recipes FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Sin esto no hay seed idempotente posible: la tabla solo tenia el pkey.
CREATE UNIQUE INDEX IF NOT EXISTS ux_recipes_catalogo_nombre
  ON public.recipes (lower(name)) WHERE created_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_recipes_publicas
  ON public.recipes (is_public, category) WHERE is_public = true;

-- Deuda de la 054: el indice declarado alli nunca se aplico a este proyecto.
CREATE INDEX IF NOT EXISTS idx_user_recipes_user
  ON public.user_recipes (user_id, created_at DESC);

INSERT INTO public.recipes
  (created_by, name, description, category, tags, prep_time_min, cook_time_min,
   servings, calories, protein_g, carbs_g, fat_g, fiber_g, diet_types,
   ingredients, instructions, is_public)
SELECT NULL, 'Huevos revueltos con aguacate y espinaca', 'Desayuno alto en proteína y grasas saludables. Perfecto para romper ayuno.', 'breakfast', '["high_protein","anti_inflammatory","keto_friendly"]'::jsonb,
       5, 8, 1,
       420, 28, 8, 32, 6,
       '["mediterranean","keto","low_carb","anti_inflammatory"]'::jsonb, '[{"name":"Huevos","quantity":"3 pzas"},{"name":"Aguacate","quantity":"0.5 pza"},{"name":"Espinaca baby","quantity":"1 taza"},{"name":"Aceite de oliva","quantity":"1 cdita"},{"name":"Sal y pimienta","quantity":"1 al gusto"}]'::jsonb, '[{"step":1,"text":"Calienta aceite de oliva en sartén a fuego medio."},{"step":2,"text":"Agrega la espinaca y saltea 1 minuto hasta que se marchite."},{"step":3,"text":"Bate los huevos y agrégalos al sartén. Revuelve suavemente."},{"step":4,"text":"Sirve con aguacate en rebanadas. Sazona al gusto."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Huevos revueltos con aguacate y espinaca')
);

INSERT INTO public.recipes
  (created_by, name, description, category, tags, prep_time_min, cook_time_min,
   servings, calories, protein_g, carbs_g, fat_g, fiber_g, diet_types,
   ingredients, instructions, is_public)
SELECT NULL, 'Bowl de quinoa con salmón y verduras', 'Comida completa con omega 3, proteína y fibra.', 'lunch', '["anti_inflammatory","omega3","high_fiber"]'::jsonb,
       10, 20, 1,
       550, 38, 42, 22, 8,
       '["mediterranean","balanced","anti_inflammatory"]'::jsonb, '[{"name":"Salmón fresco","quantity":"150 g"},{"name":"Quinoa cocida","quantity":"0.75 taza"},{"name":"Brócoli","quantity":"1 taza"},{"name":"Zanahoria rallada","quantity":"0.5 taza"},{"name":"Limón","quantity":"0.5 pza"},{"name":"Aceite de oliva","quantity":"1 cda"}]'::jsonb, '[{"step":1,"text":"Cocina el salmón a la plancha 4 min por lado."},{"step":2,"text":"Cuece el brócoli al vapor 3 minutos."},{"step":3,"text":"Arma el bowl: quinoa de base, salmón desmenuzado, brócoli, zanahoria."},{"step":4,"text":"Aliña con limón y aceite de oliva."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Bowl de quinoa con salmón y verduras')
);

INSERT INTO public.recipes
  (created_by, name, description, category, tags, prep_time_min, cook_time_min,
   servings, calories, protein_g, carbs_g, fat_g, fiber_g, diet_types,
   ingredients, instructions, is_public)
SELECT NULL, 'Smoothie verde con jengibre y cúrcuma', 'Bebida rica en antioxidantes y fibra. Ideal como snack o pre-entreno.', 'smoothie', '["anti_inflammatory","detox","plant_based"]'::jsonb,
       5, 0, 1,
       220, 8, 32, 8, 6,
       '["plant_based","anti_inflammatory","balanced"]'::jsonb, '[{"name":"Espinaca","quantity":"2 tazas"},{"name":"Plátano congelado","quantity":"0.5 pza"},{"name":"Jengibre fresco","quantity":"1 cm"},{"name":"Cúrcuma en polvo","quantity":"0.5 cdita"},{"name":"Leche de almendra","quantity":"1 taza"},{"name":"Semillas de chía","quantity":"1 cda"}]'::jsonb, '[{"step":1,"text":"Agrega todos los ingredientes a la licuadora."},{"step":2,"text":"Licúa a alta velocidad por 60 segundos."},{"step":3,"text":"Sirve inmediatamente."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Smoothie verde con jengibre y cúrcuma')
);

INSERT INTO public.recipes
  (created_by, name, description, category, tags, prep_time_min, cook_time_min,
   servings, calories, protein_g, carbs_g, fat_g, fiber_g, diet_types,
   ingredients, instructions, is_public)
SELECT NULL, 'Pechuga de pollo con camote y brócoli', 'Comida clásica de rendimiento. Alta en proteína, carbos complejos.', 'lunch', '["high_protein","balanced","meal_prep"]'::jsonb,
       10, 25, 1,
       480, 42, 45, 10, 7,
       '["balanced","mediterranean"]'::jsonb, '[{"name":"Pechuga de pollo","quantity":"180 g"},{"name":"Camote","quantity":"150 g"},{"name":"Brócoli","quantity":"1.5 tazas"},{"name":"Aceite de coco","quantity":"1 cdita"},{"name":"Paprika y ajo en polvo","quantity":"1 al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta horno a 200°C. Corta el camote en cubos."},{"step":2,"text":"Hornea camote 20 min. Agrega brócoli los últimos 8 min."},{"step":3,"text":"Cocina pollo a la plancha con especias, 5-6 min por lado."},{"step":4,"text":"Sirve todo junto."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pechuga de pollo con camote y brócoli')
);

INSERT INTO public.recipes
  (created_by, name, description, category, tags, prep_time_min, cook_time_min,
   servings, calories, protein_g, carbs_g, fat_g, fiber_g, diet_types,
   ingredients, instructions, is_public)
SELECT NULL, 'Ensalada mediterránea con garbanzos', 'Ensalada completa con proteína vegetal y grasas mono-insaturadas.', 'lunch', '["mediterranean","plant_based","high_fiber"]'::jsonb,
       10, 0, 1,
       380, 15, 35, 20, 10,
       '["mediterranean","plant_based","anti_inflammatory"]'::jsonb, '[{"name":"Garbanzos cocidos","quantity":"0.75 taza"},{"name":"Pepino","quantity":"0.5 pza"},{"name":"Tomate cherry","quantity":"8 pzas"},{"name":"Cebolla morada","quantity":"0.25 pza"},{"name":"Aceitunas","quantity":"6 pzas"},{"name":"Aceite de oliva extra virgen","quantity":"1 cda"},{"name":"Limón","quantity":"0.5 pza"}]'::jsonb, '[{"step":1,"text":"Pica pepino, tomate y cebolla en cubos."},{"step":2,"text":"Mezcla con garbanzos y aceitunas."},{"step":3,"text":"Aliña con aceite de oliva y limón. Sazona."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Ensalada mediterránea con garbanzos')
);

INSERT INTO public.recipes
  (created_by, name, description, category, tags, prep_time_min, cook_time_min,
   servings, calories, protein_g, carbs_g, fat_g, fiber_g, diet_types,
   ingredients, instructions, is_public)
SELECT NULL, 'Caldo de hueso con vegetales', 'Caldo de cocción lenta, rico en colágeno, glicina y minerales.', 'dinner', '["gut_healing","anti_inflammatory","collagen"]'::jsonb,
       10, 120, 4,
       120, 12, 8, 4, 2,
       '["anti_inflammatory","carnivore","balanced","keto"]'::jsonb, '[{"name":"Huesos de res o pollo","quantity":"500 g"},{"name":"Apio","quantity":"2 tallos"},{"name":"Zanahoria","quantity":"1 pza"},{"name":"Cebolla","quantity":"1 pza"},{"name":"Vinagre de manzana","quantity":"2 cdas"},{"name":"Agua","quantity":"2 litros"}]'::jsonb, '[{"step":1,"text":"Coloca huesos en olla con agua y vinagre."},{"step":2,"text":"Agrega vegetales picados."},{"step":3,"text":"Cocina a fuego bajo 2-4 horas (o 8h en slow cooker)."},{"step":4,"text":"Cuela y sirve caliente. Guarda el resto en porciones."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Caldo de hueso con vegetales')
);

INSERT INTO public.recipes
  (created_by, name, description, category, tags, prep_time_min, cook_time_min,
   servings, calories, protein_g, carbs_g, fat_g, fiber_g, diet_types,
   ingredients, instructions, is_public)
SELECT NULL, 'Avena overnight con frutos rojos', 'Desayuno preparado la noche anterior. Fibra y antioxidantes.', 'breakfast', '["high_fiber","antioxidant","meal_prep"]'::jsonb,
       5, 0, 1,
       350, 15, 48, 12, 8,
       '["balanced","plant_based"]'::jsonb, '[{"name":"Avena en hojuelas","quantity":"0.5 taza"},{"name":"Leche de almendra","quantity":"0.75 taza"},{"name":"Yogurt griego","quantity":"3 cdas"},{"name":"Moras/fresas","quantity":"0.5 taza"},{"name":"Nueces","quantity":"1 cda"},{"name":"Semillas de chía","quantity":"1 cdita"}]'::jsonb, '[{"step":1,"text":"Mezcla avena, leche, yogurt y chía en frasco."},{"step":2,"text":"Refrigera toda la noche (mínimo 4 horas)."},{"step":3,"text":"Al servir, agrega frutos rojos y nueces."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Avena overnight con frutos rojos')
);

INSERT INTO public.recipes
  (created_by, name, description, category, tags, prep_time_min, cook_time_min,
   servings, calories, protein_g, carbs_g, fat_g, fiber_g, diet_types,
   ingredients, instructions, is_public)
SELECT NULL, 'Tacos de lechuga con carne molida', 'Versión baja en carbos del clásico mexicano.', 'dinner', '["low_carb","high_protein","keto_friendly"]'::jsonb,
       10, 12, 2,
       380, 32, 8, 24, 3,
       '["keto","low_carb","balanced"]'::jsonb, '[{"name":"Carne molida de res (magra)","quantity":"200 g"},{"name":"Hojas de lechuga romana","quantity":"6 pzas"},{"name":"Aguacate","quantity":"0.5 pza"},{"name":"Tomate","quantity":"1 pza"},{"name":"Cebolla","quantity":"0.25 pza"},{"name":"Comino y chile en polvo","quantity":"1 al gusto"}]'::jsonb, '[{"step":1,"text":"Dora la carne con cebolla, comino y chile."},{"step":2,"text":"Prepara pico de gallo con tomate y cebolla."},{"step":3,"text":"Sirve carne en hojas de lechuga con aguacate y pico."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Tacos de lechuga con carne molida')
);

INSERT INTO public.recipes
  (created_by, name, description, category, tags, prep_time_min, cook_time_min,
   servings, calories, protein_g, carbs_g, fat_g, fiber_g, diet_types,
   ingredients, instructions, is_public)
SELECT NULL, 'Salmón al horno con espárragos', 'Cena ligera con omega 3, fibra y antioxidantes.', 'dinner', '["anti_inflammatory","omega3","high_protein"]'::jsonb,
       5, 18, 1,
       420, 36, 10, 26, 4,
       '["mediterranean","keto","anti_inflammatory"]'::jsonb, '[{"name":"Filete de salmón","quantity":"180 g"},{"name":"Espárragos","quantity":"8 pzas"},{"name":"Aceite de oliva","quantity":"1 cda"},{"name":"Limón","quantity":"0.5 pza"},{"name":"Eneldo o romero","quantity":"1 al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta horno a 200°C."},{"step":2,"text":"Coloca salmón y espárragos en bandeja. Baña con aceite y limón."},{"step":3,"text":"Hornea 15-18 minutos."},{"step":4,"text":"Sirve con hierbas frescas."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Salmón al horno con espárragos')
);

INSERT INTO public.recipes
  (created_by, name, description, category, tags, prep_time_min, cook_time_min,
   servings, calories, protein_g, carbs_g, fat_g, fiber_g, diet_types,
   ingredients, instructions, is_public)
SELECT NULL, 'Snack: almendras + manzana + crema de almendra', 'Snack balanceado con grasas, fibra y carbos naturales.', 'snack', '["balanced","quick","anti_inflammatory"]'::jsonb,
       2, 0, 1,
       280, 8, 25, 18, 5,
       '["balanced","mediterranean","plant_based"]'::jsonb, '[{"name":"Manzana","quantity":"1 pza"},{"name":"Crema de almendra","quantity":"2 cdas"},{"name":"Almendras","quantity":"10 pzas"}]'::jsonb, '[{"step":1,"text":"Corta la manzana en rebanadas."},{"step":2,"text":"Unta crema de almendra o úsala como dip."},{"step":3,"text":"Acompaña con almendras enteras."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Snack: almendras + manzana + crema de almendra')
);

