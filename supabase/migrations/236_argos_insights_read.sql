-- 236_argos_insights_read.sql — MB-7 Track F (#2)
--
-- El contador de no-leídos del HOY (notifications-service.countUnreadNotifications)
-- filtra argos_daily_insights por read = false, pero la columna NUNCA existió:
-- el safeCount silenciaba el 400 a 0 y los insights de ARGOS jamás contaban en
-- la campana. VERIFICADO contra el remoto 2026-07-26 (columnas: id, user_id,
-- date, insight, created_at).
--
-- Aditiva e idempotente; default false = todo insight nuevo cuenta como no
-- leído hasta que la UI lo marque. NO aplicar con db push desde esta rama —
-- Cowork audita primero.

ALTER TABLE argos_daily_insights
  ADD COLUMN IF NOT EXISTS read boolean NOT NULL DEFAULT false;
