/**
 * Coach Service — Sistema de conexión Coach ↔ Cliente.
 *
 * Permite a usuarios generar un código de coach, y a clientes
 * conectarse con un coach usando ese código.
 */
import { supabase } from '@/src/lib/supabase';
import type { User } from '@supabase/supabase-js';

// === AUTH HELPER ===

async function getAuthenticatedUser(): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) throw new Error('Sesión expirada');
  return data.user;
}

// === TYPES ===

export interface CoachConnection {
  id: string;
  coach_id: string;
  client_id: string;
  status: string;
  connected_at: string;
  profile_name: string;
}

// === FUNCIONES ===

/** Genera (o recupera) el código de coach del usuario */
export async function generateCoachCode(): Promise<string> {
  await getAuthenticatedUser();
  const { data, error } = await supabase.rpc('generate_coach_code');
  if (error) throw new Error(error.message);
  return data as string;
}

/** Conecta al usuario actual con un coach usando su código */
export async function connectToCoach(code: string): Promise<{ coach_id: string; coach_name: string }> {
  await getAuthenticatedUser();
  const { data, error } = await supabase.rpc('connect_to_coach', {
    p_code: code.toUpperCase().trim(),
  });
  if (error) throw new Error(error.message);
  return data as { coach_id: string; coach_name: string };
}

/** Obtiene los coaches del usuario actual (como cliente) */
export async function getMyCoaches(): Promise<CoachConnection[]> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from('coach_clients')
    .select('id, coach_id, client_id, status, connected_at, coach:profiles!coach_clients_coach_id_fkey(full_name)')
    .eq('client_id', user.id)
    .eq('status', 'active');
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    coach_id: row.coach_id,
    client_id: row.client_id,
    status: row.status,
    connected_at: row.connected_at,
    profile_name: (row as any).coach?.full_name ?? 'Coach',
  }));
}

/** Obtiene los clientes del usuario actual (como coach) */
export async function getMyClients(): Promise<CoachConnection[]> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from('coach_clients')
    .select('id, coach_id, client_id, status, connected_at, client:profiles!coach_clients_client_id_fkey(full_name)')
    .eq('coach_id', user.id)
    .eq('status', 'active');
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    coach_id: row.coach_id,
    client_id: row.client_id,
    status: row.status,
    connected_at: row.connected_at,
    profile_name: (row as any).client?.full_name ?? 'Cliente',
  }));
}

/** Desconecta un cliente (como coach) */
export async function disconnectClient(clientId: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const { error } = await supabase
    .from('coach_clients')
    .update({ status: 'inactive' })
    .eq('coach_id', user.id)
    .eq('client_id', clientId);
  if (error) throw new Error(error.message);
}

/** Desconecta un coach (como cliente) */
export async function disconnectCoach(coachId: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const { error } = await supabase
    .from('coach_clients')
    .update({ status: 'inactive' })
    .eq('coach_id', coachId)
    .eq('client_id', user.id);
  if (error) throw new Error(error.message);
}

/** Verifica si el usuario tiene código de coach */
export async function getCoachCode(): Promise<string | null> {
  const user = await getAuthenticatedUser();
  const { data } = await supabase
    .from('profiles')
    .select('coach_code')
    .eq('id', user.id)
    .single();
  return data?.coach_code ?? null;
}

/** Invitar/crear cliente por email */
export async function inviteClientByEmail(email: string): Promise<{
  client_id: string; email: string; name: string | null; is_new: boolean;
}> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase.rpc('invite_client_by_email', {
    p_coach_id: user.id,
    p_email: email.trim().toLowerCase(),
  });
  if (error) throw new Error(error.message);
  return data as any;
}

/** Actualizar nombre del cliente (para placeholders) */
export async function updateClientName(clientId: string, fullName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', clientId);
  if (error) throw error;
}
