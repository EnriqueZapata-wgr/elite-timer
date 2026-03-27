-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor

-- Fix: coach puede insertar lab_uploads para sus clientes
DROP POLICY IF EXISTS "User sees own uploads" ON lab_uploads;
DROP POLICY IF EXISTS "Coach sees client uploads" ON lab_uploads;

CREATE POLICY "User manages own uploads" ON lab_uploads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach manages client uploads" ON lab_uploads FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = lab_uploads.user_id AND status = 'active')
);

-- Fix: coach puede insertar lab_results para sus clientes
DROP POLICY IF EXISTS "User sees own labs" ON lab_results;
DROP POLICY IF EXISTS "Coach sees client labs" ON lab_results;

CREATE POLICY "User manages own labs" ON lab_results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach manages client labs" ON lab_results FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = lab_results.user_id AND status = 'active')
);

-- Storage: coach puede subir y ver archivos de sus clientes
-- (ejecutar solo si no existen ya estas políticas)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users upload own lab files' AND tablename = 'objects') THEN
    CREATE POLICY "Users upload own lab files" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'lab-files' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own lab files' AND tablename = 'objects') THEN
    CREATE POLICY "Users view own lab files" ON storage.objects FOR SELECT
    USING (bucket_id = 'lab-files' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coaches upload client lab files' AND tablename = 'objects') THEN
    CREATE POLICY "Coaches upload client lab files" ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'lab-files' AND
      EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = (storage.foldername(name))[1]::uuid AND status = 'active')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coaches view client lab files' AND tablename = 'objects') THEN
    CREATE POLICY "Coaches view client lab files" ON storage.objects FOR SELECT
    USING (
      bucket_id = 'lab-files' AND
      EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = (storage.foldername(name))[1]::uuid AND status = 'active')
    );
  END IF;
END $$;
