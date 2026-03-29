-- ============================================================
-- Migración 026: Estudios clínicos (imaging, endoscopy, etc.)
-- EJECUTAR EN: Supabase SQL Editor
-- TAMBIÉN: Crear bucket 'clinical-studies' en Storage (privado, 20MB)
-- ============================================================

CREATE TABLE IF NOT EXISTS clinical_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  study_type TEXT NOT NULL,
  study_name TEXT NOT NULL,
  study_date DATE NOT NULL,
  ordering_physician TEXT,
  performing_lab TEXT,
  files JSONB DEFAULT '[]',
  original_interpretation TEXT,
  patient_summary TEXT,
  findings JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('uploaded', 'processing', 'interpreted', 'reviewed')) DEFAULT 'uploaded',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  coach_notes TEXT,
  uploaded_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clinical_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own studies" ON clinical_studies FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "User uploads own studies" ON clinical_studies FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() = uploaded_by);

CREATE POLICY "Coach manages client studies" ON clinical_studies FOR ALL
USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = clinical_studies.user_id AND status = 'active')
);

CREATE INDEX idx_clinical_studies_user ON clinical_studies(user_id, study_date DESC);
CREATE INDEX idx_clinical_studies_type ON clinical_studies(user_id, study_type);

-- Storage policies para bucket clinical-studies
-- (Crear bucket manualmente: privado, 20MB, image/jpeg + image/png + application/pdf)
INSERT INTO storage.buckets (id, name, public) VALUES ('clinical-studies', 'clinical-studies', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own clinical files" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'clinical-studies' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM coach_clients
      WHERE coach_id = auth.uid()
      AND client_id = (storage.foldername(name))[1]::uuid
      AND status = 'active'
    )
  )
);

CREATE POLICY "Users view own clinical files" ON storage.objects FOR SELECT
USING (
  bucket_id = 'clinical-studies' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM coach_clients
      WHERE coach_id = auth.uid()
      AND client_id = (storage.foldername(name))[1]::uuid
      AND status = 'active'
    )
  )
);

CREATE POLICY "Users delete own clinical files" ON storage.objects FOR DELETE
USING (
  bucket_id = 'clinical-studies' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM coach_clients
      WHERE coach_id = auth.uid()
      AND client_id = (storage.foldername(name))[1]::uuid
      AND status = 'active'
    )
  )
);
