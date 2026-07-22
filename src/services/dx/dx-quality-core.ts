/**
 * Mi Diagnóstico Funcional — cálculo PURO del nivel de calidad (1-5).
 *
 * Sin react-native/supabase → testeable con vitest (patrón *-core del repo).
 * El I/O (cosechar fuentes, llamar ARGOS, persistir versión) vive en
 * dx-engine.ts (Fase 2). Aquí solo la lógica determinística de nivel + "qué falta".
 *
 * Recalibrado (hotfix 2da pasada, 2026-07-13): el nivel refleja la DENSIDAD
 * REAL de data que el motor cosecha (Braverman, quizzes, labs, síntomas,
 * padecimientos, suplementos, levantamientos) — antes solo contaban los
 * cuestionarios formales y un usuario con Braverman + quizzes + labs +
 * síntomas se quedaba clavado en nivel 1 aunque el análisis sí los usara.
 *
 * Niveles:
 *   1 · Piso (poca data)
 *   2 · Densidad básica  (score ≥ DENSITY_SCORE_FOR_L2)
 *   3 · Densidad sólida  (score ≥ DENSITY_SCORE_FOR_L3)
 *   4 · Nivel 3 + laboratorios
 *   5 · Nivel 4 + genéticos (máximo)
 *
 * Labs y genéticos siguen siendo compuertas duras de 4/5 (brief 2026-07-11);
 * la densidad solo sustituye a los cuestionarios formales en 2/3. Regla
 * "falta de data ≠ ausencia" se respeta aguas arriba (confidence por raíz).
 */

/** Cuántos sub-levantamientos por área puntúan (tope del score de áreas). */
export const AREA_QUESTIONNAIRES_FOR_L3 = 3;

/** Umbrales de densidad (ver computeDataDensityScore, máx 17). */
export const DENSITY_SCORE_FOR_L2 = 3;
export const DENSITY_SCORE_FOR_L3 = 6;

export interface DxSourcePresence {
  /** client_profiles / historia clínica básica llena. */
  hasBasicHistory: boolean;
  /** Cuestionario integral (choncho) respondido. */
  hasIntegralQuestionnaire: boolean;
  /** Sub-levantamientos por área completados (de 9). */
  areaQuestionnairesCount: number;
  /** Hábitos registrados de forma consistente. */
  hasConsistentHabits: boolean;
  /** Al menos un set de laboratorios. */
  hasLabs: boolean;
  /** Datos genéticos cargados. */
  hasGenetics: boolean;
  /** Braverman completo (313Q). */
  hasBraverman: boolean;
  /** Quizzes funcionales completos. */
  quizzesCount: number;
  /** Síntomas registrados (clínicos por sistema + aislados). */
  symptomsCount: number;
  /** Padecimientos registrados. */
  padecimientosCount: number;
  /** Suplementos activos. */
  supplementsCount: number;
}

export type DxQualityLevel = 1 | 2 | 3 | 4 | 5;

/** Labels de nivel compartidos por la Card A y el PDF (recalibrado por densidad). */
export const DX_LEVEL_LABELS: Record<DxQualityLevel, string> = {
  1: 'Data inicial',
  2: 'Densidad básica',
  3: 'Densidad sólida',
  4: 'Con laboratorios',
  5: 'Completo (genéticos)',
};

/** Key estable por fuente faltante — la UI mapea key → ruta del CTA. */
export type DxMissingKey =
  | 'historia_basica'
  | 'integral'
  | 'areas'
  | 'habitos'
  | 'braverman'
  | 'quizzes'
  | 'labs'
  | 'geneticos';

export interface DxMissingItem {
  key: DxMissingKey;
  label: string;
}

export interface DxQualityResult {
  level: DxQualityLevel;
  /** El siguiente paso de mayor impacto para subir de nivel (null si ya es 5). */
  nextHint: string | null;
  /** Fuentes aún no aportadas (key navegable + label de usuario). */
  missing: DxMissingItem[];
  /** Densidad de data 0-16 (transparencia/debug). */
  densityScore: number;
}

