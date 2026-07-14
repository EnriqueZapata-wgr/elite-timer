/**
 * intervention-rationale-service — IO del "¿Por qué estas intervenciones?"
 * (Megabuzón 2da pasada B.4). Patrón ancla braverman-premium-service:
 *   cache (set_hash) → callAnthropic con idempotencyKey → validar → cachear.
 *
 * Doctrina H+ (Enrique 2026-07-08): el COBRO es server-side — argos-proxy lee
 * proton_action_costs por requestType 'intervention_rationale' (280 H+, seed
 * 175) y para tier Pro efectivo cobra 0 (all-you-can-eat, buzón B.4). El
 * cliente NO gestiona el débito (a diferencia de Braverman): así el Pro nunca
 * paga cliente-side. Sólo maneja el 402 del proxy (mismo patrón que dx-engine).
 */
import { supabase } from '@/src/lib/supabase';
import { callAnthropic, extractResponseText } from '@/src/services/anthropic-client';
import { getArgosCallMetadata } from '@/src/services/argos-service';
import { getActionCost, getProtonBalance } from '@/src/services/economy/proton-service';
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
  | { status: 'insufficient_h_plus' }
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
  cost: number;
  /** null = balance aún no disponible (cold start). */
  balance: number | null;
  hasCachedRationale: boolean;
  hasDx: boolean;
  hasProtocol: boolean;
  /** profiles.tier === 'pro' → el proxy cobra 0 (la UI muestra "incluido en Pro"). */
  isPro: boolean;
}

/** Precio + balance + estado para la card previa (patrón getBravermanPremiumQuote). */
export async function getRationaleQuote(userId: string): Promise<RationaleQuote> {
  const [cost, balanceRow, dx, protocol, profileRes] = await Promise.all([
    getActionCost(INTERVENTION_RATIONALE_ACTION_KEY),
    getProtonBalance(userId).catch(() => null),
    getCurrentDX(userId).catch(() => null),
    getMyProtocol(userId).catch(() => []),
    supabase.from('profiles').select('tier').eq('id', userId).maybeSingle(),
  ]);
  const keys = protocol.map((p) => p.row.intervention_key);
  const cached = dx && keys.length > 0
    ? await getCachedRationale(userId, computeRationaleSetHash(dx.id, keys))
    : null;
  return {
    cost,
    balance: balanceRow ? balanceRow.current_protons : null,
    hasCachedRationale: cached !== null,
    hasDx: dx !== null,
    hasProtocol: keys.length > 0,
    isPro: (profileRes?.data as any)?.tier === 'pro',
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
    // 1 cobro máx (spend_protons v2 la reconoce en el proxy).
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
    // El proxy cobra server-side; 402 = balance insuficiente (doctrina H+).
    if (msg.includes('402')) return { status: 'insufficient_h_plus' };
    return { status: 'error', message: msg };
  }
}
