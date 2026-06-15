/**
 * Mapping categorical (cuestionario hábitos) → numeric (modulador de hábitos del motor v2).
 * Opción B aprobada por Enrique (2026-06-15): no se reescribe el cuestionario; solo se
 * traducen sus respuestas categóricas a valores numéricos defensibles antes del modulador.
 *
 * Bug que arregla: `app/edad-atp/questionnaires/habitos.tsx` guarda value_text categórico
 * (exercise_freq, alcohol, smoking) bajo domain='habitos', pero el modulador lee keys
 * numéricas (ejercicio_semanal, consumo_de_alcohol_mensual, tabaquismo). Sin puente,
 * presentWeight≈0 → score default 60 → factor 1.0. Con el puente, un perfil elite cae en
 * banda ≥80 → factor 0.95 (≈1.5 años menos).
 *
 * UNIDADES (verificadas contra el scorer del modulador Y la matriz V8):
 *   ejercicio_semanal           → hr/semana  (matriz: "hr/semana"; scorer: <2→0…10–25→100)
 *   consumo_de_alcohol_mensual  → copas/mes  (matriz: "copas/mes"; scorer: ≤4→100…>16→0)
 *   tabaquismo                  → cigarros/día (matriz: "Cigarros/día"; scorer: 0→100, ≤5→25, >5→0)
 *
 * IMPORTANTE: las claves/valores son los REALES que emite el cuestionario actual
 * (exercise_freq: '0'|'1-2'|'3-4'|'5+'; alcohol: 'nunca'|'ocasional'|'finde'|'diario';
 * smoking: 'nunca'|'ocasional'|'ex'|'diario'), NO los hipotéticos del brief. Ver flags en
 * COWORK_REPORT.md (incl. 'ex' → 0 cig/día, no 0.5).
 */

/** cuestionario key → valor categórico (lowercased) → valor numérico en unidad del modulador. */
export const HABITS_CATEGORICAL_MAP: Record<string, Record<string, number>> = {
  // Días/semana de entrenamiento → horas/semana estimadas (~2 h por sesión).
  exercise_freq: { '0': 0, '1-2': 3, '3-4': 6, '5+': 10 },
  // Frecuencia → copas/mes aproximadas.
  alcohol: { nunca: 0, ocasional: 3, finde: 8, diario: 30 },
  // Estatus → cigarros/día (el modulador mide el hábito ACTUAL: ex-fumador no fuma hoy → 0).
  smoking: { nunca: 0, ex: 0, ocasional: 2, diario: 10 },
};

/** cuestionario key → key numérica que espera el modulador (cuando difieren). */
export const HABITS_KEY_ALIASES: Record<string, string> = {
  exercise_freq: 'ejercicio_semanal',
  alcohol: 'consumo_de_alcohol_mensual',
  smoking: 'tabaquismo',
};

/**
 * Traduce un par key+valor categórico al valor numérico del modulador.
 * @returns el número, o undefined si la key no está catalogada o el valor es desconocido
 *          (el modulador trata "ausente" como no-capturado y renormaliza — nunca como 0).
 */
export function mapCategoricalToNumeric(questionnaireKey: string, categoricalValue: string): number | undefined {
  const map = HABITS_CATEGORICAL_MAP[questionnaireKey];
  if (!map) return undefined;
  const v = map[String(categoricalValue).toLowerCase().trim()];
  return v === undefined ? undefined : v;
}

/**
 * Mapea un dict de respuestas categóricas {questionnaireKey: value_text} a {moduladorKey: number}.
 * Respeta valores ya numéricos (futuro-proof: si el cuestionario migra a numeric). Ignora keys
 * sin mapeo (screens_before_bed, processed_food no son inputs del modulador).
 */
export function mapHabitsResponses(
  responses: Record<string, string | number | null | undefined>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [qKey, qVal] of Object.entries(responses)) {
    if (qVal == null) continue;
    const moduladorKey = HABITS_KEY_ALIASES[qKey] ?? qKey;
    if (typeof qVal === 'number') {
      if (Number.isFinite(qVal)) out[moduladorKey] = qVal; // ya numérico → tal cual
      continue;
    }
    const numeric = mapCategoricalToNumeric(qKey, qVal);
    if (numeric !== undefined) out[moduladorKey] = numeric;
  }
  return out;
}
