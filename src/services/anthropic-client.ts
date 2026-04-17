/**
 * Anthropic Client — Llama a Claude via Supabase Edge Function proxy.
 * Usa fetch directo al endpoint de Edge Functions (más confiable que supabase.functions.invoke).
 */
import Constants from 'expo-constants';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const PROXY_URL = `${SUPABASE_URL}/functions/v1/anthropic-proxy`;

export async function callAnthropic(
  messages: any[],
  maxTokens = 4000,
  model = 'claude-sonnet-4-20250514',
  system?: string,
): Promise<any> {
  const body: Record<string, unknown> = { messages, max_tokens: maxTokens, model };
  if (system) body.system = system;

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Proxy error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (data?.error) {
    const msg = typeof data.error === 'string' ? data.error : data.error?.message || JSON.stringify(data.error);
    throw new Error(msg);
  }
  return data;
}
