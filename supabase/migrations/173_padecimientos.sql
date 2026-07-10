-- ============================================================================
-- 173 — PADECIMIENTOS + PADECIMIENTO_EPISODIOS (historial médico verificado).
-- Rango Fable 150-199. Alimenta el DX con peso ALTO.
--
-- Decisión aprobada 2026-07-11 (Enrique): 2 tablas normalizadas para modelar
-- RECURRENCIA. Un padecimiento = definición de la condición; cada ocurrencia =
-- un episodio. Así "gripes en el último año" = COUNT(*) sobre episodios, y la
-- frecuencia + duración alimentan el DX con mucha señal.
--   is_chronic=true  (diabetes, hipertensión) → 1 episodio en curso
--   is_chronic=false (gripe, infección)       → N episodios finalizados
--
-- duration_days se genera automáticamente (null mientras el episodio esté en
-- curso, i.e. resolved_on NULL). Resta de fechas en Postgres = INT (días).
--
-- Idempotente. RLS: dueño full + coach lectura (episodios vía padre).
-- ============================================================================

CREATE TABLE IF NOT EXISTS padecimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'otro' CHECK (category IN (
    'infeccioso', 'autoinmune', 'metabolico', 'cardiovascular', 'respiratorio',
    'digestivo', 'hormonal', 'oncologico', 'neurologico', 'musculoesqueletico',
    'dermatologico', 'mental', 'otro'
  )),
  is_chronic BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE padecimientos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own padecimientos" ON padecimientos
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Coach reads client padecimientos" ON padecimientos
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM coach_clients
        WHERE coach_id = auth.uid() AND client_id = padecimientos.user_id AND status = 'active'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Episodios (ocurrencias) ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS padecimiento_episodios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  padecimiento_id UUID NOT NULL REFERENCES padecimientos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_on DATE NOT NULL,
  resolved_on DATE,   -- NULL = en curso
  duration_days INT GENERATED ALWAYS AS (resolved_on - started_on) STORED,
  severity SMALLINT CHECK (severity BETWEEN 1 AND 5),
  treatment TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT episodio_dates_ordered CHECK (resolved_on IS NULL OR resolved_on >= started_on)
);

CREATE INDEX IF NOT EXISTS idx_padecimiento_episodios_ped
  ON padecimiento_episodios (padecimiento_id, started_on DESC);

ALTER TABLE padecimiento_episodios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own padecimiento episodios" ON padecimiento_episodios
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Coach reads client padecimiento episodios" ON padecimiento_episodios
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM coach_clients
        WHERE coach_id = auth.uid() AND client_id = padecimiento_episodios.user_id AND status = 'active'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
