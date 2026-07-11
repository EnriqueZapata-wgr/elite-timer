-- ============================================================================
-- 180 — LEADERBOARD RPCs de Comunidad C4 (ranking + social proof). Rango 177+.
-- Depende de 177 (user_profile_public) y de la economía de rank (electron_balance).
--
-- ⚠️ ANTI-FUGA CLÍNICA (regla NO-NEGOCIABLE del mapa Comunidad):
--   Estas funciones son una vía de lectura cross-user. Por diseño seleccionan
--   ÚNICAMENTE de dos superficies NO-clínicas:
--     · electron_balance     (economía: lifetime_electrons / current_rank)
--     · user_profile_public  (perfil público whitelisteado — frontera anti-leak)
--   JAMÁS hacen join a DX, intervenciones, síntomas, padecimientos, labs,
--   suplementos, ciclo, journal, mood, Braverman ni quizzes. El test estático
--   community-leaderboard-antileak.test.ts verifica este invariante sobre el
--   texto de esta migración.
--
--   Los flags de visibilidad de user_profile_public se aplican server-side con
--   CASE WHEN (mismo patrón que 178): un usuario que ocultó electrones/racha/
--   foto/badge aparece en el board con esos campos en NULL.
--
-- SECURITY DEFINER + SET search_path = public. GRANT solo a authenticated,
-- REVOKE de PUBLIC. Idempotente (CREATE OR REPLACE).
--
-- SCOPE temporal: v1 implementa SOLO 'all_time' (ordena por
-- electron_balance.lifetime_electrons). Ventanas 'week'/'month' quedan como
-- follow-up: requieren sumar una tabla de transacciones temporal (electron_logs
-- tiene created_at pero es RLS own-only y NO está en el whitelist de superficies
-- del leaderboard, así que sumarla aquí rompería la regla anti-fuga de este RPC).
-- Se agregan cuando exista una vista/materialized agregada no-clínica dedicada.
-- Mientras tanto, cualquier p_scope se resuelve como 'all_time' (fail-soft).
-- ============================================================================

-- ── get_leaderboard: top 20 por lifetime_electrons (solo perfiles discoverable) ─

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
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  -- p_scope se ignora en v1 (solo all_time); ver nota de cabecera. Se recibe
  -- para forward-compat del cliente sin cambiar la firma después.
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

-- ── get_my_leaderboard_position: posición global del usuario autenticado ──────
-- Devuelve la posición (1 = más alto) por lifetime_electrons entre TODOS los
-- usuarios con economía, aunque el usuario no esté en el top 20. Retorna solo
-- valores propios + el número de posición (no identifica a nadie más).

CREATE OR REPLACE FUNCTION get_my_leaderboard_position()
RETURNS TABLE (
  position INT,
  total INT,
  lifetime_electrons INT,
  current_rank INT,
  streak_days INT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_life INT;
  v_rank INT;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  SELECT eb.lifetime_electrons, eb.current_rank
    INTO v_life, v_rank
  FROM electron_balance eb
  WHERE eb.user_id = v_uid;

  IF v_life IS NULL THEN RETURN; END IF;

  RETURN QUERY
    SELECT
      (1 + (SELECT COUNT(*)::INT FROM electron_balance e2
              WHERE e2.lifetime_electrons > v_life))::INT AS position,
      (SELECT COUNT(*)::INT FROM electron_balance)          AS total,
      v_life,
      v_rank,
      COALESCE((SELECT pp.streak_days FROM user_profile_public pp
                 WHERE pp.user_id = v_uid), 0);
END; $$;

REVOKE ALL ON FUNCTION get_leaderboard(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_my_leaderboard_position() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_leaderboard(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_leaderboard_position() TO authenticated;