/**
 * Score de densidad de data (0-17). Pesos por poder diagnóstico:
 * integral 3 · áreas hasta 3 · Braverman 2 · quizzes hasta 2 · labs 2 ·
 * historia básica, hábitos, síntomas (≥3), padecimientos y suplementos 1 c/u.
 */
export function computeDataDensityScore(s: DxSourcePresence): number {
  let score = 0;
  if (s.hasBasicHistory) score += 1;
  if (s.hasIntegralQuestionnaire) score += 3;
  score += Math.min(Math.max(0, s.areaQuestionnairesCount), AREA_QUESTIONNAIRES_FOR_L3);
  if (s.hasConsistentHabits) score += 1;
  if (s.hasBraverman) score += 2;
  score += Math.min(Math.max(0, s.quizzesCount), 2);
  if (s.symptomsCount >= 3) score += 1;
  if (s.padecimientosCount >= 1) score += 1;
  if (s.supplementsCount >= 1) score += 1;
  if (s.hasLabs) score += 2;
  return score;
}

/**
 * Calcula el nivel de calidad del DX y el "qué te falta" didáctico.
 * El nivel mínimo es 1 (piso); si ni la historia básica está, se refleja en
 * `missing` y `nextHint` sin bajar de 1.
 */
export function computeDxQuality(s: DxSourcePresence): DxQualityResult {
  const densityScore = computeDataDensityScore(s);

  let level: DxQualityLevel = 1;
  if (densityScore >= DENSITY_SCORE_FOR_L2) level = 2;
  if (densityScore >= DENSITY_SCORE_FOR_L3) level = 3;
  if (level === 3 && s.hasLabs) level = 4;
  if (level === 4 && s.hasGenetics) level = 5;

  const missing: DxMissingItem[] = [];
  if (!s.hasBasicHistory) missing.push({ key: 'historia_basica', label: 'Historia clínica básica' });
  if (!s.hasIntegralQuestionnaire) missing.push({ key: 'integral', label: 'Cuestionario integral' });
  if (s.areaQuestionnairesCount < AREA_QUESTIONNAIRES_FOR_L3) {
    missing.push({
      key: 'areas',
      label: `Cuestionarios por área (${s.areaQuestionnairesCount}/${AREA_QUESTIONNAIRES_FOR_L3})`,
    });
  }
  if (!s.hasConsistentHabits) missing.push({ key: 'habitos', label: 'Hábitos consistentes' });
  if (!s.hasBraverman) missing.push({ key: 'braverman', label: 'Test Braverman' });
  if (s.quizzesCount < 2) {
    missing.push({ key: 'quizzes', label: `Quizzes funcionales (${Math.min(Math.max(0, s.quizzesCount), 2)}/2)` });
  }
  if (!s.hasLabs) missing.push({ key: 'labs', label: 'Laboratorios' });
  if (!s.hasGenetics) missing.push({ key: 'geneticos', label: 'Genéticos' });

  const nextHint = computeNextHint(level, s);
  return { level, nextHint, missing, densityScore };
}

/** El siguiente paso de MAYOR impacto en densidad (orden = puntos que aporta). */
function computeNextHint(level: DxQualityLevel, s: DxSourcePresence): string | null {
  if (!s.hasBasicHistory) {
    return 'Completa tu historia clínica básica para arrancar tu mapa funcional.';
  }
  if (level < 3) {
    if (!s.hasIntegralQuestionnaire) {
      return 'Responde el cuestionario integral — es el paso que más sube tu mapa funcional.';
    }
    if (s.areaQuestionnairesCount < AREA_QUESTIONNAIRES_FOR_L3) {
      return `Completa ${AREA_QUESTIONNAIRES_FOR_L3} cuestionarios por área para subir de nivel.`;
    }
    if (!s.hasBraverman) {
      return 'Haz el test Braverman para subir de nivel.';
    }
    if (s.quizzesCount < 2) {
      return 'Completa quizzes funcionales para subir de nivel.';
    }
    return 'Registra hábitos, síntomas y suplementos para subir de nivel.';
  }
  if (level < 4) {
    return 'Sube un laboratorio para llegar a nivel 4.';
  }
  if (level < 5) {
    return 'Agrega tus genéticos para alcanzar el nivel máximo (5).';
  }
  return null;
}
