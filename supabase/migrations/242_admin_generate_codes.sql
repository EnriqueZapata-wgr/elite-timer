-- MB-13 · PIEZA 4 — Emitir códigos sin abrir la base
--
-- generate_activation_codes: RPC de admin que genera lotes y devuelve la
-- lista. Gate server-side por profiles.role = 'admin' (la lista de UUIDs de
-- admin-config.ts es solo UX; la autoridad es esta columna).
-- Fuera de alcance: pantalla de administración. El RPC basta.
-- Idempotente.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1) profiles.role: autorización, separada del tier (que es suscripción) ─
-- ⚠️ DRIFT verificado en remoto (2026-07-29): profiles.role YA existe como
-- enum user_role (admin/coach/nutritionist/assistant/client, default
-- 'client', nullable) sin migración que lo versione. En remoto este bloque
-- es no-op; el ADD COLUMN TEXT aplica solo en entornos limpios. El gate de
-- abajo compara el valor textual, válido en ambos mundos.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
      CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

-- Admin actual (mismo UUID que src/constants/admin-config.ts).
UPDATE profiles SET role = 'admin'
WHERE id = '90a55e74-0e3d-477a-9ac5-2b339f7c40af'
  AND (role IS NULL OR role::text <> 'admin');

-- Las policies de UPDATE de profiles no restringen columnas: sin esto,
-- cualquier usuario podría auto-asignarse role='admin'. El trigger corta
-- el cambio cuando viene de un JWT de cliente (authenticated/anon);
-- service_role y el SQL editor no se bloquean.
CREATE OR REPLACE FUNCTION protect_profiles_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '')
         IN ('authenticated', 'anon')
  THEN
    RAISE EXCEPTION 'profiles.role no puede modificarse desde el cliente';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_role ON profiles;
CREATE TRIGGER trg_protect_profiles_role
  BEFORE UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profiles_role();

-- ── 2) El RPC de lotes ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_activation_codes(
  p_count INT,
  p_tier TEXT,
  p_duration_days INT DEFAULT NULL,
  p_source TEXT DEFAULT 'cortesia',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_role TEXT;
  v_codes TEXT[] := '{}';
  v_code TEXT;
  v_alphabet CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes BYTEA;
  v_part TEXT;
  i INT;
  j INT;
  v_attempts INT;
BEGIN
  -- Gate de admin. auth.uid() nulo = llamada service_role (permitida).
  -- role::text cubre ambos mundos: enum user_role (remoto) o TEXT (limpio).
  IF v_caller IS NOT NULL THEN
    SELECT role::text INTO v_role FROM profiles WHERE id = v_caller;
    IF COALESCE(v_role, 'client') <> 'admin' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
    END IF;
  END IF;

  IF p_count IS NULL OR p_count < 1 OR p_count > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_count');
  END IF;
  IF p_tier IS NULL OR p_tier NOT IN ('base', 'pro', 'clinician') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tier');
  END IF;
  IF p_duration_days IS NOT NULL AND p_duration_days < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_duration');
  END IF;
  IF p_source IS NULL OR p_source NOT IN ('founder', 'afiliado', 'cortesia', 'soporte') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_source');
  END IF;

  FOR i IN 1..p_count LOOP
    v_attempts := 0;
    LOOP
      v_attempts := v_attempts + 1;
      -- 8 caracteres del alfabeto legible (sin 0/O ni 1/I/L), ATP-XXXX-XXXX.
      v_bytes := gen_random_bytes(8);
      v_part := '';
      FOR j IN 0..7 LOOP
        v_part := v_part || substr(v_alphabet, (get_byte(v_bytes, j) % length(v_alphabet)) + 1, 1);
      END LOOP;
      v_code := 'ATP-' || substr(v_part, 1, 4) || '-' || substr(v_part, 5, 4);

      BEGIN
        INSERT INTO activation_codes (code, tier, duration_days, max_uses, expires_at, source)
        VALUES (v_code, p_tier, p_duration_days, 1, p_expires_at, p_source);
        v_codes := v_codes || v_code;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Colisión (rarísima con 30^8): reintenta con otro código.
        IF v_attempts >= 5 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'code_generation_collision');
        END IF;
      END;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'count', p_count,
    'tier', p_tier,
    'source', p_source,
    'codes', to_jsonb(v_codes)
  );
END;
$$;

REVOKE ALL ON FUNCTION generate_activation_codes(INT, TEXT, INT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION generate_activation_codes(INT, TEXT, INT, TEXT, TIMESTAMPTZ) TO authenticated, service_role;

COMMENT ON FUNCTION generate_activation_codes(INT, TEXT, INT, TEXT, TIMESTAMPTZ) IS
  'MB-13 — genera lotes de códigos de activación de un uso. Gate: profiles.role = admin (o service_role). Devuelve la lista de códigos.';
COMMENT ON COLUMN profiles.role IS
  'Autorización (enum user_role en remoto: admin/coach/nutritionist/assistant/client), separada de tier que es suscripción. MB-13: protegida por trg_protect_profiles_role; generate_activation_codes exige admin.';
