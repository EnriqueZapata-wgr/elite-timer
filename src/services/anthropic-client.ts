/**
 * Anthropic Client — Llama a Claude via Supabase Edge Function proxy.
 * La API key vive solo en el servidor, no en el cliente.
 */
import { supabase } from '@/src/lib/supabase';
import Constants from 'expo-constants';

export async function callAnthropic(
  messages: any[],
  maxTokens = 4000,
  model = 'claude-sonnet-4-20250514'
): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('No hay sesión activa');

  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl
    || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const anonKey = Constants.expoConfig?.extra?.supabaseAnonKey
    || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  const functionUrl = `${supabaseUrl}/functions/v1/anthropic-proxy`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({ messages, max_tokens: maxTokens, model }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(error.error || `Error ${response.status}`);
  }

  return response.json();
}
