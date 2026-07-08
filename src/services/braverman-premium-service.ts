/**
 * Braverman PREMIUM (#90, #143) — IO: resultado + cache + cobro H+ + generación.
 * Standalone (no toca argos-service).
 *
 * Doctrina H+ (Enrique 2026-07-08): las features LLM caras se COBRAN con
 * Protones, no se gatean por tier. Este es el patrón ancla para #96/#97:
 *   cache hit → gratis · cache miss → spend_protons (idempotente por
 *   resultado) → LLM → cache. Si el LLM falla tras el cobro, el retry es
 *   GRATIS: la misma idempotency_key hace que spend devuelva success sin
 *   volver a debitar, y el flujo continúa hasta cachear el reporte.
 */
import { supabase } from '@/src/lib/supabase';
import { callAnthropic } from './anthropic-client';
import { getArgosCallMetadata } from './argos-service';
import { getClientProfile } from './client-profile-service';
import { getActionCost, getProtonBalance, spendProtons } from './economy/proton-service';
import { ATP_LLM } from '@/src/constants/llm-config';
import {
  buildPremiumReportPrompt,
  computeProportions,
  NEURO_LABELS,
  type NeuroKey,
} from './braverman-premium-logic';

export interface BravermanResultRow {
  id: string;
  dominance_dopamine: number;
  dominance_acetylcholine: number;
  dominance_gaba: number;
  dominance_serotonin: number;
  dominant_type: string | null;
  deficiency_dopamine: number;
  deficiency_acetylcholine: number;
  deficiency_gaba: number;
  deficiency_serotonin: number;
  primary_deficiency: string | null;
  deficiency_level: string | null;
  completed_at: string | null;
}

/** action_key registrado en proton_action_costs (migración 162, 1,000 H+). */
export const BRAVERMAN_PREMIUM_ACTION_KEY = 'braverman_premium_report';

export type PremiumReportResult =
  | { status: 'ok'; markdown: string; cached: boolean }
  | { status: 'no_test' }
  | { status: 'insufficient_h_plus'; required: number; balance: number }
  | { status: 'error'; message?: string };

export async function getLatestCompleteBravermanResult(
  userId: string,
): Promise<BravermanResultRow | null> {
  const { data } = await supabase
    .from('braverman_results')
    .select('id, dominance_dopamine, dominance_acetylcholine, dominance_gaba, dominance_serotonin, dominant_type, deficiency_dopamine, deficiency_acetylcholine, deficiency_gaba, deficiency_serotonin, primary_deficiency, deficiency_level, completed_at')
    .eq('user_id', userId)
    .eq('is_complete', true)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as BravermanResultRow) ?? null;
}

async function getCachedReport(resultId: string): Promise<string | null> {
  const { data } = await supabase
    .from('braverman_premium_reports')
    .select('report_markdown')
    .eq('braverman_result_id', resultId)
    .maybeSingle();
  return data?.report_markdown ?? null;
}

function neuroLabel(key: string | null): string {
  return NEURO_LABELS[(key ?? 'dopamine') as NeuroKey] ?? 'Dopamina';
}

/** Edad derivada de client_profiles.date_of_birth (null si no hay). */
async function getAgeAndSex(userId: string): Promise<{ age: number | null; sex: string | null }> {
  try {
    const cp = await getClientProfile(userId);
    let age: number | null = null;
    if (cp?.date_of_birth) {
      const birth = new Date(String(cp.date_of_birth).slice(0, 10));
      age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000));
      if (age < 0 || age > 130) age = null;
    }
    const sex = cp?.biological_sex === 'male' || cp?.biological_sex === 'female'
      ? cp.biological_sex : null;
    return { age, sex };
  } catch {
    return { age: null, sex: null };
  }
}

export interface PremiumQuote {
  cost: number;
  /** null = balance aún no disponible (cold start, task #134) */
  balance: number | null;
  hasCachedReport: boolean;
  hasCompletedTest: boolean;
}

