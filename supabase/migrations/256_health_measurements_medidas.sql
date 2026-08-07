-- 256 · MB-27 Pieza 1 — Medidas corporales en la tabla canónica del usuario.
--
-- Dictamen (brief 1.1): health_measurements ES la canónica de composición
-- del usuario final — es la que él llena (onboarding, /health-input,
-- /edad-atp/composition), la única con UNIQUE(user_id, date) y la que
-- alimenta Edad ATP y el score. Se le agregan las tres medidas que solo
-- tenía body_measurements: brazo, pierna y pecho.
--
-- body_measurements NO se tumba ni se migra: es el panel clínico del coach
-- (measured_by, fotos, otra policy) — otro dominio, otro dueño.
-- edad_atp_body_composition queda como estaba (fallback muerto; retirarla
-- es otra decisión y no de esta migración).
--
-- Idempotente. RLS ya existe en la tabla (mig 030). db push ANTES del OTA.

ALTER TABLE health_measurements ADD COLUMN IF NOT EXISTS arm_cm DECIMAL(5,1);
ALTER TABLE health_measurements ADD COLUMN IF NOT EXISTS leg_cm DECIMAL(5,1);
ALTER TABLE health_measurements ADD COLUMN IF NOT EXISTS chest_cm DECIMAL(5,1);

NOTIFY pgrst, 'reload schema';
