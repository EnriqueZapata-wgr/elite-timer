-- ============================================================================
-- 197 — N-BACK CHALLENGE (Mente V1.5 · C.1). Spec Cowork
-- NBACK_CHALLENGE_SPEC_v1_2026-07-11 + defaults sancionados del megabuzón
-- 2da pasada (N mín 2 · timeout 3s · auriculares sí · daltónico sí · free
-- ilimitado — Enrique/Cowork validan; viven en NBACK_CONFIG de nback-core.ts).
--
-- nback_sessions: append-only, UNA fila por BLOQUE completado (20+N estímulos,
-- ~2 min). La sesión de ~20 min son N bloques — se agrupan por rango temporal
-- en la UI, sin tabla extra.
-- nback_user_state: una fila por user (N actual, best N, racha, totales).
--
-- RLS dueño-only en ambas — SIN lectura coach ni cross-user (privacidad
-- cognitiva, explícito en el spec). Si Comunidad V1.5 quiere leaderboard de
-- best_n, será por columna pública opt-in aparte, nunca leyendo estas tablas.
--
-- Idempotente. ⚠️ NO aplicar al remoto desde la rama — Enrique corre
-- `npx supabase db push` tras merge + audit Cowork (regla #12).
-- ============================================================================

CREATE TABLE IF NOT EXISTS nback_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  n_level SMALLINT NOT NULL CHECK (n_level >= 1),
  stimuli_count SMALLINT NOT NULL CHECK (stimuli_count > 0),
  matches_visual_total SMALLINT NOT NULL DEFAULT 0 CHECK (matches_visual_total >= 0),
  matches_visual_hit SMALLINT NOT NULL DEFAULT 0 CHECK (matches_visual_hit >= 0),
  matches_visual_miss SMALLINT NOT NULL DEFAULT 0 CHECK (matches_visual_miss >= 0),
  matches_visual_false SMALLINT NOT NULL DEFAULT 0 CHECK (matches_visual_false >= 0),
  matches_audio_total SMALLINT NOT NULL DEFAULT 0 CHECK (matches_audio_total >= 0),
  matches_audio_hit SMALLINT NOT NULL DEFAULT 0 CHECK (matches_audio_hit >= 0),
  matches_audio_miss SMALLINT NOT NULL DEFAULT 0 CHECK (matches_audio_miss >= 0),
  matches_audio_false SMALLINT NOT NULL DEFAULT 0 CHECK (matches_audio_false >= 0),
  accuracy_visual NUMERIC(4,3) CHECK (accuracy_visual BETWEEN 0 AND 1),
  accuracy_audio NUMERIC(4,3) CHECK (accuracy_audio BETWEEN 0 AND 1),
  promoted BOOLEAN NOT NULL DEFAULT false,
  demoted BOOLEAN NOT NULL DEFAULT false,
  next_n SMALLINT CHECK (next_n >= 1),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_nback_sessions_user_completed
  ON nback_sessions (user_id, completed_at DESC);

ALTER TABLE nback_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own_nback_sessions" ON nback_sessions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS nback_user_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Default 2 = NBACK_CONFIG.N_START (decisión 1 del buzón).
  current_n SMALLINT NOT NULL DEFAULT 2 CHECK (current_n >= 1),
  best_n SMALLINT NOT NULL DEFAULT 2 CHECK (best_n >= 1),
  best_n_achieved_at TIMESTAMPTZ,
  sessions_total INT NOT NULL DEFAULT 0 CHECK (sessions_total >= 0),
  streak_days SMALLINT NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
  last_session_date DATE,
  time_practiced_total_min INT NOT NULL DEFAULT 0 CHECK (time_practiced_total_min >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE nback_user_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own_nback_state" ON nback_user_state
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE nback_sessions IS
  'C.1 — Dual N-Back: una fila por bloque completado (regla Brain Workshop en nback-core.ts).';
COMMENT ON TABLE nback_user_state IS
  'C.1 — Estado N-Back por user (N actual/best, racha, totales). Dueño-only.';
