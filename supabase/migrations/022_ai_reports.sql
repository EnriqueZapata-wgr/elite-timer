-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ai_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id),
  question TEXT,
  report TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

-- Coach ve reportes de sus clientes
CREATE POLICY "Coach manages ai reports" ON ai_reports FOR ALL USING (
  coach_id = auth.uid()
  OR EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = ai_reports.client_id AND status = 'active')
);

-- Cliente ve sus propios reportes
CREATE POLICY "Client sees own ai reports" ON ai_reports FOR SELECT USING (
  client_id = auth.uid()
);

CREATE INDEX idx_ai_reports_client ON ai_reports(client_id, created_at DESC);
