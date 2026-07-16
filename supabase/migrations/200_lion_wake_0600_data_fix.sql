-- 200: León despierta 06:00 (doctrina Sprint 1.5) — data fix de valores MACHINE.
-- El default v1 (05:30) lo escribió el quiz en user_chronotype y vive también en
-- quiz_templates.scoring_logic. Dentro de la tolerancia de 60 min jamás snapea,
-- así que se corrige en la fuente. Solo se tocan filas con el fingerprint exacto
-- del default machine (wake 05:30 en león) — un wake editado a mano no matchea.
-- Idempotente: re-ejecutar no cambia nada (los WHERE dejan de matchear).

-- 1) Template del quiz v1 (fuente de futuros writes del cliente viejo).
UPDATE quiz_templates
SET scoring_logic = jsonb_set(
      jsonb_set(scoring_logic, '{chronotype_schedules,lion,wake_time}', '"06:00"'),
      '{chronotype_schedules,lion,peak_physical_start}', '"06:30"'
    )
WHERE scoring_logic ? 'chronotype_schedules'
  AND scoring_logic->'chronotype_schedules'->'lion'->>'wake_time' = '05:30';

-- 2) Filas machine existentes: leones con el default viejo exacto.
UPDATE user_chronotype
SET wake_time = '06:00:00',
    peak_physical_start = CASE
      WHEN peak_physical_start = '06:00:00' THEN '06:30:00'
      ELSE peak_physical_start
    END,
    updated_at = now()
WHERE chronotype = 'lion'
  AND wake_time = '05:30:00';
