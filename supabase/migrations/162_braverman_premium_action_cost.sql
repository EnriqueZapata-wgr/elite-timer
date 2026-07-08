-- 162_braverman_premium_action_cost.sql — Precio Braverman PREMIUM (#90, #143)
-- Rango Fable 158-199.
--
-- Doctrina H+ (confirmada Enrique 2026-07-08): features LLM caras se cobran
-- con H+ (no gate por tier). Braverman PREMIUM = 1,000 H+ (ANCLA de calibración
-- para futuros reportes premium). Costo real LLM ~$1 MXN, margen ~10×.
--
-- Idempotente (ON CONFLICT DO NOTHING para preservar overrides manuales).

INSERT INTO proton_action_costs (action_key, cost_h_plus, description, enabled, updated_at)
VALUES (
  'braverman_premium_report',
  1000,
  'Reporte PREMIUM Braverman con análisis ARGOS de proporciones y dominancias neurotransmisoras',
  true,
  NOW()
)
ON CONFLICT (action_key) DO NOTHING;
