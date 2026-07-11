-- ============================================================================
-- 184 — RPCs SOCIALES de Comunidad C2 (amigos + moderación). Rango 177+.
-- Depende de 177 (user_profile_public), 182 (friendships), 183 (blocks/reports).
--
-- ⚠️ ANTI-FUGA CLÍNICA (regla NO-NEGOCIABLE del mapa Comunidad):
--   Estas funciones son la vía de lectura/escritura cross-user del grafo social.
--   Por diseño tocan ÚNICAMENTE superficies NO-clínicas:
--     · user_profile_public   (perfil público whitelisteado — frontera anti-leak)
--     · friendships           (182 — solo UUIDs/status/fechas)
--     · user_blocks           (183)
--     · user_reports          (183)
--     · community_search_log  (esta migración — rate limit del buscador)
--   JAMÁS un join a DX, intervenciones, síntomas, padecimientos, labs,
--   suplementos, ciclo, journal, mood, Braverman ni quizzes. El test estático
--   friends-core.test.ts (anti-leak mig 184) verifica este invariante sobre el
--   texto de esta migración. Los flags de visibilidad se aplican server-side
--   con CASE WHEN (mismo patrón que 178/180).
--
-- SECURITY DEFINER + SET search_path = public. REVOKE de PUBLIC + GRANT solo a
-- authenticated (patrón exacto de 178). Idempotente (CREATE OR REPLACE / IF NOT
-- EXISTS / duplicate_object).
--
-- ⚠️ PALABRAS RESERVADAS (aprendizaje mig 180: 'position' rompió): en RETURNS
-- TABLE no se usa position/user/order/status a secas; salidas prefijadas
-- (request_id, direction, other_user_id...) y toda referencia a tabla va
-- cualificada (pp./f./ub./ur./sl.) para evitar "column reference is ambiguous".
--
-- Los RPCs de mutación devuelven TEXT (código de resultado) en vez de RAISE:
-- los casos esperados (bloqueado, duplicado, no encontrado) no son errores.
-- ============================================================================

-- ── send_friend_request: crea/reactiva un edge pending ───────────────────────
-- Códigos: sent | already_friends | already_pending | incoming_pending |
--          not_found | not_allowed | no_auth
--
-- Decisión C2 (documentada): un edge 'declined' viejo NO es permanente — un
-- re-request lo REUTILIZA (UPDATE de la misma fila a pending, con el requester
-- actual y responded_at NULL). El "no definitivo" es block_user, no declined.
--
-- Anti-enumeración: block en CUALQUIER dirección devuelve el MISMO código que
-- "no acepta solicitudes" ('not_allowed') — quien fue bloqueado no puede
-- distinguirlo de un perfil cerrado.

CREATE OR REPLACE FUNCTION send_friend_request(p_target UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_allow BOOLEAN;
  v_edge friendships%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RETURN 'no_auth'; END IF;
  IF p_target IS NULL OR p_target = v_uid THEN RETURN 'not_allowed'; END IF;

  SELECT pp.allow_friend_requests INTO v_allow
  FROM user_profile_public pp WHERE pp.user_id = p_target;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE (ub.blocker_id = v_uid AND ub.blocked_id = p_target)
       OR (ub.blocker_id = p_target AND ub.blocked_id = v_uid)
  ) THEN
    RETURN 'not_allowed';
  END IF;

  IF NOT COALESCE(v_allow, false) THEN RETURN 'not_allowed'; END IF;

  SELECT f.* INTO v_edge FROM friendships f
  WHERE LEAST(f.requester_id, f.addressee_id) = LEAST(v_uid, p_target)
    AND GREATEST(f.requester_id, f.addressee_id) = GREATEST(v_uid, p_target);

  IF FOUND THEN
    IF v_edge.status = 'accepted' THEN RETURN 'already_friends'; END IF;
    IF v_edge.status = 'pending' THEN
      -- Si el pending es ENTRANTE, el cliente debe aceptar, no re-pedir.
      IF v_edge.addressee_id = v_uid THEN RETURN 'incoming_pending'; END IF;
      RETURN 'already_pending';
    END IF;
    -- declined viejo → re-request reutilizando la fila (ver decisión arriba).
    UPDATE friendships SET
      requester_id = v_uid,
      addressee_id = p_target,
      status = 'pending',
      created_at = NOW(),
      responded_at = NULL
    WHERE id = v_edge.id;
    RETURN 'sent';
  END IF;

  INSERT INTO friendships (requester_id, addressee_id, status)
  VALUES (v_uid, p_target, 'pending');
  RETURN 'sent';
