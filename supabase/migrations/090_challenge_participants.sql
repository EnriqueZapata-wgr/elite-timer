-- 090_challenge_participants.sql — Economía Protones H+ (Parte 1.9)
-- Participación en retos (1 fila por usuario+reto). Idempotente. RLS.
-- ⚠️ NO ejecutar aquí — `npx supabase db push` post-merge.

CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  challenge_id UUID NOT NULL REFERENCES challenges(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  progress JSONB,
  prize_awarded BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, challenge_id)
);

ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- SEGURIDAD: unirse cobra H+ y el premio se paga → el usuario solo LEE. join/settle van por
-- RPC DEFINER (091). Un FOR ALL permitiría entrar sin pagar o auto-marcar prize_awarded.
DROP POLICY IF EXISTS "User manages own challenge participation" ON challenge_participants;
DROP POLICY IF EXISTS "User reads own challenge participation" ON challenge_participants;
CREATE POLICY "User reads own challenge participation" ON challenge_participants FOR SELECT USING (auth.uid() = user_id);
