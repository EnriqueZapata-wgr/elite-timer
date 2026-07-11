-- ============================================================================
-- 189 — Costo H+ del scanner BHA fijado en 500 (Sprint SUPS+BHA, Bloque 4).
-- Rango Fable 150-199.
--
-- CONTEXTO (investigado): la migración 175 YA seedeó 'bha_scan' a 800 H+ como
-- estimado provisional ("500-1000 → 800") con ON CONFLICT DO NOTHING. La
-- decisión cerrada del sprint es 500 H+ — un DO NOTHING aquí sería no-op donde
-- 175 ya corrió, dejando el precio provisional. Por eso este seed usa
-- DO UPDATE: fija 500 y re-habilita la acción.
--
-- ⚠️ Si Enrique/Cowork ya hicieron un override manual de precio en prod,
--    este UPDATE lo pisa — avisado en el reporte del sprint.
-- "Gratis Pro" queda como decisión abierta de Enrique (NO implementado; el
-- cobro server-side del argos-proxy lee esta tabla por requestType).
--
-- Idempotente. NO aplicar al remoto desde la rama (regla #12).
-- ============================================================================

INSERT INTO proton_action_costs (action_key, cost_h_plus, description, enabled, updated_at)
VALUES
  ('bha_scan', 500,
   'Escaneo Biohacker Approved (BHA) — análisis de etiqueta', true, NOW())
ON CONFLICT (action_key) DO UPDATE
  SET cost_h_plus = 500,
      description = EXCLUDED.description,
      enabled = true,
      updated_at = NOW();
