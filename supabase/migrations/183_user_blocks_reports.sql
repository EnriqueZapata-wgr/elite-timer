-- ============================================================================
-- 183 — USER_BLOCKS + USER_REPORTS: moderación de Comunidad C2. Rango 177+.
-- Depende de 177 (user_profile_public) y 182 (friendships).
--
-- user_blocks: bloqueo unidireccional (blocker no ve / no es contactable por
--   blocked y viceversa en búsqueda). Bloquear además rompe la amistad (RPC
--   block_user en 184).
-- user_reports: UN report por par reporter→reported (UNIQUE) para que nadie
--   infle el contador; al llegar a N reporters DISTINTOS el RPC report_user
--   auto-oculta el perfil (discoverable=false) hasta revisión manual.
--
-- ⚠️ ANTI-FUGA CLÍNICA: ninguna de estas tablas contiene datos clínicos
-- (UUIDs + razón de moderación + fechas). Las escrituras van por RPCs
-- SECURITY DEFINER (184); RLS dueño-only para lectura.
--
-- NO hay backfill (tablas nuevas sin data legacy).
-- Idempotente.
-- ============================================================================

-- ── user_blocks ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- Lookup inverso ("¿alguien me bloqueó?") usado por search_users / send_friend_request.
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked
  ON user_blocks (blocked_id);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Solo el blocker ve sus propios bloqueos (el bloqueado NUNCA sabe que lo
-- bloquearon). Mutaciones vía RPC DEFINER (block_user / unblock_user en 184).
DO $$ BEGIN
  CREATE POLICY "Blocker reads own blocks" ON user_blocks
    FOR SELECT USING (auth.uid() = blocker_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── user_reports ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'impersonation', 'inappropriate', 'other')),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reporter_id <> reported_id),
  UNIQUE (reporter_id, reported_id)  -- un report por par: no se infla el contador
);

-- Conteo de reporters distintos por target (auto-hide en report_user, 184).
CREATE INDEX IF NOT EXISTS idx_user_reports_reported
  ON user_reports (reported_id);

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- El reporter ve solo lo suyo. INSERT vía RPC DEFINER (report_user en 184);
-- el reportado jamás ve quién lo reportó.
DO $$ BEGIN
  CREATE POLICY "Reporter reads own reports" ON user_reports
    FOR SELECT USING (auth.uid() = reporter_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
