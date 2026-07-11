-- ============================================================================
-- 192 — RANKING SCOPE WEEK/MONTH (Comunidad V1.1 §2.3).
-- Depende de 039 (electron_logs), 177 (user_profile_public), 180 (get_leaderboard).
--
-- La 180 dejó week/month como follow-up porque electron_logs es RLS own-only y
-- NO estaba en el whitelist de superficies del leaderboard. Este es el diseño
-- prometido allí: una TABLA AGREGADA NO-CLÍNICA dedicada
-- (electron_window_totals) que solo contiene totales/rank de users
-- DISCOVERABLE — mismo contrato de exposición que el leaderboard actual.
--
-- ⚠️ PALABRA RESERVADA: 'window' ES reservada en Postgres (cláusula WINDOW).
--   La columna se llama `window_key` (verificado — nunca 'window' a secas).
--   Tampoco se usa 'position' (aprendizaje mig 180): la columna es rank_position.
--
-- ⚠️ ANTI-FUGA: electron_logs es sensible-no-clínico (fuente = actividad). La
--   agregación SOLO expone SUM(electrons)/rank de users con
--   user_profile_public.discoverable = true. Ningún join clínico. La lectura
--   cross-user va SOLO vía get_leaderboard (RPC DEFINER, flags server-side).
--
-- REFRESH — 2 opciones documentadas:
--   A) pg_cron (habilitado en el proyecto: 099/156/169/181 ya lo usan):
--        SELECT cron.schedule('refresh-electron-window-totals-hourly',
--          '5 * * * *', $$ SELECT refresh_electron_window_totals(); $$);
--      (Opcional post-beta; ejecutar vía MCP execute_sql.)
--   B) LAZY desde el RPC (IMPLEMENTADA — cero dependencia de infra):
--      get_leaderboard('week'|'month') refresca si computed_at > 1h o vacío.
--      Serializado con advisory lock para evitar estampida.
--
-- Idempotente. NO aplicar al remoto desde este branch.
-- ============================================================================

CREATE TABLE IF NOT EXISTS electron_window_totals (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_key TEXT NOT NULL CHECK (window_key IN ('week', 'month')),
  electrons NUMERIC NOT NULL DEFAULT 0,
  rank_position INT NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, window_key)
);

CREATE INDEX IF NOT EXISTS idx_electron_window_totals_board
  ON electron_window_totals (window_key, rank_position);

ALTER TABLE electron_window_totals ENABLE ROW LEVEL SECURITY;

-- Dueño-only lectura directa. La lectura cross-user pasa SOLO por el RPC.
-- Escrituras solo vía refresh_electron_window_totals (DEFINER).
DO $$ BEGIN
  CREATE POLICY "Owner reads own windowed totals" ON electron_window_totals
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── refresh_electron_window_totals: agrega 7/30 días desde electron_logs ─────
-- SOLO users discoverable entran a la tabla (nadie oculto queda materializado).

CREATE OR REPLACE FUNCTION refresh_electron_window_totals()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Serializa refreshes concurrentes (lazy desde el RPC puede coincidir).
  PERFORM pg_advisory_xact_lock(hashtext('refresh_electron_window_totals'));

  DELETE FROM electron_window_totals;

  INSERT INTO electron_window_totals (user_id, window_key, electrons, rank_position, computed_at)
  SELECT
    el.user_id,
    w.window_key,
    SUM(el.electrons),
    (RANK() OVER (PARTITION BY w.window_key ORDER BY SUM(el.electrons) DESC))::INT,
    NOW()
  FROM electron_logs el
  JOIN user_profile_public pp
    ON pp.user_id = el.user_id AND pp.discoverable
  CROSS JOIN (VALUES ('week', 7), ('month', 30)) AS w(window_key, days)
  WHERE el.date >= CURRENT_DATE - (w.days - 1)
  GROUP BY el.user_id, w.window_key
  ON CONFLICT (user_id, window_key) DO UPDATE SET
    electrons = EXCLUDED.electrons,
    rank_position = EXCLUDED.rank_position,
    computed_at = EXCLUDED.computed_at;
END; $$;

-- ── get_leaderboard v2 (REPLACE de 180, MISMA firma y shape) ──────────────────
-- p_scope 'week'|'month' → tabla agregada (refresh lazy >1h). Cualquier otro
-- valor → all_time (comportamiento idéntico a 180, caller actual no se rompe).
-- La columna de salida sigue llamándose lifetime_electrons por contrato de
-- shape con el cliente; en scope week/month transporta el TOTAL DE LA VENTANA.

CREATE OR REPLACE FUNCTION get_leaderboard(p_scope TEXT DEFAULT 'all_time')
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  current_rank INT,
  lifetime_electrons INT,
  streak_days INT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_last TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  IF p_scope IN ('week', 'month') THEN
    -- Refresh LAZY: si nunca se computó o tiene >1h, recalcular.
    SELECT MAX(ewt.computed_at) INTO v_last
    FROM electron_window_totals ewt WHERE ewt.window_key = p_scope;
    IF v_last IS NULL OR v_last < NOW() - INTERVAL '1 hour' THEN
      PERFORM refresh_electron_window_totals();
    END IF;

    RETURN QUERY
      SELECT
        ewt.user_id,
        pp.username,
        COALESCE(pp.display_name, pp.username),
        CASE WHEN pp.show_photo     THEN pp.avatar_url            ELSE NULL END,
        CASE WHEN pp.show_badges    THEN pp.current_rank          ELSE NULL END,
        CASE WHEN pp.show_electrons THEN ROUND(ewt.electrons)::INT ELSE NULL END,
        CASE WHEN pp.show_streak    THEN pp.streak_days           ELSE NULL END
      FROM electron_window_totals ewt
      JOIN user_profile_public pp ON pp.user_id = ewt.user_id
      WHERE ewt.window_key = p_scope
        AND pp.discoverable
      ORDER BY ewt.electrons DESC
      LIMIT 20;
    RETURN;
  END IF;

  -- all_time — idéntico a la 180.
  RETURN QUERY
    SELECT
      eb.user_id,
      pp.username,
      COALESCE(pp.display_name, pp.username),
      CASE WHEN pp.show_photo     THEN pp.avatar_url        ELSE NULL END,
      CASE WHEN pp.show_badges    THEN eb.current_rank       ELSE NULL END,
      CASE WHEN pp.show_electrons THEN eb.lifetime_electrons ELSE NULL END,
      CASE WHEN pp.show_streak    THEN pp.streak_days         ELSE NULL END
    FROM electron_balance eb
    JOIN user_profile_public pp ON pp.user_id = eb.user_id
    WHERE pp.discoverable
    ORDER BY eb.lifetime_electrons DESC
    LIMIT 20;
END; $$;

-- ── Permisos ─────────────────────────────────────────────────────────────────
-- refresh: NO se expone al cliente (solo se invoca dentro de get_leaderboard o
-- desde pg_cron con rol de servicio).

REVOKE ALL ON FUNCTION refresh_electron_window_totals() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_leaderboard(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_leaderboard(TEXT) TO authenticated;
