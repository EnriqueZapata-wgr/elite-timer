/**
 * Scoring interim de los cuestionarios SF de Edad ATP.
 *
 * El esquema de preguntas (QuestionOption) NO tiene option_order/option_score, y el
 * orden de las opciones en pantalla NO es consistente (unas van sano→no-sano, otras al
 * revés, y algunas tienen "No sé"). Por eso aquí se define explícitamente, por pregunta,
 * el orden de valores de MÁS SANO → MENOS SANO. El score es lineal (100..0); los valores
 * no listados (p. ej. "desconocido"/"No sé") se tratan como neutrales (50).
 *
 * // TODO Sprint 5: Mariana valida rangos de 9 bandas por pregunta. Este scoring lineal es interim.
 */
import type { DomainKey } from '@/src/types/edad-atp-v2';

// Por dominio → parameter_key → valores ordenados de MÁS SANO a MENOS SANO.
export const DOMAIN_SCORING: Record<string, Record<string, string[]>> = {
  metabolismo: {
    meals_per_day: ['1', '2', '3', '4', '5+'],
    fasting_habit: ['if_omad', 'if_regular', 'ocasional', 'no'],
    metabolic_flexibility: ['excelente', 'buena', 'regular', 'mala'],
    sugar_cravings: ['minima', 'baja', 'media', 'alta'],
    post_meal_energy: ['energico', 'estable', 'leve', 'bajon'],
  },
  habitos: {
    exercise_freq: ['5+', '3-4', '1-2', '0'],
    alcohol: ['nunca', 'ocasional', 'finde', 'diario'],
    smoking: ['nunca', 'ex', 'ocasional', 'diario'],
    screens_before_bed: ['casi_nunca', 'aveces', 'casi', 'siempre'],
    processed_food: ['minima', 'baja', 'media', 'alta'],
  },
  cardiovascular: {
    cardio_freq: ['4+', '2-3', '1', 'nunca'],
    breathlessness: ['nunca', 'raro', 'aveces', 'siempre'],
    family_history: ['no', 'tardia', 'temprana'], // 'desconocido' → neutral
    bp_known: ['normal', 'limitrofe', 'alta'], // 'desconocido' → neutral
    palpitations: ['nunca', 'raro', 'aveces', 'frecuente'],
  },
  sueno: {
    sleep_hours: ['7-8', '>8', '5-6', '<5'],
    sleep_latency: ['<10', '10-20', '20-45', '>45'],
    awakenings: ['ninguno', 'raro', '1-2', '3+'],
    morning_feeling: ['renovado', 'bien', 'cansado', 'agotado'],
    snoring_apnea: ['no', 'leve', 'ronquido', 'apneas'],
  },
  sistema_hormonal: {
    libido: ['alta', 'normal', 'baja', 'muy_baja'],
    morning_energy: ['excelente', 'buena', 'baja', 'nula'],
    mood_stability: ['muy_estable', 'estable', 'irritable', 'variable'],
    stress_recovery: ['muy_bien', 'bien', 'poco', 'nada'],
    body_temp: ['nunca', 'raro', 'aveces', 'siempre'],
  },
  vitalidad: {
    daily_energy: ['alta', 'buena', 'baja', 'muy_baja'],
    motivation: ['alta', 'buena', 'baja', 'nula'],
    mental_clarity: ['excelente', 'buena', 'regular', 'niebla'],
    afternoon_crash: ['no', 'leve', 'moderado', 'severo'],
    recovery: ['rapida', 'normal', 'lenta', 'muy_lenta'],
  },
  inflamacion: {
    joint_pain: ['nunca', 'ocasional', 'frecuente', 'diario'],
    bloating: ['nunca', 'ocasional', 'frecuente', 'diario'],
    skin_issues: ['no', 'raro', 'aveces', 'frecuentes'],
    allergies: ['ninguna', 'leves', 'una', 'varias'],
    recovery_illness: ['minimo', 'dias', '1sem', '>2sem'],
  },
  renal_micronutrientes: {
    water_intake: ['>3', '2-3', '1-2', '<1'],
    urine_color: ['transparente', 'clara', 'amarilla', 'oscura'],
    supplements: ['protocolo', '3-5', '1-2', 'ninguno'],
    cramps: ['nunca', 'raro', 'aveces', 'frecuentes'],
    salt_intake: ['bajo', 'moderado', 'alto', 'muy_alto'],
  },
  inmunidad: {
    infections_per_year: ['0-1', '2-3', '4-5', '6+'],
    wound_healing: ['rapido', 'normal', 'lento', 'muy_lento'],
    gut_health: ['excelente', 'buena', 'regular', 'mala'],
    autoimmune: ['no', 'sospecha', 'controlado', 'activo'],
    recovery_after_training: ['nunca', 'raro', 'aveces', 'siempre'],
  },
};

/** Score 0-100 de una respuesta. Valores no listados → 50 (neutral / "no sé"). */
export function scoreOption(domain: string, parameterKey: string, value: string): number {
  const arr = DOMAIN_SCORING[domain]?.[parameterKey];
  if (!arr) return 50;
  const idx = arr.indexOf(value);
  if (idx < 0) return 50;
  if (arr.length === 1) return 100;
  return Math.round((1 - idx / (arr.length - 1)) * 100);
}

export type QResponseRow = { domain: string; parameter_key: string; value_text: string | null };

/**
 * Promedio de scores por dominio (0-100) a partir de las respuestas reales.
 * Dominios sin respuestas válidas no aparecen en el resultado.
 */
export function scoreQuestionnaireResponses(rows: QResponseRow[]): Partial<Record<DomainKey, number>> {
  const acc: Record<string, { sum: number; n: number }> = {};
  for (const r of rows) {
    if (r.value_text == null) continue;
    const s = scoreOption(r.domain, r.parameter_key, r.value_text);
    if (!acc[r.domain]) acc[r.domain] = { sum: 0, n: 0 };
    acc[r.domain].sum += s;
    acc[r.domain].n += 1;
  }
  const out: Partial<Record<DomainKey, number>> = {};
  for (const [domain, { sum, n }] of Object.entries(acc)) {
    if (n > 0) out[domain as DomainKey] = sum / n;
  }
  return out;
}
