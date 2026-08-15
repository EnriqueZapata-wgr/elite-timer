-- ═══════════════════════════════════════════════════════════════════════════
-- 265 · BIBLIOTECA DE ALIMENTOS ATP
--
-- Reemplaza src/data/food-database.ts (147 alimentos hardcodeados, 5 macros,
-- una sola porción fija) por una biblioteca real en la base.
--
-- DOCTRINA DE ESTA TABLA
--   1. TODO se guarda por 100 g de porción comestible. Siempre. Sin excepción.
--      La unidad mínima es el gramo; cualquier otra unidad (taza, pieza, onza,
--      libra, ml) se deriva. Nunca se guarda "por porción".
--   2. NULL significa SIN DATO. Cero significa CERO MEDIDO. No son lo mismo y
--      el motor de nutrición NO debe tratarlos igual: sumar NULL como 0 le
--      inventa al usuario un déficit que no existe.
--   3. Los líquidos traen density_g_per_ml para convertir ml a gramos. Sin
--      densidad, un vaso de aceite y uno de agua pesarían lo mismo.
--   4. Las porciones caseras viven en food_portions, no aquí. Un alimento
--      puede tener muchas y el usuario elige.
--
-- ⚠️ COMPLIANCE: los valores son de REFERENCIA, no análisis bromatológico de
--    lote. Sirven para orientar, no para prescribir. El copy de usuario nunca
--    debe presentarlos como exactos ni como diagnóstico.
--
-- Idempotente. RLS + policy. db push ANTES del OTA.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS food_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,

  -- ── Identidad ───────────────────────────────────────────────────────────
  name_es      TEXT NOT NULL,
  name_en      TEXT,
  brand        TEXT,
  category     TEXT NOT NULL,
  subcategory  TEXT,
  region       TEXT NOT NULL DEFAULT 'universal',
  state        TEXT,

  -- ── Base de medida ──────────────────────────────────────────────────────
  base_unit         TEXT NOT NULL DEFAULT 'g',
  density_g_per_ml  NUMERIC(5,3),
  edible_factor     NUMERIC(4,3) DEFAULT 1.000,

  -- ── Energía y macros · por 100 g ────────────────────────────────────────
  kcal          NUMERIC(7,2) NOT NULL,
  protein_g     NUMERIC(6,2) NOT NULL,
  carbs_g       NUMERIC(6,2) NOT NULL,
  fat_g         NUMERIC(6,2) NOT NULL,
  fiber_g       NUMERIC(6,2),
  sugars_g      NUMERIC(6,2),
  added_sugars_g NUMERIC(6,2),
  starch_g      NUMERIC(6,2),
  sugar_alcohol_g NUMERIC(6,2),

  -- ── Perfil de grasa · por 100 g ─────────────────────────────────────────
  sat_fat_g     NUMERIC(6,2),
  mono_fat_g    NUMERIC(6,2),
  poly_fat_g    NUMERIC(6,2),
  trans_fat_g   NUMERIC(6,3),
  omega3_g      NUMERIC(6,3),
  omega6_g      NUMERIC(6,3),
  cholesterol_mg NUMERIC(7,2),

  -- ── Vitaminas · por 100 g ───────────────────────────────────────────────
  vit_a_mcg     NUMERIC(9,2),   -- RAE
  vit_c_mg      NUMERIC(8,2),
  vit_d_mcg     NUMERIC(7,2),
  vit_e_mg      NUMERIC(7,2),   -- alfa-tocoferol
  vit_k_mcg     NUMERIC(8,2),
  vit_b1_mg     NUMERIC(7,3),   -- tiamina
  vit_b2_mg     NUMERIC(7,3),   -- riboflavina
  vit_b3_mg     NUMERIC(7,2),   -- niacina
  vit_b5_mg     NUMERIC(7,3),   -- ácido pantoténico
  vit_b6_mg     NUMERIC(7,3),
  vit_b7_mcg    NUMERIC(8,2),   -- biotina
  vit_b9_mcg    NUMERIC(8,2),   -- folato DFE
  vit_b12_mcg   NUMERIC(8,3),
  choline_mg    NUMERIC(7,2),

  -- ── Minerales · por 100 g ───────────────────────────────────────────────
  calcium_mg    NUMERIC(8,2),
  iron_mg       NUMERIC(7,3),
  magnesium_mg  NUMERIC(8,2),
  phosphorus_mg NUMERIC(8,2),
  potassium_mg  NUMERIC(8,2),
  sodium_mg     NUMERIC(8,2),
  zinc_mg       NUMERIC(7,3),
  copper_mg     NUMERIC(7,3),
  manganese_mg  NUMERIC(7,3),
  selenium_mcg  NUMERIC(8,2),
  iodine_mcg    NUMERIC(8,2),

  -- ── Otros ───────────────────────────────────────────────────────────────
  water_g       NUMERIC(6,2),
  caffeine_mg   NUMERIC(7,2),
  alcohol_g     NUMERIC(6,2),

  -- ── Clasificación ATP ───────────────────────────────────────────────────
  is_processed   BOOLEAN NOT NULL DEFAULT false,
  is_prepared    BOOLEAN NOT NULL DEFAULT false,
  is_supplement  BOOLEAN NOT NULL DEFAULT false,
  nova_group     SMALLINT,

  -- ── Búsqueda y trazabilidad ─────────────────────────────────────────────
  tags          TEXT[] NOT NULL DEFAULT '{}',
  source        TEXT NOT NULL DEFAULT 'referencia',
  source_ref    TEXT,
  verified_by   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT food_items_category_check CHECK (category IN (
    'proteina','lacteo','grano','leguminosa','verdura','fruta','grasa',
    'bebida','platillo','snack','suplemento','condimento','endulzante','otro'
  )),
  CONSTRAINT food_items_region_check CHECK (region IN ('mx','latam','universal')),
  CONSTRAINT food_items_base_unit_check CHECK (base_unit IN ('g','ml')),
  CONSTRAINT food_items_state_check CHECK (state IS NULL OR state IN ('crudo','cocido','seco','preparado')),
  CONSTRAINT food_items_source_check CHECK (source IN ('referencia','usda','etiqueta','receta','openfoodfacts')),
  CONSTRAINT food_items_nova_check CHECK (nova_group IS NULL OR nova_group BETWEEN 1 AND 4),
  CONSTRAINT food_items_no_negativos CHECK (
    kcal >= 0 AND protein_g >= 0 AND carbs_g >= 0 AND fat_g >= 0
  ),
  -- Nada comestible pasa de 100 g de un macro por cada 100 g de alimento.
  CONSTRAINT food_items_macros_posibles CHECK (
    protein_g <= 100 AND carbs_g <= 100 AND fat_g <= 100
  ),
  -- Un líquido sin densidad no se puede convertir de ml a gramos.
  CONSTRAINT food_items_liquido_con_densidad CHECK (
    base_unit <> 'ml' OR density_g_per_ml IS NOT NULL
  )
);

