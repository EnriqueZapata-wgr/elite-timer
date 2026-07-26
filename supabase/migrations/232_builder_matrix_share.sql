-- 232_builder_matrix_share.sql · MB-5 Bloque 2
--
-- 2.1 · blocks.matrix_slug: el constructor ahora asigna ejercicios de
--       exercise_matrix; el slug traza el bloque al catálogo (clip, métodos,
--       benchmark de edad — todo hereda de ahí).
-- 2.2 · clone_routine copiaba los bloques con lista explícita SIN exercise_id
--       (ni suggested_rest_seconds) y la rutina SIN mode → clonar un share
--       PERDÍA los ejercicios y convertía la rutina en timer. Verificado
--       contra pg_get_functiondef del remoto 2026-07-26. Se reescribe
--       copiando mode + exercise_id + suggested_rest_seconds + matrix_slug.
-- 2.3 · routines.archived_at: la limpieza de "Mis rutinas" ARCHIVA (reversible),
--       no borra por default.
--
-- Idempotente (ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE). Tablas
-- existentes con RLS ya habilitada — sin policies nuevas.

ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS matrix_slug text;
COMMENT ON COLUMN public.blocks.matrix_slug IS
  'Traza al catálogo exercise_matrix (MB-5 2.1): clip, métodos ATP y benchmark heredan de ahí.';

ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS archived_at timestamptz;
COMMENT ON COLUMN public.routines.archived_at IS
  'Limpieza MB-5 2.3: rutina archivada (oculta de Mis rutinas, recuperable). NULL = activa.';

-- clone_routine v2 — copia completa (mismo SECURITY DEFINER + search_path que
-- dejó MB-SEC-1; misma firma, solo cambia el cuerpo).
CREATE OR REPLACE FUNCTION public.clone_routine(
  p_source_routine_id uuid,
  p_new_creator_id uuid,
  p_new_name text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_routine_id UUID;
  v_block_map JSONB := '{}'::jsonb;
  v_block RECORD;
  v_new_block_id UUID;
  v_new_parent_id UUID;
BEGIN
  INSERT INTO routines (creator_id, name, description, category, tags, mode)
  SELECT
    p_new_creator_id,
    COALESCE(p_new_name, name || ' (copia)'),
    description, category, tags, mode
  FROM routines WHERE id = p_source_routine_id
  RETURNING id INTO v_new_routine_id;

  FOR v_block IN
    WITH RECURSIVE tree AS (
      SELECT *, 0 AS depth FROM blocks
      WHERE routine_id = p_source_routine_id AND parent_block_id IS NULL
      UNION ALL
      SELECT b.*, t.depth + 1 FROM blocks b
      JOIN tree t ON b.parent_block_id = t.id
      WHERE b.routine_id = p_source_routine_id
    )
    SELECT * FROM tree ORDER BY depth, sort_order
  LOOP
    v_new_parent_id := CASE
      WHEN v_block.parent_block_id IS NULL THEN NULL
      ELSE (v_block_map->>v_block.parent_block_id::text)::uuid
    END;

    INSERT INTO blocks (
      routine_id, parent_block_id, sort_order, type, label,
      duration_seconds, rounds, rest_between_seconds,
      color, sound_start, sound_end, notes,
      exercise_id, suggested_rest_seconds, matrix_slug
    ) VALUES (
      v_new_routine_id, v_new_parent_id, v_block.sort_order, v_block.type, v_block.label,
      v_block.duration_seconds, v_block.rounds, v_block.rest_between_seconds,
      v_block.color, v_block.sound_start, v_block.sound_end, v_block.notes,
      v_block.exercise_id, v_block.suggested_rest_seconds, v_block.matrix_slug
    ) RETURNING id INTO v_new_block_id;

    v_block_map := v_block_map || jsonb_build_object(v_block.id::text, v_new_block_id::text);
  END LOOP;

  RETURN v_new_routine_id;
END;
$function$;
