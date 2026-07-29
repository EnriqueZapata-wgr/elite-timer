-- MB-13 · PIEZA 2 — La resolución del tier deja de ser un lugar
--
-- Hoy profiles.tier lo escriben RevenueCat, los códigos y las manos de
-- Enrique: tres escritores y ningún árbitro. Desde aquí:
--   * Los escritores registran su otorgamiento en tier_grants.
--   * resolve_effective_tier decide con precedencia fija:
--       1. RevenueCat vigente gana. 2. Código / webhook vigente. 3. free.
--   * apply_effective_tier materializa el resultado en profiles.tier
--     (los lectores existentes no cambian) y deja rastro en tier_history.
--   * Un cron diario degrada a quien venció. Sin esto, toda cortesía
--     es permanente.
-- El cliente NO calcula: consulta get_my_effective_tier().
-- Idempotente. El bloque de cron se aplica vía MCP execute_sql (patrón 156).

-- ── 1) tier_grants: lo que cada escritor otorga ───────────────────────────
CREATE TABLE IF NOT EXISTS tier_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('revenuecat', 'activation_code', 'web_payment', 'manual')),
  tier TEXT NOT NULL CHECK (tier IN ('base', 'pro', 'clinician')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- NULL = sin vencimiento.
  expires_at TIMESTAMPTZ,
  -- Baja explícita (cancelación ya efectiva). La cancelación a futuro se
  -- modela acortando expires_at: se respeta la vigencia pagada.
  revoked_at TIMESTAMPTZ,
  -- Código canjeado, transaction id del pago, o nota de soporte.
  ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tier_grants_user ON tier_grants(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tier_grants_active
  ON tier_grants(user_id) WHERE revoked_at IS NULL;

ALTER TABLE tier_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_tier_grants_select" ON tier_grants;
CREATE POLICY "own_tier_grants_select" ON tier_grants
  FOR SELECT USING (auth.uid() = user_id);

-- ── 2) tier_history: cada cambio efectivo, con motivo ─────────────────────
CREATE TABLE IF NOT EXISTS tier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_tier TEXT,
  new_tier TEXT NOT NULL,
  old_expires_at TIMESTAMPTZ,
  new_expires_at TIMESTAMPTZ,
  reason TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tier_history_user ON tier_history(user_id, changed_at DESC);

ALTER TABLE tier_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_tier_history_select" ON tier_history;
CREATE POLICY "own_tier_history_select" ON tier_history
  FOR SELECT USING (auth.uid() = user_id);

-- ── 3) La fuente única ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION resolve_effective_tier(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT g.tier, g.source, g.expires_at INTO v
  FROM tier_grants g
  WHERE g.user_id = p_user_id
    AND g.revoked_at IS NULL
    AND g.starts_at <= NOW()
    AND (g.expires_at IS NULL OR g.expires_at > NOW())
  ORDER BY
    (g.source = 'revenuecat') DESC,
    CASE g.tier WHEN 'clinician' THEN 3 WHEN 'pro' THEN 2 WHEN 'base' THEN 1 ELSE 0 END DESC,
    g.expires_at DESC NULLS FIRST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('tier', 'free', 'source', NULL, 'expires_at', NULL);
  END IF;

  RETURN jsonb_build_object('tier', v.tier, 'source', v.source, 'expires_at', v.expires_at);
END;
$$;

-- ── 4) Materializar a profiles (los lectores actuales no cambian) ─────────
CREATE OR REPLACE FUNCTION apply_effective_tier(p_user_id UUID, p_reason TEXT DEFAULT 'apply_effective_tier')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new JSONB;
  v_new_tier TEXT;
  v_new_exp TIMESTAMPTZ;
  v_old_tier TEXT;
  v_old_exp TIMESTAMPTZ;
BEGIN
  v_new := resolve_effective_tier(p_user_id);
  v_new_tier := v_new->>'tier';
  v_new_exp := (v_new->>'expires_at')::timestamptz;

  SELECT tier, tier_expires_at INTO v_old_tier, v_old_exp
  FROM profiles WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'error', 'no_profile');
  END IF;

  IF v_old_tier IS DISTINCT FROM v_new_tier OR v_old_exp IS DISTINCT FROM v_new_exp THEN
    UPDATE profiles SET tier = v_new_tier, tier_expires_at = v_new_exp
    WHERE id = p_user_id;

    INSERT INTO tier_history (user_id, old_tier, new_tier, old_expires_at, new_expires_at, reason)
    VALUES (p_user_id, v_old_tier, v_new_tier, v_old_exp, v_new_exp, p_reason);
  END IF;

  RETURN jsonb_build_object('applied', true, 'tier', v_new_tier, 'expires_at', v_new_exp);
END;
$$;