/** Datos para la card previa (#143): precio + balance + si ya lo tiene. */
export async function getBravermanPremiumQuote(userId: string): Promise<PremiumQuote> {
  const result = await getLatestCompleteBravermanResult(userId);
  const [cost, balanceRow, cached] = await Promise.all([
    getActionCost(BRAVERMAN_PREMIUM_ACTION_KEY),
    getProtonBalance(userId).catch(() => null),
    result ? getCachedReport(result.id) : Promise.resolve(null),
  ]);
  return {
    cost,
    balance: balanceRow ? balanceRow.current_protons : null,
    hasCachedReport: cached !== null,
    hasCompletedTest: result !== null,
  };
}

/**
 * Genera (o devuelve del cache) el reporte premium del último test completo.
 * LLM ~30-60s — el caller muestra loading. Cache insert best-effort.
 * #143: cobra el costo H+ ANTES del LLM (idempotente por resultado).
 */
export async function generateBravermanPremiumReport(userId: string): Promise<PremiumReportResult> {
  const result = await getLatestCompleteBravermanResult(userId);
  if (!result) return { status: 'no_test' };

  const cached = await getCachedReport(result.id);
  if (cached) return { status: 'ok', markdown: cached, cached: true };

  // #143: cobro H+ (precio server-side de proton_action_costs, fallback 1000).
  // idempotency_key por resultado: doble tap / retry tras fallo LLM = 1 cobro máx.
  const cost = await getActionCost(BRAVERMAN_PREMIUM_ACTION_KEY);
  const idempotencyKey = `braverman-premium-${result.id}`;
  const spend = await spendProtons(userId, cost, BRAVERMAN_PREMIUM_ACTION_KEY, {
    idempotency_key: idempotencyKey,
    braverman_result_id: result.id,
  });
  if (!spend.success) {
    if (spend.error === 'insufficient_protons') {
      return { status: 'insufficient_h_plus', required: cost, balance: spend.newBalance };
    }
    return { status: 'error', message: spend.error };
  }

  const { age, sex } = await getAgeAndSex(userId);
  const prompt = buildPremiumReportPrompt({
    dominance: computeProportions({
      dopamine: result.dominance_dopamine,
      acetylcholine: result.dominance_acetylcholine,
      gaba: result.dominance_gaba,
      serotonin: result.dominance_serotonin,
    }),
    deficiency: computeProportions({
      dopamine: result.deficiency_dopamine,
      acetylcholine: result.deficiency_acetylcholine,
      gaba: result.deficiency_gaba,
      serotonin: result.deficiency_serotonin,
    }),
    dominantLabel: neuroLabel(result.dominant_type),
    primaryDeficiencyLabel: neuroLabel(result.primary_deficiency),
    deficiencyLevel: result.deficiency_level,
    age,
    sex,
  });

  try {
    // Misma idempotency_key hacia el proxy: si argos-proxy también cobra por
    // requestType, spend_protons la reconoce y NO debita dos veces.
    const meta = await getArgosCallMetadata({
      requestType: BRAVERMAN_PREMIUM_ACTION_KEY,
      idempotencyKey,
    });
    const data = await callAnthropic(
      [{ role: 'user', content: prompt.user }],
      3000,
      ATP_LLM.PRIMARY_MODEL,
      prompt.system,
      meta,
    );
    const markdown = data?.content?.[0]?.text;
    if (!markdown || typeof markdown !== 'string') return { status: 'error' };

    // Cache best-effort (si falla el insert, el reporte igual se muestra)
    await supabase.from('braverman_premium_reports').insert({
      user_id: userId,
      braverman_result_id: result.id,
      report_markdown: markdown,
      model: ATP_LLM.PRIMARY_MODEL,
    });

    return { status: 'ok', markdown, cached: false };
  } catch {
    return { status: 'error' };
  }
}
