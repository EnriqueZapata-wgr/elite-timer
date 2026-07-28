-- ============================================================================
-- 238 — PUERTA DE ENTRADA DEL CHECK-IN (MB-10 · Track E)
--
-- El módulo de emociones tiene ahora CUATRO puertas (rueda · cuerpo · mapa ·
-- búsqueda) más el re-check-in corto tras una herramienta ('recheck', Track F).
-- Todas escriben EL MISMO registro (emotional_checkins); esta columna solo
-- etiqueta por dónde se llegó a la palabra. Responde algo que ninguna app
-- puede: ¿la gente que entra por el cuerpo termina en emociones distintas que
-- la que entra por la rueda? Y con el tiempo, qué puerta conviene por default.
--
-- La estadística de MB-9 NO se duplica ni se reescribe: mismo log, un campo más.
-- NULL = check-ins históricos (previos a las puertas). Idempotente.
-- ============================================================================

ALTER TABLE emotional_checkins ADD COLUMN IF NOT EXISTS entry_gate TEXT;

DO $$ BEGIN
  ALTER TABLE emotional_checkins
    ADD CONSTRAINT emotional_checkins_entry_gate_check
    CHECK (entry_gate IS NULL OR entry_gate IN ('rueda', 'cuerpo', 'mapa', 'busqueda', 'recheck'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
