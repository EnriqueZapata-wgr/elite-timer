/**
 * Anthropic Client — Llama a Claude via Supabase Edge Function proxy.
 * Usa fetch directo al endpoint de Edge Functions (más confiable que supabase.functions.invoke).
 */
import Constants from 'expo-constants';
import { ATP_LLM } from '@/src/constants/llm-config';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const PROXY_URL = `${SUPABASE_URL}/functions/v1/argos-proxy`;

export async function callAnthropic(
  messages: any[],
  maxTokens: number = ATP_LLM.MAX_TOKENS_DEFAULT,
  model: string = ATP_LLM.PRIMARY_MODEL,
  system?: string,
  metadata?: {
    userId?: string;
    tier?: string;
    requestType?: string;
    targetUserId?: string | null;
    targetProfileId?: string | null;
  },
): Promise<any> {
  const body: Record<string, unknown> = {
    messages,
    max_tokens: maxTokens,
    model,
    ...(metadata?.userId && { userId: metadata.userId }),
    ...(metadata?.tier && { tier: metadata.tier }),
    ...(metadata?.requestType && { requestType: metadata.requestType }),
    ...(metadata?.targetUserId && { targetUserId: metadata.targetUserId }),
    ...(metadata?.targetProfileId && { targetProfileId: metadata.targetProfileId }),
  };
  if (system) body.system = system;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ATP_LLM.TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') throw new Error('ARGOS_TIMEOUT');
    throw err;
  }
  clearTimeout(timeoutId);

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

/**
 * Capa 5 (Files API) — sube un archivo a Anthropic vía el proxy (action 'upload_file') y
 * devuelve el file_id. Lanza si el proxy/endpoint no responde OK; el caller hace fallback a
 * base64. NO usa la API key en cliente (la maneja el edge function).
 */
export async function uploadFileToAnthropicViaProxy(
  fileBase64: string,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ATP_LLM.TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action: 'upload_file', fileBase64, fileName, mimeType }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') throw new Error('ARGOS_TIMEOUT');
    throw err;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`anthropic_files_upload_failed ${response.status}: ${errorText}`);
  }
  const data = await response.json();
  const fileId = data?.file_id ?? data?.id;
  if (!fileId || typeof fileId !== 'string') throw new Error('anthropic_files_upload_no_id');
  return fileId;
}
