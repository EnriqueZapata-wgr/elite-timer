/**
 * fitzpatrick-core — scoring puro del cuestionario de fototipo Fitzpatrick (Salud F5).
 *
 * Fitzpatrick Skin Type Classification (Harvard Medical School, 1975): 6 preguntas,
 * cada opción vale 0-4 puntos, total 0-24 → fototipo I-VI. El resultado se guarda
 * como entero 1-6 en profiles.skin_type (migración 058), la MISMA columna que usa
 * ATP SOL y la card UV del HOY — una sola fuente de verdad de fototipo.
 *
 * Screening, no diagnóstico. Copy de dermatólogo obligatorio al mostrar resultado
 * (ver nota clínica en R and D/CUESTIONARIO_FITZPATRICK_v1_2026-07-11.md).
 */
import type { TestAnswers } from '@/src/components/tests/test-question-types';

/** ID de la categoría en historia_clinica.data (y en HC_QUESTIONNAIRES). */
export const FITZPATRICK_HC_ID = 'fitzpatrick';

/**
 * Puntos por opción (0-4) por pregunta. Debe cubrir exactamente las opciones del
 * cuestionario 'fitzpatrick' en historia-clinica-questionnaires.ts (test lo verifica).
 */
export const FITZPATRICK_POINTS: Record<string, Record<string, number>> = {
  eye_color: { azul_claro: 0, azul_oscuro: 1, cafe_claro: 2, cafe_oscuro: 3, negro: 4 },
  hair_color: { pelirrojo: 0, rubio: 1, castano_medio: 2, castano_oscuro: 3, negro: 4 },
  skin_color_unexposed: { muy_blanca: 0, blanca: 1, beige: 2, morena_clara: 3, oscura: 4 },
  freckles: { muchas: 0, bastantes: 1, algunas: 2, pocas: 3, ninguna: 4 },
  sun_reaction: { siempre_quema: 0, casi_siempre_quema: 1, a_veces_quema: 2, rara_vez_quema: 3, nunca_quema: 4 },
  tanning_ability: { nunca: 0, muy_poco: 1, ligero: 2, bien: 3, profundo: 4 },
};

/** Suma total 0-24. null si falta alguna respuesta o hay una opción desconocida. */
export function scoreFitzpatrick(answers: TestAnswers): number | null {
  let total = 0;
  for (const [questionId, points] of Object.entries(FITZPATRICK_POINTS)) {
    const answer = answers[questionId];
    if (typeof answer !== 'string') return null;
    const pts = points[answer];
    if (pts === undefined) return null;
    total += pts;
  }
  return total;
}

/** Mapea puntaje 0-24 → fototipo 1-6 (entero compatible con profiles.skin_type). */
export function fitzpatrickTypeFromScore(total: number): number {
  if (total <= 4) return 1;
  if (total <= 9) return 2;
  if (total <= 14) return 3;
  if (total <= 19) return 4;
  if (total <= 22) return 5;
  return 6;
}

/** Numeral romano para display ("Fototipo III"). Índice = skin_type - 1. */
export const FITZPATRICK_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

/** Dosis de sol matutino por fototipo (intervención exposicion_solar_matutina, catálogo v3). */
export const SOLAR_DOSE_LABELS: Record<number, string> = {
  1: '5 min',
  2: '10 min',
  3: '10-15 min',
  4: '15-20 min',
  5: '20-25 min',
  6: '25-30 min',
};

const SOLAR_INTERVENTION_KEY = 'exposicion_solar_matutina';

/**
 * Personaliza el `how` mostrado de una intervención según el fototipo del perfil.
 * Solo aplica a exposicion_solar_matutina con skin_type válido; el resto pasa intacto.
 */
export function personalizeInterventionHow(
  interventionKey: string,
  how: string,
  skinType: number | null | undefined,
): string {
  if (interventionKey !== SOLAR_INTERVENTION_KEY || !skinType || !SOLAR_DOSE_LABELS[skinType]) {
    return how;
  }
  return (
    `Sal a luz solar directa entre 7-9am, ojos abiertos sin lentes de sol. ` +
    `Tu dosis (fototipo ${FITZPATRICK_ROMAN[skinType - 1]}): ${SOLAR_DOSE_LABELS[skinType]}.`
  );
}
