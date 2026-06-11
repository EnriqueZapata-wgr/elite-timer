/**
 * loadAllParamValues — lee los ~138 params de la matriz V7/V6 desde TODAS las fuentes
 * y devuelve un dict plano { param_key_matriz: valor } listo para computeSFGlobalReal.
 *
 * Fuentes (1 query c/u, en paralelo): lab_results, edad_atp_biomarkers,
 * lab_uploads.extracted_data, health_measurements, edad_atp_questionnaire_responses,
 * edad_atp_functional_tests. Resuelve cada param vía PARAM_SOURCE_MAP y calcula los
 * params `computed` al final. Aplica conversión de unidades DB→matriz cuando aplica.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getMatriz } from './sf-9band-service';
import { resolveParamSource, COMPUTED_PARAMS, FT_KEY_ALIASES, MOTOR_PASSTHROUGH_FT_KEYS, MOTOR_PASSTHROUGH_QUEST_KEYS } from '@/src/constants/edad-atp-source-map';
import { coalesceHealthRows, HEALTH_COALESCE_ROWS } from './capture-service';
import type { Sex } from '@/src/types/edad-atp-v2';

function latestByKey<T extends Record<string, any>>(rows: T[], keyField: string, valField: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = r[keyField];
    if (out[k] === undefined && r[valField] != null) out[k] = r[valField];
  }
  return out;
}

function flattenExtracted(raw: any): Record<string, number> {
  const out: Record<string, number> = {};
  const ev = raw?.values ?? raw;
  if (ev && typeof ev === 'object') {
    for (const [k, v] of Object.entries(ev)) {
      const val = typeof v === 'number' ? v : (v as any)?.value;
      if (typeof val === 'number' && Number.isFinite(val)) out[k] = val;
    }
  }
  return out;
}

/** Versión pura (testeable): resuelve los params desde lookups ya cargados. */
export function resolveParamValues(
  sex: Sex,
  src: { lab: Record<string, any>; bio: Record<string, number>; ext: Record<string, number>; hm: Record<string, any>; quest: Record<string, number>; ft: Record<string, number> },
): Record<string, number> {
  const matriz = getMatriz(sex);
  const out: Record<string, number> = {};
  for (const domKey of Object.keys(matriz)) {
    for (const p of matriz[domKey].params) {
      const s = resolveParamSource(p.key, p.source);
      let val: number | undefined;
      switch (s.source) {
        case 'lab': {
          for (const c of s.columns) if (src.lab[c] != null) { val = src.lab[c]; break; }
          if (val == null) for (const c of s.columns) if (src.ext[c] != null) { val = src.ext[c]; break; }
          if (val == null && src.ext[p.key] != null) val = src.ext[p.key];
          if (val != null && s.convert) val = s.convert(val);
          break;
        }
        case 'manual': val = src.bio[s.key] ?? src.ext[s.key]; break;
        case 'questionnaire': val = src.quest[s.param_key]; break;
        case 'functional_test': {
          val = src.ft[s.test_key];
          // Aliases legacy: tests guardados con test_key viejo (ej. one_leg_balance)
          // antes de unificar al key de matriz. Sin esto, esas capturas nunca
          // llegaban al motor (bug B8 del smoke 2026-06-11).
          if (val == null) {
            for (const alias of FT_KEY_ALIASES[s.test_key] ?? []) {
              if (src.ft[alias] != null) { val = src.ft[alias]; break; }
            }
          }
          break;
        }
        case 'wearable_or_manual': {
          let raw: number | undefined;
          for (const c of s.columns) if (src.hm[c] != null) { raw = src.hm[c]; break; }
          if (s.convert) {
            const ctx: Record<string, number> = {};
            for (const d of s.deps ?? []) {
              if (typeof src.hm[d] === 'number' && Number.isFinite(src.hm[d])) ctx[d] = src.hm[d];
            }
            val = s.convert(raw, ctx);
          } else {
            val = raw;
          }
          if (val == null) val = src.bio[p.key];
          break;
        }
        case 'computed':
        case 'pending_capture':
          break;
      }
      if (typeof val === 'number' && Number.isFinite(val)) out[p.key] = val;
    }
  }
  // Params calculados (ratios) — tras tener el resto.
  for (const [k, spec] of Object.entries(COMPUTED_PARAMS)) {
    const v = spec.formula(out);
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  // Passthrough motor v2: keys de tests/cuestionarios fuera de la matriz (Go/No-Go, etc.).
  for (const k of MOTOR_PASSTHROUGH_FT_KEYS) {
    if (out[k] === undefined && typeof src.ft[k] === 'number' && Number.isFinite(src.ft[k])) out[k] = src.ft[k];
  }
  for (const k of MOTOR_PASSTHROUGH_QUEST_KEYS) {
    if (out[k] === undefined && typeof src.quest[k] === 'number' && Number.isFinite(src.quest[k])) out[k] = src.quest[k];
  }
  return out;
}

/** Carga e integra desde DB (6 queries en paralelo, cada "última" ordenada DESC). */
export async function loadAllParamValues(userId: string, sex: Sex): Promise<Record<string, number>> {
  try {
    const [labRes, bioRes, upRes, hmRes, qRes, ftRes] = await Promise.all([
      supabase.from('lab_results').select('*').eq('user_id', userId).order('lab_date', { ascending: false }).limit(1),
      supabase.from('edad_atp_biomarkers').select('biomarker_key, value, measured_at').eq('user_id', userId).order('measured_at', { ascending: false }),
      supabase.from('lab_uploads').select('extracted_data').eq('user_id', userId).not('extracted_data', 'is', null).order('uploaded_at', { ascending: false }).limit(1),
      supabase.from('health_measurements').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(HEALTH_COALESCE_ROWS),
      supabase.from('edad_atp_questionnaire_responses').select('parameter_key, value, measured_at').eq('user_id', userId).order('measured_at', { ascending: false }),
      supabase.from('edad_atp_functional_tests').select('test_key, value_primary, measured_at').eq('user_id', userId).order('measured_at', { ascending: false }),
    ]);
    return resolveParamValues(sex, {
      lab: (labRes.data ?? [])[0] ?? {},
      bio: latestByKey(bioRes.data ?? [], 'biomarker_key', 'value'),
      ext: flattenExtracted((upRes.data ?? [])[0]?.extracted_data),
      // Coalesce por columna entre filas (mismo fix que loadUserData — bug B1/B6).
      hm: coalesceHealthRows((hmRes.data ?? []) as Record<string, any>[]) ?? {},
      quest: latestByKey(qRes.data ?? [], 'parameter_key', 'value'),
      ft: latestByKey(ftRes.data ?? [], 'test_key', 'value_primary'),
    });
  } catch (err) {
    logWarn('[edad-atp] loadAllParamValues failed:', err);
    return {};
  }
}
