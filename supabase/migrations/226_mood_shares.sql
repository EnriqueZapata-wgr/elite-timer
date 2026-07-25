-- ============================================================================
-- 226 — CAPA SOCIAL DE ÁNIMO (MB-4 · Bloque 4): mood_shares + reacciones cálidas.
--
-- DOCTRINA (hereda el anti-fuga de Comunidad, mapa 177+):
--   · Compartir el ánimo es OPT-IN EXPLÍCITO Y GRANULAR: la fila en mood_shares
--     solo existe si el usuario tocó "Compartir" en ESE check-in. No hay
--     auto-share, no hay default ON, y se puede borrar (dejar de compartir).
--   · Lo compartido es una COPIA mínima autorizada por el dueño (cuadrante +
--     label opcional de emoción). Los RPCs JAMÁS leen emotional_checkins ni
--     ninguna tabla clínica — la única referencia a emotional_checkins es el
--     FK (ON DELETE CASCADE: borrar el check-in borra el share — privacidad).
--   · SIN métricas comparativas ni ranking de ánimo: una reacción por persona
--     (cálida, no contador de likes) y cero agregados cross-user.
--   · Tablas nuevas permitidas tras FROM/JOIN en estos RPCs: mood_shares,
--     mood_share_reactions, friendships, user_blocks, user_profile_public.
--     (Test estático espejo: mood-share-core.test.ts.)
--
-- SECURITY DEFINER + SET search_path = public. REVOKE PUBLIC + GRANT
-- authenticated (patrón 178/184). Idempotente. RLS en cada CREATE TABLE.
-- ============================================================================

-- ── mood_shares: el share existe = el consentimiento existe ──────────────────

CREATE TABLE IF NOT EXISTS mood_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_id UUID REFERENCES emotional_checkins(id) ON DELETE CASCADE,
  quadrant TEXT NOT NULL CHECK (quadrant IN ('high_pleasant','high_unpleasant','low_pleasant','low_unpleasant')),
  emotion_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un check-in se comparte a lo más una vez.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mood_shares_checkin
  ON mood_shares(checkin_id) WHERE checkin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mood_shares_user_date
  ON mood_shares(user_id, created_at DESC);

ALTER TABLE mood_shares ENABLE ROW LEVEL SECURITY;

-- El dueño gestiona sus shares (crear al compartir, borrar al retirar).
-- La lectura cross-user va SOLO por el RPC get_friends_moods (DEFINER).
DO $$ BEGIN
  CREATE POLICY "Users manage own mood_shares" ON mood_shares
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── mood_share_reactions: respuesta cálida, no likes ─────────────────────────

CREATE TABLE IF NOT EXISTS mood_share_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES mood_shares(id) ON DELETE CASCADE,
  reactor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('te_leo','un_abrazo','aqui_estoy')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (share_id, reactor_id)
);

CREATE INDEX IF NOT EXISTS idx_mood_share_reactions_share
  ON mood_share_reactions(share_id);

ALTER TABLE mood_share_reactions ENABLE ROW LEVEL SECURITY;

-- Quien reaccionó ve/borra su reacción; el INSERT/UPDATE va por RPC
-- (react_to_mood valida amistad + blocks server-side).
DO $$ BEGIN
  CREATE POLICY "Reactors manage own reactions" ON mood_share_reactions
    FOR SELECT USING (auth.uid() = reactor_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Reactors delete own reactions" ON mood_share_reactions
    FOR DELETE USING (auth.uid() = reactor_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- El dueño del share lee las reacciones que recibió.
DO $$ BEGIN
  CREATE POLICY "Share owners read received reactions" ON mood_share_reactions
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM mood_shares ms
        WHERE ms.id = mood_share_reactions.share_id AND ms.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── get_friends_moods: ánimo reciente de tus personas (accepted, sin blocks) ──
-- Últimos 7 días, máximo 50. El avatar respeta show_photo (patrón 184).
-- Salidas prefijadas (aprendizaje 180: cero palabras reservadas).

CREATE OR REPLACE FUNCTION get_friends_moods()
RETURNS TABLE (
  share_id UUID,
  other_user_id UUID,
  friend_username TEXT,
  friend_display_name TEXT,
  friend_avatar_url TEXT,
  shared_quadrant TEXT,
  shared_emotion_label TEXT,
  shared_at TIMESTAMPTZ,
  my_reaction TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT
    ms.id,
    ms.user_id,
    pp.username,
    pp.display_name,
    CASE WHEN COALESCE(pp.show_photo, false) THEN pp.avatar_url ELSE NULL END,
    ms.quadrant,
    ms.emotion_label,
    ms.created_at,
    (SELECT r.kind FROM mood_share_reactions r
      WHERE r.share_id = ms.id AND r.reactor_id = v_uid)
  FROM mood_shares ms
  JOIN friendships f ON f.status = 'accepted' AND (
    (f.requester_id = v_uid AND f.addressee_id = ms.user_id) OR
    (f.addressee_id = v_uid AND f.requester_id = ms.user_id)
  )
  LEFT JOIN user_profile_public pp ON pp.user_id = ms.user_id
  WHERE ms.created_at >= NOW() - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks ub
      WHERE (ub.blocker_id = v_uid AND ub.blocked_id = ms.user_id)
         OR (ub.blocker_id = ms.user_id AND ub.blocked_id = v_uid)
    )
  ORDER BY ms.created_at DESC
  LIMIT 50;
END $$;

-- ── react_to_mood: una reacción cálida por persona y share ───────────────────
-- Códigos: reacted | not_found | not_allowed | bad_kind | no_auth

CREATE OR REPLACE FUNCTION react_to_mood(p_share_id UUID, p_kind TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_owner UUID;
BEGIN
  IF v_uid IS NULL THEN RETURN 'no_auth'; END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('te_leo','un_abrazo','aqui_estoy') THEN
    RETURN 'bad_kind';
  END IF;

  SELECT ms.user_id INTO v_owner FROM mood_shares ms WHERE ms.id = p_share_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_owner = v_uid THEN RETURN 'not_allowed'; END IF;

  -- Solo amigos accepted, sin block en ninguna dirección.
  IF NOT EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.status = 'accepted' AND (
      (f.requester_id = v_uid AND f.addressee_id = v_owner) OR
      (f.addressee_id = v_uid AND f.requester_id = v_owner)
    )
  ) THEN RETURN 'not_allowed'; END IF;
  IF EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE (ub.blocker_id = v_uid AND ub.blocked_id = v_owner)
       OR (ub.blocker_id = v_owner AND ub.blocked_id = v_uid)
  ) THEN RETURN 'not_allowed'; END IF;

  INSERT INTO mood_share_reactions (share_id, reactor_id, kind)
  VALUES (p_share_id, v_uid, p_kind)
  ON CONFLICT (share_id, reactor_id)
  DO UPDATE SET kind = EXCLUDED.kind, created_at = NOW();
  RETURN 'reacted';
END $$;

-- ── Permisos (patrón 178/184) ────────────────────────────────────────────────

REVOKE ALL ON FUNCTION get_friends_moods() FROM PUBLIC;
REVOKE ALL ON FUNCTION react_to_mood(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_friends_moods() TO authenticated;
GRANT EXECUTE ON FUNCTION react_to_mood(UUID, TEXT) TO authenticated;
