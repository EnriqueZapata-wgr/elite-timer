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

-- Fix B1 (auditoría pre-merge MB-4): costos de COMPONENTE que cobra argos-voice
-- server-side por llamada — cierran el hoyo "TTS/STT gratis con cliente modificado".
-- Un turno legítimo paga 400 (voice_turn en argos-proxy) + ~15 STT + ~5×chunks TTS;
-- Enrique calibra los tres precios con la telemetría de argos_logs (puede bajar
-- voice_turn para compensar). Si la fila no existe, la función usa un default
-- duro equivalente (nunca gratis).
INSERT INTO proton_action_costs (action_key, cost_h_plus, description, enabled, updated_at)
VALUES
  ('voice_tts', 5,
   'Síntesis de voz ElevenLabs (por chunk, cobrado en argos-voice)', true, NOW()),
  ('voice_stt', 15,
   'Transcripción de audio Gemini (por turno, cobrado en argos-voice)', true, NOW())
ON CONFLICT (action_key) DO NOTHING;
