-- 093_rank_curve_and_subscription_bonus.sql — Economía: calibración final (doc económico).
--
-- (1) Reemplaza economy_rank_from_lifetime (091 usaba sqrt placeholder) por la curva REAL
--     por tramos del doc R and D/03_ECONOMIA_PROTONES_H_PLUS.md. DEBE coincidir con
--     src/services/economy/rank.ts (misma matemática por banda).
-- (2) grant_monthly_subscription_bonus: RPC service_role para que el webhook IAP futuro
--     acredite el bono mensual de 100,000 H+ ($399 sub). El "no acumula / reset por ciclo"
--     lo maneja el flujo de billing futuro (FLAG en COWORK_REPORT).
--
-- Idempotente (CREATE OR REPLACE). ⚠️ NO ejecutar aquí — `npx supabase db push` post-merge.

-- (1) Curva de rank real (tramos lineales). Bandas:
--   1-9:0-1000 · 10-29:1000-10000 · 30-49:10000-30000 · 50-79:30000-100000 · 80-99:100000-500000
CREATE OR REPLACE FUNCTION economy_rank_from_lifetime(p_lifetime int)
RETURNS int LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE lt int := GREATEST(0, COALESCE(p_lifetime, 0));
BEGIN
  IF lt >= 500000 THEN RETURN 99; END IF;
  IF lt < 1000   THEN RETURN LEAST(9,  GREATEST(1,  1  + floor(lt::numeric                / 1000  * 9 )::int)); END IF;
  IF lt < 10000  THEN RETURN LEAST(29, GREATEST(10, 10 + floor((lt - 1000)::numeric        / 9000  * 20)::int)); END IF;
  IF lt < 30000  THEN RETURN LEAST(49, GREATEST(30, 30 + floor((lt - 10000)::numeric       / 20000 * 20)::int)); END IF;
  IF lt < 100000 THEN RETURN LEAST(79, GREATEST(50, 50 + floor((lt - 30000)::numeric       / 70000 * 30)::int)); END IF;
  RETURN LEAST(99, GREATEST(80, 80 + floor((lt - 100000)::numeric / 400000 * 20)::int));
END; $$;

GRANT EXECUTE ON FUNCTION economy_rank_from_lifetime(int) TO authenticated;

-- (2) Bono mensual de suscripción (service_role; lo invoca el webhook IAP).
CREATE OR REPLACE FUNCTION grant_monthly_subscription_bonus(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM award_protons(p_user_id, 100000, 'subscription_bonus', NULL, jsonb_build_object('granted_at', now()));
END; $$;

REVOKE ALL ON FUNCTION grant_monthly_subscription_bonus(uuid) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION grant_monthly_subscription_bonus(uuid) TO service_role;