END; $$;

-- ── respond_friend_request: aceptar/rechazar (solo el addressee) ──────────────
-- Códigos: accepted | declined | not_found | no_auth
-- accept → friend_count +1 en ambos perfiles públicos (mantenimiento en RPC,
-- no trigger: simple y auditable).

CREATE OR REPLACE FUNCTION respond_friend_request(p_request_id UUID, p_accept BOOLEAN)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_edge friendships%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RETURN 'no_auth'; END IF;

  SELECT f.* INTO v_edge FROM friendships f WHERE f.id = p_request_id;
  IF NOT FOUND OR v_edge.addressee_id <> v_uid OR v_edge.status <> 'pending' THEN
    RETURN 'not_found';
  END IF;

  UPDATE friendships SET
    status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
    responded_at = NOW()
  WHERE id = p_request_id;

  IF p_accept THEN
    UPDATE user_profile_public SET
      friend_count = friend_count + 1,
      updated_at = NOW()
    WHERE user_id IN (v_edge.requester_id, v_edge.addressee_id);
    RETURN 'accepted';
  END IF;
  RETURN 'declined';
END; $$;

-- ── list_friends: amigos accepted con proyección pública ─────────────────────
-- MISMO shape y CASE de flags que get_public_profile (178): la salida pasa el
-- guard projectionIsClean del cliente sin agregar campos al whitelist.
-- SOLO user_profile_public + friendships.