-- ── Porciones caseras ──────────────────────────────────────────────────────
-- "1 taza", "1 pieza mediana", "1 tortilla", "1 cucharada".
-- Todo se resuelve a GRAMOS. Onzas, libras y kilos NO viven aquí: son
-- conversión aritmética pura y se calculan en el cliente.
CREATE TABLE IF NOT EXISTS food_portions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id     UUID NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  grams       NUMERIC(8,2) NOT NULL CHECK (grams > 0),
  is_default  BOOLEAN NOT NULL DEFAULT false,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (food_id, label)
);

-- Exactamente una porción default por alimento.
CREATE UNIQUE INDEX IF NOT EXISTS food_portions_una_default
  ON food_portions (food_id) WHERE is_default;

-- ── Búsqueda ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Columna de búsqueda: nombre + marca + tags, en minúsculas y sin acentos,
-- para que "platano" encuentre "plátano" y "pollo" encuentre sus 9 cortes.
--
-- ⚠️ Va por TRIGGER y no por GENERATED ALWAYS: Postgres rechaza la columna
-- generada porque array_to_string y unaccent no son IMMUTABLE. Probado.
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS search_text TEXT;

CREATE OR REPLACE FUNCTION food_items_set_search_text()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  NEW.search_text := lower(unaccent(
    coalesce(NEW.name_es,'') || ' ' ||
    coalesce(NEW.name_en,'') || ' ' ||
    coalesce(NEW.brand,'')   || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '')
  ));
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_food_items_search ON food_items;
CREATE TRIGGER trg_food_items_search
  BEFORE INSERT OR UPDATE ON food_items
  FOR EACH ROW EXECUTE FUNCTION food_items_set_search_text();

