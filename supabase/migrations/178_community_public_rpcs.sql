-- ============================================================================
-- 178 — RPCs públicos de Comunidad C1 (SECURITY DEFINER). Rango Comunidad 177+.
-- Depende de 177.
--
-- ⚠️ Estas funciones son la ÚNICA vía de lectura cross-user del perfil público.
-- Invariante anti-fuga: seleccionan SOLO de user_profile_public (+ electron_balance
-- para el snapshot en sync). NINGÚN join a tablas clínicas (DX, intervenciones,
-- síntomas, labs, suplementos, ciclo, journal, Braverman). Aplican los flags de
-- visibilidad server-side (doble filtro: servidor autoritativo + espejo cliente).
--
-- SECURITY DEFINER + SET search_path = public. GRANT solo a authenticated.
-- Idempotente (CREATE OR REPLACE).
-- ============================================================================

-- ── sync_public_profile: upsert de la fila propia ────────────────────────────
-- Escribe identidad (username/display/país/cronotipo/streak) provista por el
-- cliente y refresca rank/electrones desde electron_balance. Crea la fila si no
-- existe. No sobreescribe con NULL (COALESCE con lo existente).

CREATE OR REPLACE FUNCTION sync_public_profile(
  p_username TEXT DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_chronotype TEXT DEFAULT NULL,
  p_streak_days INT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_life INT;
  v_rank INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'no auth'; END IF;

  SELECT COALESCE(lifetime_electrons, 0), COALESCE(current_rank, 1)
    INTO v_life, v_rank
  FROM electron_balance WHERE user_id = v_uid;

  INSERT INTO user_profile_public (
    user_id, username, display_name, country, chronotype, streak_days,
    lifetime_electrons, current_rank, updated_at
  ) VALUES (
    v_uid, p_username, p_display_name, p_country, p_chronotype, COALESCE(p_streak_days, 0),
    COALESCE(v_life, 0), COALESCE(v_rank, 1), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, user_profile_public.username),
    display_name = COALESCE(EXCLUDED.display_name, user_profile_public.display_name),
    country = COALESCE(EXCLUDED.country, user_profile_public.country),
    chronotype = COALESCE(EXCLUDED.chronotype, user_profile_public.chronotype),
    streak_days = COALESCE(EXCLUDED.streak_days, user_profile_public.streak_days),
    lifetime_electrons = EXCLUDED.lifetime_electrons,
    current_rank = EXCLUDED.current_rank,
    updated_at = NOW();
END; $$;

-- ── get_public_profile: perfil de otro user con flags aplicados ──────────────

CREATE OR REPLACE FUNCTION get_public_profile(p_target UUID)
RETURNS TABLE (
  user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT, country TEXT,
  chronotype TEXT, streak_days INT, lifetime_electrons INT, current_rank INT, friend_count INT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  RETURN QUERY
    SELECT
      pp.user_id,
      pp.username,
      COALESCE(pp.display_name, pp.username),
      CASE WHEN pp.show_photo     THEN pp.avatar_url        ELSE NULL END,
      CASE WHEN pp.show_country   THEN pp.country           ELSE NULL END,
      CASE WHEN pp.show_chronotype THEN pp.chronotype       ELSE NULL END,
      CASE WHEN pp.show_streak    THEN pp.streak_days        ELSE NULL END,
      CASE WHEN pp.show_electrons THEN pp.lifetime_electrons ELSE NULL END,
      CASE WHEN pp.show_badges    THEN pp.current_rank       ELSE NULL END,
      pp.friend_count
    FROM user_profile_public pp
    WHERE pp.user_id = p_target;
END; $$;

-- ── search_users: buscador (solo perfiles discoverable) ──────────────────────

CREATE OR REPLACE FUNCTION search_users(p_query TEXT)
RETURNS TABLE (
  user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT,
  current_rank INT, streak_days INT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_q TEXT := '%' || trim(p_query) || '%';
BEGIN
  IF v_uid IS NULL OR length(trim(p_query)) < 2 THEN RETURN; END IF;
  RETURN QUERY
    SELECT
      pp.user_id,
      pp.username,
      COALESCE(pp.display_name, pp.username),
      CASE WHEN pp.show_photo  THEN pp.avatar_url  ELSE NULL END,
      CASE WHEN pp.show_badges THEN pp.current_rank ELSE NULL END,
      CASE WHEN pp.show_streak THEN pp.streak_days  ELSE NULL END
    FROM user_profile_public pp
    WHERE pp.discoverable
      AND pp.user_id <> v_uid
      AND (pp.username ILIKE v_q OR pp.display_name ILIKE v_q OR pp.country ILIKE v_q)
    ORDER BY pp.lifetime_electrons DESC
    LIMIT 20;
END; $$;

REVOKE ALL ON FUNCTION sync_public_profile(TEXT, TEXT, TEXT, TEXT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_public_profile(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION search_users(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sync_public_profile(TEXT, TEXT, TEXT, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_users(TEXT) TO authenticated;
