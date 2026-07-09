/**
 * Anthropic Client — Llama a Claude via Supabase Edge Function proxy.
 * Usa fetch directo al endpoint de Edge Functions (más confiable que supabase.functions.invoke).
 */
import Constants from 'expo-constants';
import { ATP_LLM } from '@/src/constants/llm-config';
import {
  ArgosRateLimitError,
  ArgosStreamUnavailableError,
  isEventStreamResponse,
  parseStreamEvent,
  splitSSEBuffer,
  type ArgosStreamEvent,
} from './argos-stream-core';

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
    idempotencyKey?: string;
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
    // #71: el server (spend_protons v2) cobra H+ una sola vez por idempotency_key.
    ...(metadata?.idempotencyKey && { idempotency_key: metadata.idempotencyKey }),
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
 * T2 MAGIA 2.0 — llama al proxy en modo streaming (SSE) y emite eventos.
 *
 * Opt-in por body.stream + header X-ATP-Stream (no rompe callers legacy).
 * Comportamiento según respuesta del proxy:
 *  - text/event-stream → yield de eventos chunk/done conforme llegan.
 *  - JSON con _rate_limited → ArgosRateLimitError (T5: RateLimitCard).
 *  - JSON normal (proxy viejo sin SSE) → yield del texto completo como un
 *    solo chunk (modo actual, sin segundo request).
 *  - JSON degradado / sin texto / error red → ArgosStreamUnavailableError
 *    (el caller hace fallback al modo no-streaming).
 */
export async function* callAnthropicStream(
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
    idempotencyKey?: string;
  },
): AsyncGenerator<ArgosStreamEvent, void, void> {
  const body: Record<string, unknown> = {
    messages,
    max_tokens: maxTokens,
    model,
    stream: true,
    ...(metadata?.userId && { userId: metadata.userId }),
    ...(metadata?.tier && { tier: metadata.tier }),
    ...(metadata?.requestType && { requestType: metadata.requestType }),
    ...(metadata?.targetUserId && { targetUserId: metadata.targetUserId }),
    ...(metadata?.targetProfileId && { targetProfileId: metadata.targetProfileId }),
    ...(metadata?.idempotencyKey && { idempotency_key: metadata.idempotencyKey }),
  };
  if (system) body.system = system;

  // expo/fetch (WinterCG): a diferencia del fetch global de RN, soporta
  // response.body como ReadableStream — requerido para consumir SSE.
  // Import PEREZOSO: sus dependencias nativas no resuelven en el harness
  // node (Vitest) — solo se carga cuando de verdad se streamea en device.
  let streamingFetch: typeof import('expo/fetch').fetch;
  try {
    ({ fetch: streamingFetch } = await import('expo/fetch'));
  } catch (err: any) {
    throw new ArgosStreamUnavailableError(`expo_fetch_unavailable: ${err?.message || err}`);
  }

  let response: Awaited<ReturnType<typeof streamingFetch>>;
  try {
    response = await streamingFetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'X-ATP-Stream': 'true',
      },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    throw new ArgosStreamUnavailableError(err?.message || 'stream_network_error');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new ArgosStreamUnavailableError(`proxy_${response.status}: ${errorText.slice(0, 200)}`);
  }

  const contentType = response.headers.get('content-type');
  if (!isEventStreamResponse(contentType)) {
    // JSON: rate limit, proxy legacy sin SSE, o degradado.
    const data = await response.json().catch(() => null);
    if (data?._rate_limited) throw new ArgosRateLimitError(data);
    if (data?._degraded || data?.error) {
      throw new ArgosStreamUnavailableError('proxy_degraded_or_error');
    }
    const text = data?.content?.[0]?.text;
    if (typeof text === 'string' && text) {
      yield { type: 'chunk', text };
      yield { type: 'done' };
      return;
    }
    throw new ArgosStreamUnavailableError('proxy_json_without_text');
  }

  if (!response.body) throw new ArgosStreamUnavailableError('no_response_body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { rawEvents, rest } = splitSSEBuffer(buffer);
      buffer = rest;
      for (const raw of rawEvents) {
        const evt = parseStreamEvent(raw);
        if (evt) yield evt;
      }
    }
    // Flush del resto (evento final sin doble newline de cierre)
    const tail = parseStreamEvent(buffer);
    if (tail) yield tail;
  } finally {
    reader.releaseLock?.();
  }
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
