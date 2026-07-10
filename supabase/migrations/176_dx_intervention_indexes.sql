-- ============================================================================
-- 176 — Índices de performance restantes para DX + Intervenciones.
-- Rango Fable 150-199. Depende de 173.
--
-- Los índices de acceso caliente ya viven inline en sus tablas (170-174):
--   functional_dx (current, user+version), user_interventions (user+status+prio),
--   intervention_completions (user+date), padecimiento_episodios (ped+started),
--   clinical_symptoms_aislados (user+logged). Aquí solo el faltante real:
--   listar padecimientos por usuario.
--
-- Idempotente.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_padecimientos_user
  ON padecimientos (user_id, created_at DESC);
