-- ARGOS Logs — observabilidad de llamadas a LLM
--
-- NOTA: las vistas argos_user_metrics y argos_global_metrics usan
-- security_invoker = true para que respeten RLS del usuario que
-- consulta (en lugar de los permisos del creador de la vista).
-- Sin esto, las vistas bypasean RLS y exponen datos cross-user.
CREATE TABLE IF NOT EXISTS argos_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tier text DEFAULT 'unknown',
  provider text NOT NULL,
  model text NOT NULL,
  request_type text DEFAULT 'chat',
  input_tokens int DEFAULT 0,
  output_tokens int DEFAULT 0,
  cache_read_tokens int DEFAULT 0,
  cache_write_tokens int DEFAULT 0,
  latency_ms int,
  success boolean DEFAULT true,
  error_message text,
  fallback_used boolean DEFAULT false,
  estimated_cost_usd numeric(12, 6) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE argos_logs ENABLE ROW LEVEL SECURITY;

-- Usuario ve sus propios logs (transparencia)
CREATE POLICY "Users see own argos logs" ON argos_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Solo service role inserta (Edge Function tiene service_role)
CREATE POLICY "Service role inserts" ON argos_logs
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Admin ve todo
CREATE POLICY "Admin sees all argos logs" ON argos_logs
  FOR SELECT USING (auth.uid() = '90a55e74-0e3d-477a-9ac5-2b339f7c40af');

-- Indices para queries comunes
CREATE INDEX IF NOT EXISTS idx_argos_logs_user_date ON argos_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_argos_logs_tier_date ON argos_logs(tier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_argos_logs_success_date ON argos_logs(success, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_argos_logs_created ON argos_logs(created_at DESC);

-- Vista agregada por usuario (últimos 30 días)
CREATE OR REPLACE VIEW argos_user_metrics
WITH (security_invoker = true) AS
SELECT
  user_id,
  tier,
  COUNT(*) as total_requests,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests,
  SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END) as fallback_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(cache_read_tokens) as total_cache_read_tokens,
  SUM(estimated_cost_usd) as total_cost_usd,
  ROUND(AVG(latency_ms)::numeric, 0) as avg_latency_ms,
  MAX(created_at) as last_request_at
FROM argos_logs
WHERE created_at > now() - interval '30 days'
GROUP BY user_id, tier;

-- Vista agregada global (admin dashboard)
CREATE OR REPLACE VIEW argos_global_metrics
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', created_at) as day,
  tier,
  provider,
  COUNT(*) as requests,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes,
  SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END) as fallbacks,
  SUM(input_tokens + output_tokens) as total_tokens,
  SUM(estimated_cost_usd) as total_cost_usd,
  ROUND(AVG(latency_ms)::numeric, 0) as avg_latency_ms,
  COUNT(DISTINCT user_id) as unique_users
FROM argos_logs
GROUP BY date_trunc('day', created_at), tier, provider
ORDER BY day DESC;
