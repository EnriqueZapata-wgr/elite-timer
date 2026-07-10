-- ============================================================================
-- 175 — Costos H+ de los flujos ARGOS nuevos. Rango Fable 150-199.
--
-- Consolidado en UNA migración para que las ramas F2 (DX) y SUPS (BHA) no
-- colisionen editando proton_action_costs por separado (decisión aprobada).
--
-- dx_generation: actualización manual de Mi Diagnóstico Funcional. Alineado al
--   ancla braverman_premium_report = 1000 H+ (llamada LLM multi-fuente real).
--   Pro: auto/gratis · Base: 1000 H+ con cache (no cobra si no hay dato nuevo).
-- intervention_rationale: narrativa opcional "por qué estas intervenciones"
--   (el match es determinístico; ARGOS solo explica). ≈ costo de chat.
-- bha_scan: escaneo Biohacker Approved (OCR + criterios Mariana, multimodal).
--   500-1000 H+ → 800. Se usa en el sprint SUPS.
--
-- Idempotente (ON CONFLICT DO NOTHING — preserva overrides manuales).
-- ============================================================================

INSERT INTO proton_action_costs (action_key, cost_h_plus, description, enabled, updated_at)
VALUES
  ('dx_generation', 1000,
   'Actualización de Mi Diagnóstico Funcional (síntesis ARGOS multi-fuente)', true, NOW()),
  ('intervention_rationale', 280,
   'Explicación ARGOS de por qué se sugieren estas intervenciones', true, NOW()),
  ('bha_scan', 800,
   'Escaneo Biohacker Approved (BHA) de suplemento — OCR + criterios funcionales vía ARGOS multimodal', true, NOW())
ON CONFLICT (action_key) DO NOTHING;
