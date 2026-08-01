-- 245 · MB-17 Pieza 5: la zona del cuerpo se guarda.
--
-- BodyCheck preguntaba "¿dónde lo sientes?" y tiraba la respuesta. Preguntar
-- y descartar es peor que no preguntar. Columna opcional: NULL significa que
-- el paso se saltó (el dato del usuario es sagrado: no se infiere, no se
-- rellena). Valores: las cuatro zonas de checkin-config (pecho / cabeza /
-- estomago / apagado). Sin tabla nueva, sin policy nueva: hereda el RLS de
-- emotional_checkins.

ALTER TABLE emotional_checkins
  ADD COLUMN IF NOT EXISTS body_zone TEXT;
