-- ============================================================================
-- 195 — RPC transaccional create_dx_version() (Megabuzón 2da pasada B.3).
--
-- Problema: dx-engine.ts persistía la versión nueva con 2 statements NO
-- transaccionales (UPDATE is_current=false + INSERT is_current=true). Bajo
-- concurrencia rara (doble-tap simultáneo desde 2 devices) ambos clientes
-- calculan el mismo MAX(version)+1 y/o ambos insertan vigente → el índice
-- parcial único idx_functional_dx_current (170) rechaza el segundo insert y
-- el user ve error tras haber pagado la llamada LLM.
--
-- Fix: una sola función que serializa por usuario con pg_advisory_xact_lock
-- (el lock muere solo al terminar la transacción — sin unlock manual) y hace
-- UPDATE + MAX+1 + INSERT atómicos.
--
-- Seguridad: SECURITY INVOKER — corre como el usuario autenticado, RLS de 170
-- aplica intacta ("Users manage own functional dx"). user_id sale de
-- auth.uid(), NUNCA de parámetro (no spoofeable). generated_by/quality_level
-- los validan los CHECK de la tabla.
--
-- Idempotente (CREATE OR REPLACE). ⚠️ NO aplicar al remoto desde la rama —
-- Enrique corre `npx supabase db push` tras merge + audit Cowork (regla #12).
-- ============================================================================

CREATE OR REPLACE FUNCTION create_dx_version(
  p_quality_level SMALLINT,
  p_roots_detected JSONB,
  p_summary_text TEXT,
  p_sources_snapshot JSONB,
  p_generated_by TEXT DEFAULT 'argos_auto',
  p_model TEXT DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_version INT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Serializa regeneraciones concurrentes DEL MISMO usuario (doble-tap /
  -- 2 devices). hashtextextended evita colisiones razonablemente y el lock
  -- se libera solo al commit/rollback.
  PERFORM pg_advisory_xact_lock(hashtextextended('functional_dx:' || v_user::text, 0));

  -- 1) baja la vigente (si existe)…
  UPDATE functional_dx SET is_current = false
  WHERE user_id = v_user AND is_current;

  -- 2) …calcula la versión siguiente ya en serie…
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM functional_dx WHERE user_id = v_user;

  -- 3) …e inserta la nueva vigente. Todo o nada.
  INSERT INTO functional_dx
    (user_id, version, quality_level, roots_detected, summary_text,
     sources_snapshot, generated_by, model, is_current)
  VALUES
    (v_user, v_version, p_quality_level,
     COALESCE(p_roots_detected, '[]'::jsonb), p_summary_text,
     COALESCE(p_sources_snapshot, '{}'::jsonb), p_generated_by, p_model, true);

  RETURN v_version;
END;
$$;

-- Higiene de permisos: solo usuarios autenticados (anon no tiene DX).
REVOKE ALL ON FUNCTION create_dx_version(SMALLINT, JSONB, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_dx_version(SMALLINT, JSONB, TEXT, JSONB, TEXT, TEXT) TO authenticated;
