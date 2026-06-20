-- 048 — Cycle companion mode + energy/mood/libido columns

CREATE TABLE IF NOT EXISTS cycle_companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  companion_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cycle_companions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages companions" ON cycle_companions FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Companion reads active" ON cycle_companions FOR SELECT USING (auth.uid() = companion_id AND status = 'active');

CREATE INDEX IF NOT EXISTS idx_cycle_companions_code ON cycle_companions(invite_code) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_cycle_companions_companion ON cycle_companions(companion_id) WHERE status = 'active';
