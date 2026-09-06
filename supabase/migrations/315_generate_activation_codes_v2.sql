-- 315_generate_activation_codes_v2.sql
-- Fecha: 2026-09-04. Referencia: PIVOTE_ATP_3.0_2026-09-04.md (Parte 2.4,
-- "Enrique genera el codigo") y RUTA_A_ATP_3.0.md paso 1.2.
--
-- Por que: la RPC generate_activation_codes de la 242 solo acepta tier
-- base/pro/clinician y source founder/afiliado/cortesia/soporte, y no recibe
-- issued_to_email. Con eso ni los codigos Founders (premium) ni los codigos
-- Elite pueden emitirse. Esta version acepta premium y elite, el source
-- elite (y web_payment, que la 239 ya permite en la tabla) y escribe
-- issued_to_email para saber a quien se le entrego cada codigo.
--
-- Firma nueva: (p_count, p_tier, p_duration_days, p_source, p_expires_at,
-- p_issued_to_email). Como cambia la firma, la vieja de cinco argumentos se
-- elimina con DROP FUNCTION IF EXISTS (CREATE OR REPLACE crearia una
-- sobrecarga y PostgREST no sabria cual llamar). El DROP borra los GRANT,
-- asi que se reafirman abajo tal como estaban en la 242: EXECUTE para
-- authenticated (el gate role='admin' vive dentro) y service_role.
--
-- Lo que NO cambia (documentado en la 242): el gate role='admin' y la
-- tolerancia a auth.uid() NULL (llamada de servicio). Se conserva
-- max_uses = 1 y el formato ATP-XXXX-XXXX.
--
-- Idempotente: DROP IF EXISTS de la firma vieja es no-op la segunda vez y
-- CREATE OR REPLACE reemplaza la nueva.

BEGIN;

DROP FUNCTION IF EXISTS public.generate_activation_codes(integer, text, integer, text, timestamptz);

CREATE OR REPLACE FUNCTION public.generate_activation_codes(
  p_count integer,
  p_tier text,
  p_duration_days integer DEFAULT NULL,
  p_source text DEFAULT 'cortesia',
  p_expires_at timestamptz DEFAULT NULL,
  p_issued_to_email text DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
-- 2026-09-04: 'extensions' porque en produccion pgcrypto (gen_random_bytes) vive en ese esquema;
-- con solo 'public' la funcion revienta al generar el primer codigo (hallazgo del revisor en frio).
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_role TEXT;
  v_codes TEXT[] := '{}';
  v_code TEXT;
  v_alphabet CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes BYTEA;
  v_part TEXT;
  v_email TEXT;
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
  -- 2026-09-04 (315): premium (membresia unica, 290) y elite (pivote 3.0).
  IF p_tier IS NULL OR p_tier NOT IN ('base', 'pro', 'clinician', 'premium', 'elite') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tier');
  END IF;
  IF p_duration_days IS NOT NULL AND p_duration_days < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_duration');
  END IF;
  -- 2026-09-04 (315): source elite (venta personal de Enrique) y web_payment
  -- (ya valido en el CHECK de la 239). Misma lista que el CHECK de la 314.
  IF p_source IS NULL OR p_source NOT IN ('founder', 'afiliado', 'cortesia', 'soporte', 'web_payment', 'elite') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_source');
  END IF;

  -- Correo normalizado (minusculas, sin espacios); vacio = NULL. Es dato
  -- informativo: redeem_activation_code no lo compara con el canjeador.
  v_email := NULLIF(lower(btrim(p_issued_to_email)), '');
  IF v_email IS NOT NULL AND position('@' IN v_email) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_email');
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
        INSERT INTO activation_codes (code, tier, duration_days, max_uses, expires_at, source, issued_to_email)
        VALUES (v_code, p_tier, p_duration_days, 1, p_expires_at, p_source, v_email);
        v_codes := v_codes || v_code;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Colision (rarisima con 30^8): reintenta con otro codigo.
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
    'issued_to_email', v_email,
    'codes', to_jsonb(v_codes)
  );
END;
$function$;

-- Privilegios como en la 242 (routine_privileges en produccion el
-- 2026-09-04: authenticated, service_role, postgres).
REVOKE ALL ON FUNCTION public.generate_activation_codes(integer, text, integer, text, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_activation_codes(integer, text, integer, text, timestamptz, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_activation_codes(integer, text, integer, text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_activation_codes(integer, text, integer, text, timestamptz, text) TO service_role;

COMMIT;
