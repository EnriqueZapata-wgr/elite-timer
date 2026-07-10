-- ============================================================================
-- 177 — USER_PROFILE_PUBLIC: la superficie pública de Comunidad (frontera anti-leak).
-- Mapa Comunidad v1 (aprobado 2026-07-11). Rango Comunidad 177+.
--
-- Proyección PLANA con SOLO columnas no-clínicas + flags de visibilidad. NO es
-- una vista sobre profiles/electron_balance (una vista acopla RLS y crea
-- join-path); es un snapshot denormalizado, aislado.
--
-- ⚠️ ANTI-FUGA CLÍNICA (regla no-negociable):
--   - RLS DUEÑO-ONLY. NO hay política SELECT cross-user → un select crudo de
--     otro user lo niega RLS. La única lectura de otro perfil es vía los RPCs
--     SECURITY DEFINER de la migración 178 (get_public_profile / search_users),
--     que seleccionan SOLO de esta tabla (jamás de DX/síntomas/labs/etc).
--   - Esta tabla no contiene ningún dato clínico por diseño.
--
-- Snapshots (rank/electrones) sincronizados por trigger desde electron_balance.
-- La creación/actualización de la fila propia va por sync_public_profile (178).
--
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profile_public (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,               -- apunta a bucket PÚBLICO avatars_public (179)
  country TEXT,
  chronotype TEXT,               -- snapshot (no lee user_chronotype en público)
  streak_days INT NOT NULL DEFAULT 0,
  lifetime_electrons INT NOT NULL DEFAULT 0,
  current_rank INT NOT NULL DEFAULT 1,
  friend_count INT NOT NULL DEFAULT 0,
  -- flags de visibilidad granular (defaults del brief §C)
  discoverable BOOLEAN NOT NULL DEFAULT true,
  allow_friend_requests BOOLEAN NOT NULL DEFAULT true,
  show_streak BOOLEAN NOT NULL DEFAULT true,
  show_electrons BOOLEAN NOT NULL DEFAULT true,
  show_badges BOOLEAN NOT NULL DEFAULT true,
  show_activity BOOLEAN NOT NULL DEFAULT true,
  show_country BOOLEAN NOT NULL DEFAULT false,
  show_chronotype BOOLEAN NOT NULL DEFAULT false,
  show_photo BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Buscador: match por username/display_name (case-insensitive). trigram opcional
-- post-scale; en beta un índice simple + ILIKE basta.
CREATE INDEX IF NOT EXISTS idx_user_profile_public_username
  ON user_profile_public (lower(username));
CREATE INDEX IF NOT EXISTS idx_user_profile_public_discoverable
  ON user_profile_public (discoverable) WHERE discoverable;

ALTER TABLE user_profile_public ENABLE ROW LEVEL SECURITY;

-- SOLO el dueño accede directo. Las lecturas cross-user pasan por RPC DEFINER (178).
DO $$ BEGIN
  CREATE POLICY "Owner manages own public profile" ON user_profile_public
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Trigger: mantener snapshot de rank/electrones desde electron_balance ─────
-- Solo actualiza si la fila pública YA existe (no la crea; eso lo hace sync).

CREATE OR REPLACE FUNCTION sync_public_from_electron()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE user_profile_public
     SET lifetime_electrons = NEW.lifetime_electrons,
         current_rank = NEW.current_rank,
         updated_at = NOW()
   WHERE user_id = NEW.user_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_public_from_electron ON electron_balance;
CREATE TRIGGER trg_sync_public_from_electron
  AFTER INSERT OR UPDATE OF lifetime_electrons, current_rank ON electron_balance
  FOR EACH ROW EXECUTE FUNCTION sync_public_from_electron();

-- ── Backfill de usuarios existentes ─────────────────────────────────────────
-- Crea la fila pública con defaults + snapshot de electron_balance. username
-- queda NULL (el user lo elige después). display_name deriva de full_name.

INSERT INTO user_profile_public (user_id, display_name, avatar_url, lifetime_electrons, current_rank)
SELECT p.id, p.full_name, p.avatar_url,
       COALESCE(eb.lifetime_electrons, 0), COALESCE(eb.current_rank, 1)
FROM profiles p
LEFT JOIN electron_balance eb ON eb.user_id = p.id
ON CONFLICT (user_id) DO NOTHING;