CREATE INDEX IF NOT EXISTS food_items_search_trgm
  ON food_items USING gin (search_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS food_items_categoria_idx ON food_items (category);
CREATE INDEX IF NOT EXISTS food_items_region_idx    ON food_items (region);
CREATE INDEX IF NOT EXISTS food_items_slug_idx      ON food_items (slug);

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Catálogo público de solo lectura: lo lee cualquier usuario autenticado,
-- lo escribe únicamente el service_role (seeds y migraciones).
ALTER TABLE food_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_portions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'food_items' AND policyname = 'Catalogo de alimentos legible'
  ) THEN
    CREATE POLICY "Catalogo de alimentos legible" ON food_items
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'food_portions' AND policyname = 'Porciones legibles'
  ) THEN
    CREATE POLICY "Porciones legibles" ON food_portions
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- ── Búsqueda con ranking ───────────────────────────────────────────────────
-- Prioriza: empieza con el término > contiene el término > parecido difuso.
-- Sin esto, buscar "pollo" devuelve "caldo de pollo" antes que "pollo".
-- Búsqueda en dos tiempos:
--   1. Coincidencia literal de subcadena. Es lo que el usuario espera.
--   2. Solo si eso no devuelve NADA, cae a parecido difuso para rescatar
--      los errores de dedo ("platanp").
-- Mezclar los dos desde el principio es lo que hacía que buscar "choclo"
-- devolviera "Queso Cotija" antes que el elote. Probado.
CREATE OR REPLACE FUNCTION buscar_alimentos(q TEXT, lim INT DEFAULT 30)
RETURNS SETOF food_items
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  n TEXT := lower(unaccent(coalesce(q,'')));
  hay BOOLEAN;
BEGIN
  IF length(n) < 2 THEN RETURN; END IF;

  SELECT EXISTS(SELECT 1 FROM food_items WHERE search_text LIKE '%' || n || '%') INTO hay;

  IF hay THEN
    RETURN QUERY
      SELECT f.* FROM food_items f
      WHERE f.search_text LIKE '%' || n || '%'
      ORDER BY
        (lower(unaccent(f.name_es)) LIKE n || '%') DESC,
        (lower(unaccent(f.name_es)) LIKE '%' || n || '%') DESC,
        f.is_prepared ASC,
        length(f.name_es) ASC
      LIMIT LEAST(lim, 100);
  ELSE
    RETURN QUERY
      SELECT f.* FROM food_items f
      WHERE word_similarity(n, f.search_text) > 0.6
      ORDER BY word_similarity(n, f.search_text) DESC, length(f.name_es) ASC
      LIMIT LEAST(lim, 100);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION buscar_alimentos(TEXT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION buscar_alimentos(TEXT, INT) TO authenticated;

-- ── El puente con el registro de comida ────────────────────────────────────
-- food_logs guarda lo que el usuario comió. Ahora puede apuntar al alimento
-- de la biblioteca y a la cantidad exacta que eligió.
--
-- ⚠️ Los tres campos son OPCIONALES a propósito: el registro por texto libre
-- y el análisis por foto siguen funcionando igual, sin alimento asociado.
-- La biblioteca suma caminos, no cierra ninguno.
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS food_slug TEXT;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS quantity_grams NUMERIC(8,2);
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS portion_label TEXT;

CREATE INDEX IF NOT EXISTS food_logs_food_slug_idx ON food_logs (food_slug)
  WHERE food_slug IS NOT NULL;

-- Sin FK dura a food_items: si un alimento se retira de la biblioteca, el
-- registro histórico del usuario NO se borra ni se rompe. Regla 6: el dato
-- del usuario es sagrado.

NOTIFY pgrst, 'reload schema';
