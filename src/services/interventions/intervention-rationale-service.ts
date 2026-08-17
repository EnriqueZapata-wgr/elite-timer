/**
 * intervention-rationale-service — IO del "¿Por qué estas intervenciones?"
 * (Megabuzón 2da pasada B.4). Patrón ancla braverman-premium-service:
 *   cache (set_hash) → callAnthropic con idempotencyKey → validar → cachear.
 *
 * PREMIUM (16-ago-2026): costaba 280 H+ y era gratis para Pro. Con membresía
 * única viene incluido para todo miembro, así que se fue el precio y se fue la
 * distinción por plan. Queda el cache por set_hash, que es control de costo
 * invisible: si el set de intervenciones no cambió, no se vuelve a llamar al
 * modelo.
 */
import { supabase } from '@/src/lib/supabase';
import { callAnthropic, extractResponseText } from '@/src/services/anthropic-client';
import { getArgosCallMetadata } from '@/src/services/argos-service';
import { ATP_LLM } from '@/src/constants/llm-config';
import { getCurrentDX } from '@/src/services/dx/dx-service';
import { getMyProtocol } from './intervention-service';
import {
  buildRationalePrompt,
  computeRationaleSetHash,
  INTERVENTION_RATIONALE_ACTION_KEY,
} from './intervention-rationale-core';

export type RationaleResult =
  | { status: 'ok'; markdown: string; cached: boolean }
  | { status: 'no_dx' }
  | { status: 'no_protocol' }
  | { status: 'error'; message?: string };

async function getCachedRationale(userId: string, setHash: string): Promise<string | null> {
  const { data } = await supabase
    .from('intervention_rationales')
    .select('rationale_markdown')
    .eq('user_id', userId)
    .eq('set_hash', setHash)
    .maybeSingle();
  return data?.rationale_markdown ?? null;
}

export interface RationaleQuote {
  hasCachedRationale: boolean;
  hasDx: boolean;
  hasProtocol: boolean;
}

/** Estado para la card previa. Sin precio ni plan: viene con la membresía. */
export async function getRationaleQuote(userId: string): Promise<RationaleQuote> {
  const [dx, protocol] = await Promise.all([
    getCurrentDX(userId).catch(() => null),
    getMyProtocol(userId).catch(() => []),
  ]);
  const keys = protocol.map((p) => p.row.intervention_key);
  const cached = dx && keys.length > 0
    ? await getCachedRationale(userId, computeRationaleSetHash(dx.id, keys))
    : null;
  return {
    hasCachedRationale: cached !== null,
    hasDx: dx !== null,
    hasProtocol: keys.length > 0,
  };
}

/**
 * Genera (o devuelve del cache) la narrativa "por qué estas intervenciones".
 * Regenera SOLO si cambió el set de intervenciones activas o el DX vigente
 * (set_hash nuevo). LLM ~15-40s — el caller muestra loading.
 */
export async function generateInterventionRationale(userId: string): Promise<RationaleResult> {
  const [dx, protocol] = await Promise.all([getCurrentDX(userId), getMyProtocol(userId)]);
  if (!dx) return { status: 'no_dx' };
  if (protocol.length === 0) return { status: 'no_protocol' };

  const keys = protocol.map((p) => p.row.intervention_key);
  const setHash = computeRationaleSetHash(dx.id, keys);

  const cached = await getCachedRationale(userId, setHash);
  if (cached) return { status: 'ok', markdown: cached, cached: true };

  const prompt = buildRationalePrompt({
    dx: {
      version: dx.version,
      qualityLevel: dx.quality_level,
      summary: dx.summary_text,
      roots: (dx.roots_detected ?? []).map((r) => ({
        root_key: r.root_key,
        severity: r.severity,
        confidence: r.confidence,
      })),
    },
    interventions: protocol.map((p) => ({
      name: p.def.name,
      how: p.def.how,
      benefit: p.def.benefit,
      categories: p.def.categories,
      roots: p.def.roots,
    })),
  });

  try {
    // idempotencyKey ESTABLE por contexto: doble tap / retry tras fallo LLM =
    // una sola llamada al modelo.
    const meta = await getArgosCallMetadata({
      requestType: INTERVENTION_RATIONALE_ACTION_KEY,
      idempotencyKey: `intervention-rationale-${setHash}`,
    });
    // 8000: narrativa 200-400 palabras + thinking de Sonnet 5 cuentan ambos
    // contra max_tokens (adaptive thinking on por default en el proxy).
    const data = await callAnthropic(
      [{ role: 'user', content: prompt.user }],
      8000,
      ATP_LLM.PRIMARY_MODEL,
      prompt.system,
      meta,
    );
    const markdown = extractResponseText(data);
    if (!markdown) return { status: 'error', message: 'empty_response' };
    if (data?.stop_reason === 'max_tokens') {
      return { status: 'error', message: 'respuesta_incompleta_max_tokens' };
    }

    // Cache best-effort (upsert: carrera de doble request no rompe el UNIQUE).
    await supabase.from('intervention_rationales').upsert(
      {
        user_id: userId,
        source_dx_id: dx.id,
        set_hash: setHash,
        rationale_markdown: markdown,
        model: ATP_LLM.PRIMARY_MODEL,
      },
      { onConflict: 'user_id,set_hash', ignoreDuplicates: true },
    );

    return { status: 'ok', markdown, cached: false };
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    return { status: 'error', message: msg };
  }
}
