/**
 * Anthropic Client — Llama a Claude via Supabase Edge Function proxy.
 * Usa supabase.functions.invoke que maneja auth automáticamente.
 */
import { supabase } from '@/src/lib/supabase';

export async function callAnthropic(
  messages: any[],
  maxTokens = 4000,
  model = 'claude-sonnet-4-20250514'
): Promise<any> {
  const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
    body: { messages, max_tokens: maxTokens, model },
  });

  if (error) throw new Error(error.message || 'Error calling AI proxy');
  if (data?.error) throw new Error(data.error);
  return data;
}
