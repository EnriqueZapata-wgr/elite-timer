-- ============================================================================
-- 193 — ACTIVITY_FEED mínima + day_complete (Comunidad V1.1 §2.4).
-- Depende de 177 (user_profile_public) y 182 (friendships).
--
-- No existía tabla de feed (verificado: cero matches de activity_feed en
-- migraciones/src). Esta es la mínima del mapa Comunidad: el dueño INSERTA lo
-- suyo (RLS lo permite), los amigos leen SOLO vía get_friends_feed (DEFINER).
-- La UI completa del feed es C3 futuro — aquí solo emit + RPC de lectura.
--
-- ⚠️ ANTI-FUGA CLÍNICA:
--   · event_type con CHECK espejo HARDCODEADO de FEED_EVENT_TYPES
--     (src/constants/community.ts) + 'day_complete' (aprobado megabuzón Sprint 4
--     post-DX-F4 — la exclusión v1 de la decisión #4 queda REVERTIDA).
--     Un evento clínico no puede existir ni a nivel DB.
--   · payload lo escribe el DUEÑO con el emisor tipado del cliente
--     (feed-core.buildDayCompletePayload — solo fecha + atp_score).
--   · get_friends_feed: JOIN SOLO friendships accepted + user_profile_public;
--     respeta show_activity y show_photo server-side.
--
-- Idempotencia day_complete: UNIQUE parcial (user_id, event_date) — un día
-- completo solo entra una vez aunque el cliente re-emita.
--
-- Idempotente. NO aplicar al remoto desde este branch.
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- CHECK espejo de FEED_EVENT_TYPES (constants) — mantener en sync EXPLÍCITO.
  event_type TEXT NOT NULL CHECK (event_type IN (
    'badge_earned', 'streak_milestone', 'rank_up', 'fitness_pr', 'day_complete'
  )),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un day_complete por (user, fecha) — idempotencia del emit del cliente.
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_feed_day_complete_once
  ON activity_feed (user_id, event_date) WHERE event_type = 'day_complete';

CREATE INDEX IF NOT EXISTS idx_activity_feed_user_created
  ON activity_feed (user_id, created_at DESC);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- El dueño inserta/lee lo SUYO. La lectura de amigos va por el RPC DEFINER.
DO $$ BEGIN
  CREATE POLICY "Owner manages own feed events" ON activity_feed
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── get_friends_feed: eventos de amigos accepted, proyección pública ──────────
-- Salidas prefijadas (event_*/friend_*) — sin palabras reservadas a secas.
-- show_activity=false oculta TODOS los eventos de ese user; show_photo aplica
-- al avatar (mismo patrón CASE de 178/180/184).

CREATE OR REPLACE FUNCTION get_friends_feed()
RETURNS TABLE (
  event_id UUID,
  friend_user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  event_type TEXT,
  event_date DATE,
  payload JSONB,
  created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  RETURN QUERY
    SELECT
      af.id,
      af.user_id,
      pp.username,
      COALESCE(pp.display_name, pp.username),
      CASE WHEN pp.show_photo THEN pp.avatar_url ELSE NULL END,
      af.event_type,
      af.event_date,
      af.payload,
      af.created_at
    FROM friendships f
    JOIN activity_feed af
      ON af.user_id = CASE WHEN f.requester_id = v_uid THEN f.addressee_id ELSE f.requester_id END
    JOIN user_profile_public pp ON pp.user_id = af.user_id
    WHERE f.status = 'accepted'
      AND v_uid IN (f.requester_id, f.addressee_id)
      AND pp.show_activity
    ORDER BY af.created_at DESC
    LIMIT 50;
END; $$;

-- ── Permisos (patrón 178/184) ────────────────────────────────────────────────

REVOKE ALL ON FUNCTION get_friends_feed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_friends_feed() TO authenticated;
