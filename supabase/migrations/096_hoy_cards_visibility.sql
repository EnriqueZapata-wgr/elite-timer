-- 096_hoy_cards_visibility.sql — Visibilidad de cards del HOY (toggle ON/OFF por usuario).
--
-- Cada usuario puede ocultar/mostrar cards editoriales del tab HOY desde /protocol-config.
-- Se guarda como array JSONB de cardKeys VISIBLES en client_profiles. Default = todas visibles
-- (mismo orden que HOY_CARD_ORDER_DEFAULT en src/constants/hoy-cards.ts).
--
-- Idempotente (IF NOT EXISTS). ⚠️ NO ejecutar aquí — `npx supabase db push` post-merge (Enrique audita).

ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS hoy_cards_visible JSONB
  DEFAULT '["hero_agenda","uv","checkin","proteina","agua","luz_solar","meditacion","suplementos","bano_frio","grounding","fuerza","breathwork","lentes_rojos","cardio","pasos"]'::jsonb;
