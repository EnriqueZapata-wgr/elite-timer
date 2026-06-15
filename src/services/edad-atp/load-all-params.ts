/**
 * loadAllParamValues — lee los ~138 params de la matriz V7/V6 desde TODAS las fuentes
 * y devuelve un dict plano { param_key_matriz: valor } listo para computeSFGlobalReal.
 *
 * Labs (lab + manual sin columna): fuente ÚNICA canónica `lab_values` (migración 072) —
 * último valor por parámetro, sin perder paneles previos. Resto de fuentes (1 query c/u):
 * health_measurements (composición/wearable), edad_atp_questionnaire_responses,
 * edad_atp_functional_tests. Resuelve cada param vía PARAM_SOURCE_MAP y calcula los
 * params `computed` al final. La conversión de unidad ya se aplicó al ESCRIBIR a lab_values.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getMatriz } from './sf-9band-service';
import { resolveParamSource, COMPUTED_PARAMS, FT_KEY_ALIASES, MOTOR_PASSTHROUGH_FT_KEYS, MOTOR_PASSTHROUGH_QUEST_KEYS } from '@/src/constants/edad-atp-source-map';
import { coalesceHealthRows, HEALTH_COALESCE_ROWS } from './capture-service';
import { loadCanonicalLabValues, canonicalToValueDict } from './lab-values-service';
import { mapHabitsResponses } from '@/src/constants/habits-categorical-mapping';
import type { Sex } from '@/src/types/edad-atp-v2';

function latestByKey<T extends Record<string, any>>(rows: T[], keyField: string, valField: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = r[keyField];
    if (out[k] === undefined && r[valField] != null) out[k] = r[valField];
  }
  return out;
}

/** Último value_text por parameter_key (respuestas categóricas de cuestionario). */
function latestTextByKey<T extends Record<string, any>>(rows: T[], keyField: string, textField: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const k = r[keyField];
    if (out[k] === undefined && r[textField] != null) out[k] = String(r[textField]);
  }
  return out;
}

/**
 * Versión pura (testeable): resuelve los params desde lookups ya cargados.
 *
 * `canon` = mapa canónico de `lab_values` ({ parameter_key: value }), ya en unidad de matriz.
 * Los params de Laboratorio (`lab`) y los de captura manual sin columna (`manual`) leen de
 * AQUÍ por su clave de matriz — una sola fuente de verdad, sin perder paneles previos.
 */
export function resolveParamValues(
  sex: Sex,
  src: { canon: Record<string, number>; hm: Record<string, any>; quest: Record<string, number>; ft: Record<string, number> },
): Record<string, number> {
  const matriz = getMatriz(sex);
  const out: Record<string, number> = {};
  for (const domKey of Object.keys(matriz)) {
    for (const p of matriz[domKey].params) {
      const s = resolveParamSource(p.key, p.source);
      let val: number | undefined;
      switch (s.source) {
        // Labs: valor canónico por clave de matriz (conversión de unidad ya aplicada al
        // escribir a lab_values). Sin fallback a fuentes viejas — lab_values es la verdad.
        case 'lab': val = src.canon[p.key]; break;
        case 'manual': val = src.canon[s.key]; break;
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
          // Fallback a captura manual canónica (ej. vitals capturados como biomarcador).
          if (val == null) val = src.canon[p.key];
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

/** Carga e integra desde DB. Labs desde lab_values (canónica); resto en paralelo. */
export async function loadAllParamValues(userId: string, sex: Sex): Promise<Record<string, number>> {
  try {
    const [canonMap, hmRes, qRes, ftRes] = await Promise.all([
      loadCanonicalLabValues(userId),
      supabase.from('health_measurements').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(HEALTH_COALESCE_ROWS),
      supabase.from('edad_atp_questionnaire_responses').select('parameter_key, value, value_text, measured_at').eq('user_id', userId).order('measured_at', { ascending: false }),
      supabase.from('edad_atp_functional_tests').select('test_key, value_primary, measured_at').eq('user_id', userId).order('measured_at', { ascending: false }),
    ]);
    const out = resolveParamValues(sex, {
      canon: canonicalToValueDict(canonMap),
      // Coalesce por columna entre filas (mismo fix que loadUserData — bug B1/B6).
      hm: coalesceHealthRows((hmRes.data ?? []) as Record<string, any>[]) ?? {},
      quest: latestByKey(qRes.data ?? [], 'parameter_key', 'value'),
      ft: latestByKey(ftRes.data ?? [], 'test_key', 'value_primary'),
    });
    // Opción B: puente categórico→numérico de hábitos. El cuestionario guarda value_text
    // (exercise_freq, alcohol, smoking); el modulador lee numéricos (ejercicio_semanal,
    // consumo_de_alcohol_mensual, tabaquismo). Mapeamos y rellenamos SOLO si no hay ya un
    // valor numérico (no pisa capturas reales). Sin esto el modulador renormaliza a ~60.
    const habitsText = latestTextByKey(qRes.data ?? [], 'parameter_key', 'value_text');
    const mappedHabits = mapHabitsResponses(habitsText);
    for (const [k, v] of Object.entries(mappedHabits)) {
      if (out[k] === undefined) out[k] = v;
    }
    return out;
  } catch (err) {
    logWarn('[edad-atp] loadAllParamValues failed:', err);
    return {};
  }
}