-- ── 5) Lo que consulta el cliente (nunca calcula) ─────────────────────────
CREATE OR REPLACE FUNCTION get_my_effective_tier()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_resolved JSONB;
  v_profile RECORD;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('tier', 'free', 'source', NULL, 'expires_at', NULL);
  END IF;

  v_resolved := resolve_effective_tier(v_user);

  -- Transición: perfiles con tier vigente escrito directo (RevenueCat de
  -- hoy, altas manuales previas) aún no tienen grant. Mientras los
  -- escritores migran al árbitro, un tier vigente en profiles manda si
  -- supera al resuelto. El cron solo degrada a quien YA venció.
  SELECT tier, tier_expires_at INTO v_profile
  FROM profiles WHERE id = v_user;

  IF FOUND AND v_profile.tier IS NOT NULL AND v_profile.tier <> 'free'
     AND (v_profile.tier_expires_at IS NULL OR v_profile.tier_expires_at > NOW())
     AND (CASE v_profile.tier WHEN 'clinician' THEN 3 WHEN 'pro' THEN 2 WHEN 'base' THEN 1 ELSE 0 END)
       > (CASE v_resolved->>'tier' WHEN 'clinician' THEN 3 WHEN 'pro' THEN 2 WHEN 'base' THEN 1 ELSE 0 END)
  THEN
    RETURN jsonb_build_object(
      'tier', v_profile.tier,
      'source', 'profile',
      'expires_at', v_profile.tier_expires_at
    );
  END IF;

  RETURN v_resolved;
END;
$$;

-- ── 6) Vencimiento que se aplica solo ─────────────────────────────────────
CREATE OR REPLACE FUNCTION expire_overdue_tiers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM profiles
    WHERE tier <> 'free'
      AND tier_expires_at IS NOT NULL
      AND tier_expires_at < NOW()
  LOOP
    -- apply resuelve: si queda otro grant vigente lo aplica; si no, free.
    PERFORM apply_effective_tier(r.id, 'cron_tier_expiry');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ── 7) redeem_activation_code ahora pasa por el árbitro ───────────────────
CREATE OR REPLACE FUNCTION redeem_activation_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_norm TEXT;
  v_row activation_codes%ROWTYPE;
  v_new_expires TIMESTAMPTZ;
  v_applied JSONB;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('status', 'not_authenticated');
  END IF;

  v_norm := regexp_replace(upper(COALESCE(p_code, '')), '[^A-Z0-9]', '', 'g');
  IF v_norm = '' THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT * INTO v_row
  FROM activation_codes
  WHERE regexp_replace(upper(code), '[^A-Z0-9]', '', 'g') = v_norm
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF v_row.redeemed_by @> ARRAY[v_user] THEN
    RETURN jsonb_build_object('status', 'already_redeemed', 'tier', v_row.tier);
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < NOW() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  IF v_row.used_count >= v_row.max_uses THEN
    RETURN jsonb_build_object('status', 'exhausted');
  END IF;

  v_new_expires := CASE
    WHEN v_row.duration_days IS NULL THEN NULL
    ELSE NOW() + make_interval(days => v_row.duration_days)
  END;

  INSERT INTO tier_grants (user_id, source, tier, expires_at, ref, metadata)
  VALUES (
    v_user, 'activation_code', v_row.tier, v_new_expires, v_row.code,
    jsonb_build_object('activation_code_id', v_row.id, 'code_source', v_row.source)
  );

  UPDATE activation_codes
  SET used_count = used_count + 1,
      redeemed_by = redeemed_by || v_user
  WHERE id = v_row.id;

  v_applied := apply_effective_tier(v_user, 'activation_code_redeemed');

  RETURN jsonb_build_object(
    'status', 'ok',
    'tier', COALESCE(v_applied->>'tier', v_row.tier),
    'expires_at', v_applied->'expires_at'
  );
END;
$$;

-- ── Permisos ──────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION resolve_effective_tier(UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION resolve_effective_tier(UUID) TO service_role;

REVOKE ALL ON FUNCTION apply_effective_tier(UUID, TEXT) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION apply_effective_tier(UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION expire_overdue_tiers() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION expire_overdue_tiers() TO service_role;

REVOKE ALL ON FUNCTION get_my_effective_tier() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_effective_tier() TO authenticated, service_role;

REVOKE ALL ON FUNCTION redeem_activation_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION redeem_activation_code(TEXT) TO authenticated, service_role;

-- ── Cron diario: degradar a quien venció ──────────────────────────────────
-- ⚠️ Aplicar vía MCP execute_sql (pg_cron; patrón de 156_privacy_crons.sql).
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tier-expiry-daily') THEN
    PERFORM cron.unschedule('tier-expiry-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'tier-expiry-daily',
  '0 9 * * *',  -- 09:00 UTC = 03:00 CDMX, fuera de horas de uso
  $$ SELECT expire_overdue_tiers(); $$
);

COMMENT ON TABLE tier_grants IS
  'MB-13 — otorgamientos de tier por fuente (revenuecat, código, pago web, manual). El árbitro resolve_effective_tier decide; profiles.tier es la materialización.';
COMMENT ON TABLE tier_history IS
  'MB-13 — historial de cambios efectivos de tier, con motivo. Lo alimenta apply_effective_tier.';
COMMENT ON FUNCTION resolve_effective_tier(UUID) IS
  'MB-13 — fuente única del tier efectivo. Precedencia: RevenueCat vigente > código/webhook vigente > free.';
COMMENT ON FUNCTION apply_effective_tier(UUID, TEXT) IS
  'MB-13 — materializa el tier resuelto en profiles.tier + tier_expires_at y registra el cambio en tier_history.';
COMMENT ON FUNCTION get_my_effective_tier() IS
  'MB-13 — consulta del cliente: tier efectivo del usuario autenticado. El cliente no calcula, consulta.';
COMMENT ON FUNCTION expire_overdue_tiers() IS
  'MB-13 — cron diario: re-resuelve el tier de todo perfil con tier_expires_at vencido. Sin esto, cualquier cortesía es permanente.';
