-- ============================================================================
-- 206 — Costo H+ de un turno de VOZ de ARGOS (MB-4 J5).
-- Voz = STT Gemini + LLM + TTS ElevenLabs → la interacción más cara. Precio
-- inicial 400 H+ (chat 280 + prima de voz); Enrique lo calibra con la telemetría
-- de argos_logs del día 1. El cobro real es server-side (argos-proxy lee esta
-- tabla por requestType='voice_turn').
-- ⚠️ NO EJECUTAR AUTOMÁTICAMENTE — Enrique la corre con `npx supabase db push` (regla #12).
-- Idempotente (ON CONFLICT DO NOTHING: no pisa un override manual de precio).
-- ============================================================================

INSERT INTO proton_action_costs (action_key, cost_h_plus, description, enabled, updated_at)
VALUES
  ('voice_turn', 400,
   'Turno de voz con ARGOS (STT + LLM + TTS)', true, NOW())
ON CONFLICT (action_key) DO NOTHING;
