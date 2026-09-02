-- ============================================================================
-- 313 - fasting_logs: el fin va despues del inicio (guardia de esquema).
-- (Backlog 15.3, noche del 30 al 31 de agosto de 2026.)
--
-- Contexto: breakFast / cancelActiveFast / autoCloseAtLimit actualizaban por id
-- sin filtrar por estado, asi que un segundo cierre pisaba fast_end y
-- actual_hours de un ayuno ya cerrado. El codigo ya filtra status = 'active'
-- (fasting-service.ts). Esto es la red de abajo: la base no acepta un fin
-- anterior o igual al inicio, venga de donde venga.
--
-- Estado remoto al escribir esto: fasting_logs = 59 filas, 3 usuarios.
-- Hay UNA fila con fast_end < fast_start (2026-04-09, 0 h). Por eso el CHECK
-- entra NOT VALID: no valida lo existente, solo lo nuevo. NINGUNA fila se toca
-- aqui. La limpieza de esa fila y de las otras cuatro raras esta PROPUESTA en
-- R and D/PROPUESTA_LIMPIEZA_FASTING_LOGS_2026-08-31.md y la decide Enrique.
--
-- Idempotente: si la constraint ya existe, no hace nada.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fasting_logs_fin_despues_de_inicio'
      AND conrelid = 'public.fasting_logs'::regclass
  ) THEN
    ALTER TABLE public.fasting_logs
      ADD CONSTRAINT fasting_logs_fin_despues_de_inicio
      CHECK (fast_end IS NULL OR fast_start IS NULL OR fast_end > fast_start)
      NOT VALID;
  END IF;
END $$;
