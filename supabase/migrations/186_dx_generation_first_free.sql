-- ============================================================================
-- 186 — DX F4: regalo del 1er DX (users existentes y nuevos).
--
-- Regla de negocio del swap: todo user que NUNCA ha generado un functional_dx
-- recibe su primera generación GRATIS. El cobro de H+ es server-side
-- (argos-proxy lee proton_action_costs por requestType), así que la gratuidad
-- se implementa con un action_key dedicado a costo 0: el cliente
-- (dx-engine.generateDX) manda 'dx_generation_first' cuando el user no tiene
-- ninguna versión de functional_dx, y 'dx_generation' (1000 H+, migración 175)
-- en las siguientes. getDXQuote refleja lo mismo en la UI (isFirstFree).
--
-- Idempotente (ON CONFLICT DO NOTHING — preserva overrides manuales).
-- ============================================================================

INSERT INTO proton_action_costs (action_key, cost_h_plus, description, enabled, updated_at)
VALUES
  ('dx_generation_first', 0,
   'Primera generación de Mi Diagnóstico Funcional — regalo de bienvenida (DX F4)', true, NOW())
ON CONFLICT (action_key) DO NOTHING;
