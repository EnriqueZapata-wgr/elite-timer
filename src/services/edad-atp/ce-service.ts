/**
 * CE (Calidad de Evaluación) — Edad ATP v2, Sprint 2.
 * Calcula qué % de los inputs necesarios tiene el usuario.
 * `computeCEFromData` es PURO (testeable); `computeCE(userId)` consulta Supabase.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import type { DomainKey } from '@/src/types/edad-atp-v2';

/** Biomarcadores core de PhenoAge (los que más pesan en la CE). */
export const CE_PHENOAGE_KEYS = [
  'albumin', 'creatinine', 'glucose', 'crp', 'lymphocyte_pct', 'mcv', 'rdw_cv', 'alp', 'wbc',
] as const;

export const CE_DOMAINS: DomainKey[] = [
  'cardiovascular', 'composicion_corporal', 'habitos', 'inflamacion', 'inmunidad',
  'metabolismo', 'renal_micronutrientes', 'sistema_hormonal', 'sueno', 'vitalidad',
];

// Pesos de la CE integral por dimensión (suman 1.0).
const CE_WEIGHTS = { biomarkers: 0.4, composition: 0.2, questionnaires: 0.3, cognitive: 0.1 };

export type CEBreakdown = { biomarkers: number; composition: number; questionnaires: number; cognitive: number };
export type CEResult = { ce_integral: number; breakdown: CEBreakdown };

/** Núcleo puro: % por dimensión + CE integral ponderada (0-100). */
export function computeCEFromData(data: {
  presentBiomarkerKeys: string[];
  hasComposition: boolean;
  presentDomains: string[];
  hasCognitive: boolean;
}): CEResult {
  const bioSet = new Set(data.presentBiomarkerKeys);
  const biomarkers = (CE_PHENOAGE_KEYS.filter((k) => bioSet.has(k)).length / CE_PHENOAGE_KEYS.length) * 100;
  const composition = data.hasComposition ? 100 : 0;
  const domSet = new Set(data.presentDomains);
  const questionnaires = (CE_DOMAINS.filter((d) => domSet.has(d)).length / CE_DOMAINS.length) * 100;
  const cognitive = data.hasCognitive ? 100 : 0;

  const ce_integral =
    biomarkers * CE_WEIGHTS.biomarkers +
    composition * CE_WEIGHTS.composition +
    questionnaires * CE_WEIGHTS.questionnaires +
    cognitive * CE_WEIGHTS.cognitive;

  return { ce_integral, breakdown: { biomarkers, composition, questionnaires, cognitive } };
}

/** Carga los datos del usuario y calcula la CE. Devuelve 0% si falla la lectura. */
export async function computeCE(userId: string): Promise<CEResult> {
  try {
    const [bio, comp, q, rt] = await Promise.all([
      supabase.from('edad_atp_biomarkers').select('biomarker_key').eq('user_id', userId),
      supabase.from('edad_atp_body_composition').select('id').eq('user_id', userId).limit(1),
      supabase.from('edad_atp_questionnaire_responses').select('domain').eq('user_id', userId),
      supabase.from('edad_atp_functional_tests').select('id').eq('user_id', userId).like('test_key', 'reaction_time%').limit(1),
    ]);
    return computeCEFromData({
      presentBiomarkerKeys: (bio.data ?? []).map((r: any) => r.biomarker_key),
      hasComposition: (comp.data ?? []).length > 0,
      presentDomains: (q.data ?? []).map((r: any) => r.domain),
      hasCognitive: (rt.data ?? []).length > 0,
    });
  } catch (err) {
    logWarn('[edad-atp ce] computeCE failed:', err);
    return { ce_integral: 0, breakdown: { biomarkers: 0, composition: 0, questionnaires: 0, cognitive: 0 } };
  }
}
