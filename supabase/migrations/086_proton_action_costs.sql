-- 086_proton_action_costs.sql — Economía Protones H+ (Parte 1.5)
-- Config de costos H+ por acción IA (valores calibrados del modelo económico).
-- Idempotente (ON CONFLICT actualiza). ⚠️ NO ejecutar aquí — `npx supabase db push` post-merge.

CREATE TABLE IF NOT EXISTS proton_action_costs (
  action_key TEXT PRIMARY KEY,
  cost_h_plus INT NOT NULL CHECK (cost_h_plus >= 0),
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed con valores calibrados (03_ECONOMIA_PROTONES_H_PLUS.md).
INSERT INTO proton_action_costs (action_key, cost_h_plus, description) VALUES
  ('chat', 2800, 'Chat ARGOS — 1 mensaje'),
  ('food_estimate_photo', 2450, 'Análisis comida por foto'),
  ('supplement_scan', 2400, 'Escaneo etiqueta suplemento'),
  ('lab_interpretation', 1650, 'Interpretación PDF laboratorio'),
  ('routine', 1650, 'Generación rutina personalizada'),
  ('food_estimate_text', 1550, 'Análisis comida por texto'),
  ('insight', 450, 'Insight diario'),
  ('weekly_insight', 400, 'Insight semanal')
ON CONFLICT (action_key) DO UPDATE SET cost_h_plus = EXCLUDED.cost_h_plus, updated_at = NOW();

-- Lectura pública (los costos no son secretos; el cliente hace pre-flight check).
ALTER TABLE proton_action_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All users read action costs" ON proton_action_costs;
CREATE POLICY "All users read action costs" ON proton_action_costs FOR SELECT USING (true);
