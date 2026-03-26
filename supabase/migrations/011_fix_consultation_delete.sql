-- Fix: permitir al coach borrar sus consultas en draft
CREATE POLICY "Coach deletes own draft consultations" ON consultations
  FOR DELETE USING (auth.uid() = coach_id AND status = 'draft');
