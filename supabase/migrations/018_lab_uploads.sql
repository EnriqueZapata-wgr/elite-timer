-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor

CREATE TABLE lab_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('image', 'pdf')) NOT NULL,
  file_name TEXT,
  status TEXT CHECK (status IN ('uploaded', 'processing', 'extracted', 'failed')) DEFAULT 'uploaded',
  extracted_data JSONB,
  ai_raw_response TEXT,
  error_message TEXT,
  lab_result_id UUID REFERENCES lab_results(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lab_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own uploads" ON lab_uploads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach sees client uploads" ON lab_uploads FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = lab_uploads.user_id AND status = 'active')
);

ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS upload_id UUID REFERENCES lab_uploads(id);
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id);
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS lab_name TEXT;

-- Crear bucket si no existe (ejecutar desde dashboard de Supabase > Storage > New bucket: lab-files, public: false)
