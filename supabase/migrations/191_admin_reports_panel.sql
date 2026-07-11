-- ============================================================================
-- 191 — PANEL DE REVISIÓN MANUAL DE USER_REPORTS (Comunidad V1.1 §2.2).
-- Depende de 183 (user_reports) y 177 (user_profile_public).
--
-- MODELO ADMIN (decisión documentada): el repo NO tenía ningún rol admin
-- (no existe profiles.is_admin; profiles.tier es suscripción, NO autorización).
-- Se crea la tabla dedicada `admin_users` (solo UUIDs + nota + fecha):
--   · Additiva — no toca profiles (tabla core con selects amplios en cliente).
--   · Superficie 100% no-clínica → el guard estático puede permitirla sin
--     debilitar el contrato anti-leak (permitir `profiles` tras FROM/JOIN sí
--     lo debilitaría).
--   · Alta SOLO manual vía SQL (sin policy de INSERT — ni siquiera un admin
--     puede nombrar admins desde el cliente):
--       INSERT INTO admin_users (user_id, note)
--       VALUES ('<uuid-de-enrique>', 'founder') ON CONFLICT DO NOTHING;
--
-- El gate se valida DENTRO de cada RPC (IF NOT admin → salida vacía / código
-- 'not_admin'). El gate client-side (pantalla app/admin/reports.tsx) es solo
-- UX: lee su propia fila de admin_users (RLS dueño-only).
--
-- ⚠️ ANTI-FUGA CLÍNICA: los RPCs admin exponen reporter/reported ÚNICAMENTE
-- como identidad pública (username/display de user_profile_public). JAMÁS
-- datos de salud. Superficies: user_reports + user_profile_public + admin_users.
--
-- Idempotente. NO aplicar al remoto desde este branch.
-- ============================================================================

-- ── user_reports.status ──────────────────────────────────────────────────────

ALTER TABLE user_reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';

DO $$ BEGIN
  ALTER TABLE user_reports
    ADD CONSTRAINT user_reports_status_check
    CHECK (status IN ('open', 'reviewed', 'actioned', 'dismissed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- La cola del panel filtra por abiertos.
CREATE INDEX IF NOT EXISTS idx_user_reports_open
  ON user_reports (created_at) WHERE status = 'open';

-- ── admin_users ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- El dueño puede leer SU propia fila ("¿soy admin?" para el gate de UI).
-- Sin policy de INSERT/UPDATE/DELETE: el alta es manual vía SQL (ver cabecera).
DO $$ BEGIN
  CREATE POLICY "Owner reads own admin flag" ON admin_users
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── admin_list_reports: cola de moderación con identidad pública ─────────────
-- Salidas prefijadas (report_*/reporter_*/reported_*) — sin palabras reservadas
-- a secas (aprendizaje mig 180). p_status NULL = todos los estados.

CREATE OR REPLACE FUNCTION admin_list_reports(p_status TEXT DEFAULT 'open')
RETURNS TABLE (
  report_id UUID,
  reporter_user_id UUID,
  reporter_username TEXT,
  reporter_display_name TEXT,
  reported_user_id UUID,
  reported_username TEXT,
  reported_display_name TEXT,
  reported_discoverable BOOLEAN,
  report_reason TEXT,
  report_details TEXT,
  report_status TEXT,
  report_created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  -- Gate server-side autoritativo (el gate de UI es solo UX).
  IF NOT EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = v_uid) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      ur.id,
      ur.reporter_id,
      rp.username,
      COALESCE(rp.display_name, rp.username),
      ur.reported_id,
      rd.username,
      COALESCE(rd.display_name, rd.username),
      COALESCE(rd.discoverable, false),
      ur.reason,
      ur.details,
      ur.status,
      ur.created_at
    FROM user_reports ur
    LEFT JOIN user_profile_public rp ON rp.user_id = ur.reporter_id
    LEFT JOIN user_profile_public rd ON rd.user_id = ur.reported_id
    WHERE (p_status IS NULL OR ur.status = p_status)
    ORDER BY ur.created_at DESC
    LIMIT 100;
END; $$;

-- ── admin_resolve_report ─────────────────────────────────────────────────────
-- Códigos: resolved | invalid_resolution | not_found | not_admin | no_auth

CREATE OR REPLACE FUNCTION admin_resolve_report(p_report_id UUID, p_resolution TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_updated INT;
BEGIN
  IF v_uid IS NULL THEN RETURN 'no_auth'; END IF;
  IF NOT EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = v_uid) THEN
    RETURN 'not_admin';
  END IF;
  IF p_resolution IS NULL
     OR p_resolution NOT IN ('reviewed', 'actioned', 'dismissed') THEN
    RETURN 'invalid_resolution';
  END IF;

  UPDATE user_reports SET status = p_resolution WHERE id = p_report_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN RETURN 'not_found'; END IF;
  RETURN 'resolved';
END; $$;

-- ── admin_set_discoverable: revertir/confirmar auto-hides de report_user ─────
-- Códigos: updated | not_found | not_admin | no_auth

CREATE OR REPLACE FUNCTION admin_set_discoverable(p_user_id UUID, p_value BOOLEAN)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_updated INT;
BEGIN
  IF v_uid IS NULL THEN RETURN 'no_auth'; END IF;
  IF NOT EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = v_uid) THEN
    RETURN 'not_admin';
  END IF;
  IF p_user_id IS NULL OR p_value IS NULL THEN RETURN 'not_found'; END IF;

  UPDATE user_profile_public SET
    discoverable = p_value,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN RETURN 'not_found'; END IF;
  RETURN 'updated';
END; $$;

-- ── Permisos (patrón 178/184) ────────────────────────────────────────────────

REVOKE ALL ON FUNCTION admin_list_reports(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_resolve_report(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_set_discoverable(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_list_reports(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_resolve_report(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_discoverable(UUID, BOOLEAN) TO authenticated;