CREATE OR REPLACE FUNCTION list_friends()
RETURNS TABLE (
  user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT, country TEXT,
  chronotype TEXT, streak_days INT, lifetime_electrons INT, current_rank INT, friend_count INT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  RETURN QUERY
    SELECT
      pp.user_id,
      pp.username,
      COALESCE(pp.display_name, pp.username),
      CASE WHEN pp.show_photo      THEN pp.avatar_url         ELSE NULL END,
      CASE WHEN pp.show_country    THEN pp.country            ELSE NULL END,
      CASE WHEN pp.show_chronotype THEN pp.chronotype         ELSE NULL END,
      CASE WHEN pp.show_streak     THEN pp.streak_days        ELSE NULL END,
      CASE WHEN pp.show_electrons  THEN pp.lifetime_electrons ELSE NULL END,
      CASE WHEN pp.show_badges     THEN pp.current_rank       ELSE NULL END,
      pp.friend_count
    FROM friendships f
    JOIN user_profile_public pp
      ON pp.user_id = CASE WHEN f.requester_id = v_uid THEN f.addressee_id ELSE f.requester_id END
    WHERE f.status = 'accepted'
      AND v_uid IN (f.requester_id, f.addressee_id)
    ORDER BY lower(COALESCE(pp.display_name, pp.username, '')) ASC;
END; $$;

-- ── list_pending_requests: pendientes recibidas y enviadas ───────────────────
-- Proyección pública MÍNIMA del otro lado (id/username/display/foto según flag).
-- direction: 'incoming' (me la enviaron) | 'outgoing' (yo la envié).

CREATE OR REPLACE FUNCTION list_pending_requests()
RETURNS TABLE (
  request_id UUID,
  direction TEXT,
  other_user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  requested_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  RETURN QUERY
    SELECT
      f.id,
      CASE WHEN f.addressee_id = v_uid THEN 'incoming' ELSE 'outgoing' END,
      pp.user_id,
      pp.username,
      COALESCE(pp.display_name, pp.username),
      CASE WHEN pp.show_photo THEN pp.avatar_url ELSE NULL END,
      f.created_at
    FROM friendships f
    JOIN user_profile_public pp
      ON pp.user_id = CASE WHEN f.requester_id = v_uid THEN f.addressee_id ELSE f.requester_id END
    WHERE f.status = 'pending'
      AND v_uid IN (f.requester_id, f.addressee_id)
    ORDER BY f.created_at DESC;
END; $$;

-- ── unfriend: borra edge accepted + friend_count -1 en ambos ─────────────────
-- Códigos: unfriended | not_found | no_auth

CREATE OR REPLACE FUNCTION unfriend(p_target UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_deleted INT;
BEGIN
  IF v_uid IS NULL THEN RETURN 'no_auth'; END IF;
  IF p_target IS NULL OR p_target = v_uid THEN RETURN 'not_found'; END IF;

  DELETE FROM friendships f
  WHERE LEAST(f.requester_id, f.addressee_id) = LEAST(v_uid, p_target)
    AND GREATEST(f.requester_id, f.addressee_id) = GREATEST(v_uid, p_target)
    AND f.status = 'accepted';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN RETURN 'not_found'; END IF;

  UPDATE user_profile_public SET
    friend_count = GREATEST(0, friend_count - 1),
    updated_at = NOW()
  WHERE user_id IN (v_uid, p_target);
  RETURN 'unfriended';
END; $$;

-- ── block_user / unblock_user ────────────────────────────────────────────────
-- block_user además rompe CUALQUIER friendship entre ambos (accepted baja
-- friend_count en ambos; pending/declined solo se borra).
-- Códigos: blocked | not_allowed | no_auth  /  unblocked | no_auth

CREATE OR REPLACE FUNCTION block_user(p_target UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_edge_status TEXT;
BEGIN
  IF v_uid IS NULL THEN RETURN 'no_auth'; END IF;
  IF p_target IS NULL OR p_target = v_uid THEN RETURN 'not_allowed'; END IF;

  INSERT INTO user_blocks (blocker_id, blocked_id)
  VALUES (v_uid, p_target)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  DELETE FROM friendships f
  WHERE LEAST(f.requester_id, f.addressee_id) = LEAST(v_uid, p_target)
    AND GREATEST(f.requester_id, f.addressee_id) = GREATEST(v_uid, p_target)
  RETURNING f.status INTO v_edge_status;

  IF v_edge_status = 'accepted' THEN
    UPDATE user_profile_public SET
      friend_count = GREATEST(0, friend_count - 1),
      updated_at = NOW()
    WHERE user_id IN (v_uid, p_target);
  END IF;
  RETURN 'blocked';
END; $$;

CREATE OR REPLACE FUNCTION unblock_user(p_target UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN 'no_auth'; END IF;
  DELETE FROM user_blocks ub
  WHERE ub.blocker_id = v_uid AND ub.blocked_id = p_target;
  RETURN 'unblocked';
END; $$;

-- ── report_user: report + auto-hide por umbral de reporters distintos ────────
-- Códigos: reported | invalid_reason | not_allowed | no_auth
-- UN report por par (ON CONFLICT DO NOTHING, UNIQUE de 183): repetir no infla.

CREATE OR REPLACE FUNCTION report_user(p_target UUID, p_reason TEXT, p_details TEXT DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  -- Umbral de auto-ocultado (beta). Subir a 5-10 post-scale (configurable).
  v_auto_hide_threshold CONSTANT INT := 3;
  v_distinct_reporters INT;
BEGIN
  IF v_uid IS NULL THEN RETURN 'no_auth'; END IF;
  IF p_target IS NULL OR p_target = v_uid THEN RETURN 'not_allowed'; END IF;
  IF p_reason IS NULL
     OR p_reason NOT IN ('spam', 'harassment', 'impersonation', 'inappropriate', 'other') THEN
    RETURN 'invalid_reason';
  END IF;

  INSERT INTO user_reports (reporter_id, reported_id, reason, details)
  VALUES (v_uid, p_target, p_reason, NULLIF(trim(COALESCE(p_details, '')), ''))
  ON CONFLICT (reporter_id, reported_id) DO NOTHING;

  SELECT COUNT(DISTINCT ur.reporter_id) INTO v_distinct_reporters
  FROM user_reports ur WHERE ur.reported_id = p_target;

  IF v_distinct_reporters >= v_auto_hide_threshold THEN
    -- Auto-hide hasta revisión manual: sale del buscador y del leaderboard.
    UPDATE user_profile_public SET
      discoverable = false,
      updated_at = NOW()
    WHERE user_id = p_target AND discoverable;
  END IF;
  RETURN 'reported';
END; $$;

-- ── community_search_log: rate limit anti-enumeración del buscador ───────────
-- Tabla chica solo-servidor. RLS dueño (lectura); escrituras solo vía el RPC
-- DEFINER search_users. Limpieza inline en el propio RPC (sin cron).

CREATE TABLE IF NOT EXISTS community_search_log (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_search_log_user
  ON community_search_log (user_id, searched_at);

ALTER TABLE community_search_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner reads own search log" ON community_search_log
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── search_users v2 (REPLACE de 178, MISMA firma y shape) ────────────────────
-- Agrega sobre 178:
--   1) Excluye usuarios con block en CUALQUIER dirección respecto al caller.
--   2) RATE LIMIT anti-enumeración server-side: máx 20 búsquedas por 60s por
--      usuario (la 21ª+ dentro de la ventana devuelve VACÍO, sin error — el
--      cliente muestra mensaje suave). Cada llamada loguea en
--      community_search_log y borra sus logs >1h (limpieza barata, sin cron).

CREATE OR REPLACE FUNCTION search_users(p_query TEXT)
RETURNS TABLE (
  user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT,
  current_rank INT, streak_days INT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_q TEXT := '%' || trim(p_query) || '%';
  -- Máx búsquedas por ventana de 60s. Ajustable post-scale.
  v_rate_limit CONSTANT INT := 20;
  v_recent INT;
BEGIN
  IF v_uid IS NULL OR length(trim(p_query)) < 2 THEN RETURN; END IF;

  -- Limpieza de logs viejos del propio caller (>1h) + log de esta búsqueda.
  DELETE FROM community_search_log sl
  WHERE sl.user_id = v_uid AND sl.searched_at < NOW() - INTERVAL '1 hour';
  INSERT INTO community_search_log (user_id) VALUES (v_uid);

  SELECT COUNT(*) INTO v_recent FROM community_search_log sl
  WHERE sl.user_id = v_uid AND sl.searched_at > NOW() - INTERVAL '60 seconds';
  IF v_recent > v_rate_limit THEN RETURN; END IF;  -- rate-limited → vacío

  RETURN QUERY
    SELECT
      pp.user_id,
      pp.username,
      COALESCE(pp.display_name, pp.username),
      CASE WHEN pp.show_photo  THEN pp.avatar_url   ELSE NULL END,
      CASE WHEN pp.show_badges THEN pp.current_rank ELSE NULL END,
      CASE WHEN pp.show_streak THEN pp.streak_days  ELSE NULL END
    FROM user_profile_public pp
    WHERE pp.discoverable
      AND pp.user_id <> v_uid
      AND (pp.username ILIKE v_q OR pp.display_name ILIKE v_q OR pp.country ILIKE v_q)
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks ub
        WHERE (ub.blocker_id = v_uid AND ub.blocked_id = pp.user_id)
           OR (ub.blocker_id = pp.user_id AND ub.blocked_id = v_uid)
      )
    ORDER BY pp.lifetime_electrons DESC
    LIMIT 20;
END; $$;

-- ── Permisos (patrón 178: REVOKE PUBLIC + GRANT authenticated) ───────────────

REVOKE ALL ON FUNCTION send_friend_request(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION respond_friend_request(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION list_friends() FROM PUBLIC;
REVOKE ALL ON FUNCTION list_pending_requests() FROM PUBLIC;
REVOKE ALL ON FUNCTION unfriend(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION block_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION unblock_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION report_user(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION search_users(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION send_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION respond_friend_request(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION list_friends() TO authenticated;
GRANT EXECUTE ON FUNCTION list_pending_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION unfriend(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION block_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unblock_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION report_user(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_users(TEXT) TO authenticated;
