-- ============================================================================
-- 181 — COMMUNITY PRESENCE (social proof "personas activas hoy"). Rango 177+.
--
-- Tabla de conteos AGREGADOS por pilar (NO sensible: solo un entero por pilar,
-- ninguna identidad). Se recomputa por cron; el cliente solo LEE.
--
-- ⚠️ ANTI-FUGA: refresh_community_presence() cuenta usuarios DISTINTOS activos
-- HOY leyendo SOLO tablas de actividad NO-clínicas, todas verificadas contra su
-- CREATE TABLE (columna de fecha `date DATE`):
--   · hoy       → daily_electrons  (mig 039)  — toggles del tablero HOY
--   · nutrition → food_logs        (mig 027)  — registros de comida
--   · mente     → mind_sessions    (mig 049)  — respiración/meditación/checkin
--   · fitness   → cardio_sessions  (mig 036)  — sesiones de cardio
-- NO lee journal, mood, síntomas, DX, labs, suplementos, ciclo ni Braverman.
-- El resultado es un COUNT agregado (no expone quién). No hay backfill: es un
-- valor computado que el cron refresca; arranca en 0.
--
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_presence (
  pillar TEXT PRIMARY KEY CHECK (pillar IN ('hoy', 'nutrition', 'mente', 'fitness')),
  active_count INT NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ
);

ALTER TABLE community_presence ENABLE ROW LEVEL SECURITY;

-- Lectura para cualquier autenticado (dato agregado no sensible). Sin política de
-- escritura → INSERT/UPDATE de usuario denegados por RLS; solo el refresh
-- SECURITY DEFINER (owner) escribe.
DO $$ BEGIN
  CREATE POLICY "Authenticated read community presence" ON community_presence
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Semilla de las 4 filas (active_count 0). El cron las actualiza.
INSERT INTO community_presence (pillar, active_count, computed_at) VALUES
  ('hoy', 0, NULL), ('nutrition', 0, NULL), ('mente', 0, NULL), ('fitness', 0, NULL)
ON CONFLICT (pillar) DO NOTHING;

-- ── refresh_community_presence: recomputa los 4 conteos de HOY ───────────────

CREATE OR REPLACE FUNCTION refresh_community_presence()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO community_presence (pillar, active_count, computed_at)
  VALUES (
    'hoy',
    (SELECT COUNT(DISTINCT user_id)::INT FROM daily_electrons WHERE date = CURRENT_DATE),
    NOW()
  )
  ON CONFLICT (pillar) DO UPDATE
    SET active_count = EXCLUDED.active_count, computed_at = EXCLUDED.computed_at;

  INSERT INTO community_presence (pillar, active_count, computed_at)
  VALUES (
    'nutrition',
    (SELECT COUNT(DISTINCT user_id)::INT FROM food_logs WHERE date = CURRENT_DATE),
    NOW()
  )
  ON CONFLICT (pillar) DO UPDATE
    SET active_count = EXCLUDED.active_count, computed_at = EXCLUDED.computed_at;

  INSERT INTO community_presence (pillar, active_count, computed_at)
  VALUES (
    'mente',
    (SELECT COUNT(DISTINCT user_id)::INT FROM mind_sessions WHERE date = CURRENT_DATE),
    NOW()
  )
  ON CONFLICT (pillar) DO UPDATE
    SET active_count = EXCLUDED.active_count, computed_at = EXCLUDED.computed_at;

  INSERT INTO community_presence (pillar, active_count, computed_at)
  VALUES (
    'fitness',
    (SELECT COUNT(DISTINCT user_id)::INT FROM cardio_sessions WHERE date = CURRENT_DATE),
    NOW()
  )
  ON CONFLICT (pillar) DO UPDATE
    SET active_count = EXCLUDED.active_count, computed_at = EXCLUDED.computed_at;
END; $$;

REVOKE ALL ON FUNCTION refresh_community_presence() FROM PUBLIC;

-- ── Cron: recomputar cada hora (patrón mig 099/169) ──────────────────────────
-- Idempotente: solo agenda si el job no existe ya.

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'refresh_community_presence_hourly'
  ) THEN
    PERFORM cron.schedule(
      'refresh_community_presence_hourly',
      '0 * * * *',  -- cada hora en punto
      $job$ SELECT refresh_community_presence(); $job$
    );
  END IF;
END $$;
