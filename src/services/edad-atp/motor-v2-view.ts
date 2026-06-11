/**
 * motor-v2-view — adapta MotorV2Result → EdadAtpV2Result (la forma que consume la UI).
 * PURO (sin supabase/react-native) para testear la normalización sin mocks.
 *
 * Doctrina del sprint captura unificada: ÚNICA fuente de verdad para la UI son los
 * `components` del motor v2. Este módulo los normaliza a semántica UI; ninguna
 * pantalla hace lookups paralelos ni re-banda por su cuenta.
 *
 * El motor emite `score_0_100` con semánticas DISTINTAS por área (no se toca el motor):
 *  - composicion/fitness/riesgos: score real 0-100 → directo.
 *  - labs PhenoAge core (9): score null POR DISEÑO aunque haya valor (alimentan la
 *    fórmula PhenoAge, no se bandan individualmente) → banda "capturado", NO "pendiente".
 *  - labs modificadores (7): score = delta de edad en años (−1..+2, negativo = mejor)
 *    → se normaliza 0-100 interpolando entre el mejor y peor delta de cada modificador.
 *  - cognicion: score = edad parcial en años → banda por delta vs cronológica (±1).
 *
 * Bandas (≥80 óptimo · ≥50 aceptable · <50 atención · sin dato pendiente). PROHIBIDO
 * el label ambiguo "bajo" (bug B2 del smoke 2026-06-11: Vit D 51.8 y cortisol 11.2
 * ÓPTIMOS etiquetados "bajo").
 */
import type { MotorV2Result } from '@/src/types/motor-edad-atp-v2';
import type { AreaComponent } from '@/src/types/motor-edad-atp-v2';
import type { EdadAtpV2Result, SubEdadComponent, SubEdadKey, SubEdadResult } from '@/src/types/edad-atp-v2';

/** Las 9 claves PhenoAge core (mismas que PHENO_FIELDS del área labs). */
const LABS_CORE = new Set([
  'albumin_g_dl', 'creatinine_mg_dl', 'glucose_mg_dl', 'crp_mg_dl', 'lymphocyte_pct',
  'mcv_fl', 'rdw_cv_pct', 'alp_u_l', 'wbc_thousands_ul',
]);

/**
 * [mejor delta, peor delta] por modificador de labs — espejo SOLO PARA DISPLAY de
 * los rangos de area-labs-service (modVitD: −1..+1, modB12: −0.5..+2, etc.).
 */
const LABS_MOD_RANGE: Record<string, [number, number]> = {
  vit_d: [-1, 1],
  vit_b12: [-0.5, 2],
  homocysteine: [-1, 2],
  ferritin: [-0.5, 1],
  tsh: [-0.5, 1],
  cortisol: [0, 1],
  bilirubin: [-0.5, 0.5],
};

export function bandFromScore(score: number | null): NonNullable<SubEdadComponent['band']> {
  if (score == null) return 'pendiente';
  if (score >= 80) return 'optimo';
  if (score >= 50) return 'aceptable';
  return 'atencion';
}

/** Normaliza un AreaComponent del motor → SubEdadComponent UI (score SIEMPRE 0-100). */
export function normalizeComponent(
  area: SubEdadKey,
  key: string,
  c: AreaComponent,
  cronologica: number,
  hdlValue: number | null,
): SubEdadComponent {
  // Labs PhenoAge core: presente = capturado (alimenta PhenoAge), nunca "pendiente" con dato.
  if (area === 'labs' && LABS_CORE.has(key)) {
    const missing = c.value == null;
    return {
      value: c.value ?? 0, score_0_100: missing ? 0 : 100, weight: c.weight,
      missing, band: missing ? 'pendiente' : 'capturado',
    };
  }
  // Labs modificadores: delta de edad → 0-100 (delta mejor posible = 100, peor = 0).
  if (area === 'labs') {
    if (c.score_0_100 == null) {
      return { value: c.value ?? 0, score_0_100: 0, weight: c.weight, missing: true, band: 'pendiente' };
    }
    const [best, worst] = LABS_MOD_RANGE[key] ?? [-1, 2];
    const norm = Math.max(0, Math.min(100, Math.round(100 - ((c.score_0_100 - best) / (worst - best)) * 100)));
    return { value: c.value ?? 0, score_0_100: norm, weight: c.weight, missing: false, band: bandFromScore(norm) };
  }
  // Cognición: score = edad parcial → banda por delta vs cronológica (regla ±1).
  if (area === 'cognicion') {
    if (c.score_0_100 == null) {
      return { value: c.value ?? 0, score_0_100: 0, weight: c.weight, missing: true, band: 'pendiente' };
    }
    const delta = c.score_0_100 - cronologica;
    const norm = delta <= -1 ? 85 : delta < 1 ? 65 : 30;
    return { value: c.value ?? 0, score_0_100: norm, weight: c.weight, missing: false, band: bandFromScore(norm) };
  }
  // composicion / fitness / riesgos: score real 0-100.
  const missing = c.score_0_100 == null;
  let display_value: number | null | undefined;
  if (key === 'ratio_tg_hdl') {
    // El motor guarda en `value` los TRIGLICÉRIDOS (campo base del ratio) — bug B3:
    // la UI mostraba 65.0 en vez de ~1.0. El derivado real es tg/hdl.
    display_value = c.value != null && hdlValue ? Math.round((c.value / hdlValue) * 100) / 100 : null;
  } else if (key === 'ffmi') {
    display_value = c.value != null ? Math.round(c.value * 100) / 100 : null; // ya viene derivado
  }
  return {
    value: c.value ?? 0, score_0_100: c.score_0_100 ?? 0, weight: c.weight,
    missing, band: missing ? 'pendiente' : bandFromScore(c.score_0_100), display_value,
  };
}

/**
 * Adapta MotorV2Result → EdadAtpV2Result. La edad por sub-edad es la AJUSTADA
 * (anclada a cronológica), que es la que pesa en el integral. CE mostrado por
 * sub-edad = `areas[key].ce` del motor — ÚNICA definición.
 */
export function motorResultToView(motor: MotorV2Result): EdadAtpV2Result {
  const keys: SubEdadKey[] = ['labs', 'composicion', 'fitness', 'cognicion', 'riesgos'];
  const sub_edades = {} as Record<SubEdadKey, SubEdadResult>;
  let ceSum = 0;
  for (const k of keys) {
    const a = motor.areas[k];
    const hdlValue = k === 'riesgos' ? (a.components.hdl?.value ?? null) : null;
    const components: SubEdadResult['components'] = {};
    for (const [ck, cv] of Object.entries(a.components)) {
      components[ck] = normalizeComponent(k, ck, cv, motor.cronologica, hdlValue);
    }
    sub_edades[k] = { age_years: a.edad_ajustada, ce_percent: a.ce * 100, components };
    ceSum += a.ce;
  }
  return {
    chronological_age: motor.cronologica,
    edad_integral: motor.edad_atp_integral,
    modificador_cognitivo: 0,
    ce_integral: ceSum / keys.length,
    delta_anos: motor.delta_anos,
    habitos: motor.habitos,
    sub_edades,
  };
}
