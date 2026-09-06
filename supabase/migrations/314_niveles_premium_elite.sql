-- 314_niveles_premium_elite.sql
-- Fecha: 2026-09-04. Referencia: PIVOTE_ATP_3.0_2026-09-04.md (Parte 2.3
-- punto 1 y 2.5) y RUTA_A_ATP_3.0.md paso 1.1.
--
-- Por que: ATP 3.0 tiene tres niveles (free, premium, elite) dentro de una
-- sola app. Hoy el CHECK de profiles.tier (migracion 103) sigue en
-- free/base/pro/clinician, asi que canjear un codigo 'premium' reventaria
-- en apply_effective_tier. tier_grants y activation_codes ya aceptan
-- 'premium' desde la 290; solo les falta 'elite'. Ademas los dos CASE del
-- arbitro (resolve_effective_tier de la 240 y get_effective_tier de la 262)
-- mandan 'premium' al ELSE 0 y ordenan por fuente antes que por rango:
-- un Elite con Pro en tienda se resolveria a Pro mientras viva la
-- suscripcion. Aqui el rango decide primero y revenuecat solo desempata.
--
-- Escalera de rango del arbitro (ambos CASE, identicos):
--   elite = 4, clinician = 3, pro = 2, premium = 2, base = 1, otro = 0.
--   premium y pro comparten peldano porque la membresia unica (290) los
--   hizo equivalentes; elite va arriba de clinician porque Elite es suma
--   sobre Premium, nunca recorte.
--
-- Caso documentado "Elite con Pro en tienda se queda Elite": un usuario con
-- un grant activation_code tier elite y un grant revenuecat tier pro
-- resuelve elite (rango 4 > 2). Antes, revenuecat iba primero en el ORDER BY
-- y ganaba pro. Entre grants del mismo rango sigue ganando revenuecat, y
-- luego el expires_at mas lejano (NULL = sin vencimiento, va primero).
--
-- No se toca: get_my_effective_tier (delega en get_effective_tier desde la
-- 262), apply_effective_tier y expire_overdue_tiers (no tienen CASE propio).
-- No se escribe ninguna fila: dato del usuario sagrado. Los 13 perfiles de
-- prueba no reciben grant (ruta 1.4, eliminado el 4 de septiembre).
--
-- Idempotente: DROP CONSTRAINT IF EXISTS + ADD y CREATE OR REPLACE.
-- Se aplica con npx supabase db push (Enrique), nunca desde Cowork.

BEGIN;

-- 1. CHECK de niveles: premium y elite entran; los valores viejos se
--    conservan porque hay filas con esos valores (base/pro/clinician).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_tier_check
  CHECK (tier IN ('free', 'base', 'pro', 'clinician', 'premium', 'elite'));

ALTER TABLE public.tier_grants DROP CONSTRAINT IF EXISTS tier_grants_tier_check;
ALTER TABLE public.tier_grants ADD CONSTRAINT tier_grants_tier_check
  CHECK (tier IN ('base', 'pro', 'clinician', 'premium', 'elite'));

ALTER TABLE public.activation_codes DROP CONSTRAINT IF EXISTS activation_codes_tier_check;
ALTER TABLE public.activation_codes ADD CONSTRAINT activation_codes_tier_check
  CHECK (tier IN ('base', 'pro', 'clinician', 'premium', 'elite'));

-- 2. Origen del codigo: 'elite' identifica los codigos que Enrique emite
--    para clientes del programa ATP Elite (venta personal, nunca tienda).
ALTER TABLE public.activation_codes DROP CONSTRAINT IF EXISTS activation_codes_source_check;
ALTER TABLE public.activation_codes ADD CONSTRAINT activation_codes_source_check
  CHECK (source IN ('founder', 'afiliado', 'cortesia', 'soporte', 'web_payment', 'elite'));

-- 3. Arbitro: resolve_effective_tier (cuerpo de la 240; cambia solo el
--    ORDER BY: rango primero, revenuecat como desempate, expires_at lejano).
CREATE OR REPLACE FUNCTION public.resolve_effective_tier(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- 2026-09-04 (314): el rango decide primero. Antes revenuecat iba
    -- primero y un Elite con Pro en tienda se quedaba en Pro.
    CASE g.tier
      WHEN 'elite' THEN 4
      WHEN 'clinician' THEN 3
      WHEN 'pro' THEN 2
      WHEN 'premium' THEN 2
      WHEN 'base' THEN 1
      ELSE 0
    END DESC,
    (g.source = 'revenuecat') DESC,
    g.expires_at DESC NULLS FIRST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('tier', 'free', 'source', NULL, 'expires_at', NULL);
  END IF;

  RETURN jsonb_build_object('tier', v.tier, 'source', v.source, 'expires_at', v.expires_at);
END;
$function$;

-- 4. Arbitro: get_effective_tier (cuerpo de la 262; cambian solo los dos
--    CASE de la regla de transicion para conocer premium y elite).
CREATE OR REPLACE FUNCTION public.get_effective_tier(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_resolved JSONB;
  v_profile RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('tier', 'free', 'source', NULL, 'expires_at', NULL);
  END IF;

  v_resolved := resolve_effective_tier(p_user_id);

  -- Transicion (misma regla que get_my_effective_tier de 240): un tier
  -- vigente escrito directo en profiles (RevenueCat de hoy, altas manuales)
  -- manda si supera al resuelto. Honra tier_expires_at: un tier vencido
  -- NUNCA gana (el proxy antes lo ignoraba: ese era el bug).
  -- 2026-09-04 (314): la escalera conoce premium (2) y elite (4); antes
  -- ambos caian al ELSE 0.
  SELECT tier, tier_expires_at INTO v_profile
  FROM profiles WHERE id = p_user_id;

  IF FOUND AND v_profile.tier IS NOT NULL AND v_profile.tier <> 'free'
     AND (v_profile.tier_expires_at IS NULL OR v_profile.tier_expires_at > NOW())
     AND (CASE v_profile.tier
            WHEN 'elite' THEN 4 WHEN 'clinician' THEN 3 WHEN 'pro' THEN 2
            WHEN 'premium' THEN 2 WHEN 'base' THEN 1 ELSE 0 END)
       > (CASE v_resolved->>'tier'
            WHEN 'elite' THEN 4 WHEN 'clinician' THEN 3 WHEN 'pro' THEN 2
            WHEN 'premium' THEN 2 WHEN 'base' THEN 1 ELSE 0 END)
  THEN
    RETURN jsonb_build_object(
      'tier', v_profile.tier,
      'source', 'profile',
      'expires_at', v_profile.tier_expires_at
    );
  END IF;

  RETURN v_resolved;
END;
$function$;

-- 5. Privilegios: CREATE OR REPLACE conserva los existentes; se reafirman
--    por si la funcion se recrea en un entorno limpio (mismos de 240 y 262).
REVOKE ALL ON FUNCTION public.resolve_effective_tier(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_effective_tier(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_effective_tier(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_effective_tier(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_effective_tier(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_effective_tier(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_effective_tier(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_tier(uuid) TO service_role;

COMMIT;
