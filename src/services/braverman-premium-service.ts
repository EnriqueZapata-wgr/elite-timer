/**
 * Braverman PREMIUM (#90, marathon F5) — IO: resultado + cache + generación.
 * Standalone (no toca argos-service — Cowork trabaja ahí en paralelo).
 * Gate por tier se hace en la pantalla con useSubscription().
 */
import { supabase } from '@/src/lib/supabase';
import { callAnthropic } from './anthropic-client';
import { getArgosCallMetadata } from './argos-service';
import { getClientProfile } from './client-profile-service';
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

export type PremiumReportResult =
  | { status: 'ok'; markdown: string; cached: boolean }
  | { status: 'no_test' }
  | { status: 'error' };

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

/**
 * Genera (o devuelve del cache) el reporte premium del último test completo.
 * LLM ~30-60s — el caller muestra loading. Cache insert best-effort.
 */
export async function generateBravermanPremiumReport(userId: string): Promise<PremiumReportResult> {
  const result = await getLatestCompleteBravermanResult(userId);
  if (!result) return { status: 'no_test' };

  const cached = await getCachedReport(result.id);
  if (cached) return { status: 'ok', markdown: cached, cached: true };

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
    const meta = await getArgosCallMetadata({ requestType: 'braverman_premium_report' });
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
