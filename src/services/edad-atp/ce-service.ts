/**
 * CE (Calidad de Evaluación) — Edad ATP v2, Sprint 2.
 * Calcula qué % de los inputs necesarios tiene el usuario.
 * `computeCEFromData` es PURO (testeable); `computeCE(userId)` consulta Supabase.
 */
import { warn as logWarn } from '@/src/lib/logger';
import { loadUserData, type UnifiedUserData } from './edad-atp-v2-service';
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

/** Mapeo PhenoAge key (CE) → campo en UnifiedUserData. */
const PHENOAGE_FIELD_MAP: Record<(typeof CE_PHENOAGE_KEYS)[number], keyof UnifiedUserData> = {
  albumin: 'albumin_g_dl', creatinine: 'creatinine_mg_dl', glucose: 'glucose_mg_dl',
  crp: 'pcr_mg_dl', lymphocyte_pct: 'lymphocyte_pct', mcv: 'mcv_fl',
  rdw_cv: 'rdw_cv_pct', alp: 'alp_u_l', wbc: 'wbc_per_ul',
};

/** Deriva los inputs de la CE a partir de los datos unificados (PURO). */
export function unifiedToCEData(data: UnifiedUserData) {
  const presentBiomarkerKeys = CE_PHENOAGE_KEYS.filter((k) => data[PHENOAGE_FIELD_MAP[k]] != null);
  const hasComposition = data.weight_kg != null && data.height_cm != null && data.body_fat_pct != null;
  const presentDomains = Object.keys(data.sf_scores_by_domain ?? {});
  const hasCognitive = data.reaction_time_simple_ms != null && data.reaction_time_choice_ms != null;
  return { presentBiomarkerKeys: [...presentBiomarkerKeys], hasComposition, presentDomains, hasCognitive };
}

/**
 * Calcula la CE leyendo de TODAS las fuentes (lab_results, health_measurements,
 * lab_uploads, edad_atp_*) vía loadUserData — un usuario con labs ya registrados
 * obtiene CE sin re-capturar. Devuelve 0% si falla la lectura.
 */
export async function computeCE(userId: string): Promise<CEResult> {
  try {
    const data = await loadUserData(userId);
    return computeCEFromData(unifiedToCEData(data));
  } catch (err) {
    logWarn('[edad-atp ce] computeCE failed:', err);
    return { ce_integral: 0, breakdown: { biomarkers: 0, composition: 0, questionnaires: 0, cognitive: 0 } };
  }
}
