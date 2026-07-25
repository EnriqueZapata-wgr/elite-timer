-- ============================================================================
-- 220 — EXERCISE MATRIX (MB-3 Track A): catálogo matriceado de ejercicios.
--
-- 212 filas (206 MoveKit + 6 variantes lastre ATP) taggeadas en los 11 ejes de
-- R and D/MATRIZ_FITNESS_DIMENSIONES.md. Es CATÁLOGO (no dato de usuario):
-- RLS habilitado con policy de SOLO LECTURA para authenticated; escrituras
-- únicamente vía service_role (seed en migración 221, generada por
-- scripts/generate-exercise-matrix-seed.py desde el xlsx fuente).
--
-- media_url guarda hoy el Poster URL (imagen pública); el swap poster→clip
-- MoveKit es un follow-up de datos, no de esquema (columna genérica a propósito).
--
-- Idempotente. ⚠️ NO aplicar al remoto desde la rama — db push tras merge.
-- ============================================================================

CREATE TABLE IF NOT EXISTS exercise_matrix (
  slug                text PRIMARY KEY,
  nombre              text NOT NULL,
  equipo              text NOT NULL,             -- crudo del eje 5: "Barra fija + Cinturón de lastre", "Banca / Cajón"
  cargable            boolean NOT NULL DEFAULT false,
  tipo                text NOT NULL,             -- 'Multiarticular' | 'Aislado'
  patron              text NOT NULL,             -- eje 1 (+ Estiramiento / Anti-extensión (core) / Anti-rotación/Rotación / Locomoción)
  dinamica            text NOT NULL,             -- eje 2: Explosivo | Normal | Súper-lento | Isométrico
  lateralidad         text NOT NULL,             -- eje 3: Bilateral | Unilateral
  musculo_principal   text NOT NULL,             -- eje 4
  secundarios         text,                      -- eje 4, lista separada por comas (crudo del xlsx)
  cualidades          text[] NOT NULL DEFAULT '{}',  -- eje 6: pills que SÍ aplica (manejan el slotting)
  nivel               text NOT NULL,             -- eje 7 (del ejercicio): Principiante | Intermedio | Avanzado
  senior_apto         boolean NOT NULL DEFAULT false, -- eje 7b (meta-tag)
  metodos             text[] NOT NULL DEFAULT '{}',   -- eje 8: métodos ATP aplicables
  emom_apto           text NOT NULL DEFAULT 'No',     -- eje 8: Todos | Intermedio+ | Avanzado | No
  benchmark_edad      text NOT NULL DEFAULT 'No',     -- eje 11: No | Tier A (…) | Tier B (…)
  contraindicaciones  text[] NOT NULL DEFAULT '{}',   -- eje 9 (capa Mariana)
  familia             text NOT NULL,             -- eje 7: familia de progresión/regresión
  media_url           text,                      -- poster hoy; clip MoveKit después (mismo campo)
  origen              text NOT NULL DEFAULT 'movekit' CHECK (origen IN ('movekit', 'atp')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Índices para los filtros de la biblioteca/generador (catálogo chico, pero
-- los filtros por músculo/patrón/familia son las queries calientes).
CREATE INDEX IF NOT EXISTS idx_exercise_matrix_musculo ON exercise_matrix (musculo_principal);
CREATE INDEX IF NOT EXISTS idx_exercise_matrix_patron ON exercise_matrix (patron);
CREATE INDEX IF NOT EXISTS idx_exercise_matrix_familia ON exercise_matrix (familia);

ALTER TABLE exercise_matrix ENABLE ROW LEVEL SECURITY;

-- Catálogo: lectura para cualquier usuario autenticado; sin policies de
-- escritura (INSERT/UPDATE/DELETE solo service_role — el seed y su curaduría).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'exercise_matrix' AND policyname = 'exercise_matrix_read_authenticated'
  ) THEN
    CREATE POLICY exercise_matrix_read_authenticated
      ON exercise_matrix FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
