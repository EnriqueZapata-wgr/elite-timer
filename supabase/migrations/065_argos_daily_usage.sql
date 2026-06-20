-- ARGOS circuit breaker — conteo diario de uso por usuario.
-- NO es feature gating por plan. Es un techo único anti-abuso
-- (HARD_CAP) para evitar que un bug de loop o un abuso queme la
-- cuenta de Anthropic. El coin economy futuro lo complementa.

CREATE TABLE IF NOT EXISTS argos_daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  message_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

ALTER TABLE argos_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own argos usage" ON argos_daily_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role writes argos usage" ON argos_daily_usage
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE INDEX IF NOT EXISTS idx_argos_usage_user_date
  ON argos_daily_usage(user_id, usage_date);

CREATE OR REPLACE FUNCTION increment_argos_usage(p_user_id uuid)
RETURNS int AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO argos_daily_usage (user_id, usage_date, message_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET message_count = argos_daily_usage.message_count + 1,
                updated_at = now()
  RETURNING message_count INTO v_count;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
