-- 087_proton_packages.sql — Economía Protones H+ (Parte 1.6)
-- Paquetes H+ vendibles (IAP). Valores calibrados del modelo. Idempotente.
-- ⚠️ NO ejecutar aquí — `npx supabase db push` post-merge.

CREATE TABLE IF NOT EXISTS proton_packages (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  protons BIGINT NOT NULL,
  price_mxn NUMERIC(10,2) NOT NULL,
  price_usd NUMERIC(10,2),
  bonus_percent INT DEFAULT 0,
  display_order INT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO proton_packages (sku, name, protons, price_mxn, price_usd, bonus_percent, display_order) VALUES
  ('h_plus_small',  'Paquete Chico',  100000,  99.00,  5.35, 0,  1),
  ('h_plus_medium', 'Paquete Medio',  500000,  399.00, 21.55, 20, 2),
  ('h_plus_large',  'Paquete Grande', 2000000, 1199.00, 64.80, 40, 3)
ON CONFLICT (sku) DO NOTHING;

-- Lectura pública (catálogo de tienda). Escritura solo server-side / admin.
ALTER TABLE proton_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All users read packages" ON proton_packages;
CREATE POLICY "All users read packages" ON proton_packages FOR SELECT USING (true);
