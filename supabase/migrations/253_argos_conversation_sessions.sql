-- ============================================================
-- Migración 253 · MB-21 Pieza 2: ancla de sesión en conversaciones ARGOS
--
-- Regla nueva: una sesión de app es una conversación. El cliente guarda en
-- cada conversación la sesión que la creó/retomó; autoLoadRecent solo retoma
-- la conversación más reciente si pertenece a la sesión actual.
--
-- ORDEN: db push ANTES del OTA — el cliente nuevo escribe session_id en cada
-- save; sin la columna, el insert/update de conversaciones falla (400).
--
-- Idempotente. RLS: argos_conversations ya tiene RLS + policy "Users own
-- argos_conversations" (050); una columna nueva queda cubierta por la misma
-- policy por fila. Se re-asegura el enable por regla de la casa (no-op).
-- ============================================================

ALTER TABLE argos_conversations
  ADD COLUMN IF NOT EXISTS session_id UUID;

ALTER TABLE argos_conversations ENABLE ROW LEVEL SECURITY;

-- El lookup de autoLoadRecent es (user_id, updated_at DESC) — ya indexado en
-- 050. Este índice cubre el ancla: "las conversaciones de esta sesión".
CREATE INDEX IF NOT EXISTS idx_argos_conv_user_session
  ON argos_conversations(user_id, session_id);
