/**
 * Consultation Service — Histórico de consultas con snapshots.
 */
import { supabase } from '@/src/lib/supabase';

async function getAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) throw new Error('Sesión expirada');
  return data.user;
}

export interface Consultation {
  id: string;
  client_id: string;
  coach_id: string;
  consultation_date: string;
  consultation_number: number;
  conditions_snapshot: any[];
  body_snapshot: any;
  biomarkers_snapshot: any;
  medications_snapshot: any[];
  supplements_snapshot: any[];
  chief_complaint: string | null;
  subjective_notes: string | null;
  objective_notes: string | null;
  assessment: string | null;
  plan: string | null;
  ai_analysis: string | null;
  general_notes: string | null;
  changes_summary: any;
  duration_minutes: number | null;
  next_appointment: string | null;
  status: 'draft' | 'completed' | 'signed';
  created_at: string;
}

export async function startConsultation(clientId: string): Promise<string> {
  const user = await getAuth();
  const { data, error } = await supabase.rpc('create_consultation_snapshot', {
    p_coach_id: user.id,
    p_client_id: clientId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function getConsultations(clientId: string, limit = 20): Promise<Consultation[]> {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('client_id', clientId)
    .order('consultation_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Consultation[];
}

export async function getConsultation(id: string): Promise<Consultation | null> {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Consultation;
}

export async function updateConsultation(id: string, fields: Partial<Consultation>): Promise<void> {
  const { error } = await supabase
    .from('consultations')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function completeConsultation(id: string): Promise<void> {
  const { error } = await supabase
    .from('consultations')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteConsultation(id: string): Promise<void> {
  const { error } = await supabase
    .from('consultations')
    .delete()
    .eq('id', id)
    .eq('status', 'draft');
  if (error) throw error;
}
