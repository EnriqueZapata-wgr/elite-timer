/**
 * Mi Diagnóstico Funcional — cálculo PURO del nivel de calidad (1-5).
 *
 * Sin react-native/supabase → testeable con vitest (patrón *-core del repo).
 * El I/O (cosechar fuentes, llamar ARGOS, persistir versión) vive en
 * dx-engine.ts (Fase 2). Aquí solo la lógica determinística de nivel + "qué falta".
 *
 * Niveles (brief 2026-07-11):
 *   1 · Historia clínica básica
 *   2 · + Cuestionario integral
 *   3 · + Cuestionarios por área + hábitos consistentes
 *   4 · + Laboratorios
 *   5 · + Genéticos (máximo)
 *
 * Monótono: el nivel es el tramo más alto cuyos prerrequisitos (acumulados) se
 * cumplen. Regla "falta de data ≠ ausencia" se respeta aguas arriba (el motor
 * marca confidence por raíz); aquí solo medimos completitud de fuentes.
 */

/** Cuántos sub-levantamientos por área se necesitan para el nivel 3. */
export const AREA_QUESTIONNAIRES_FOR_L3 = 3;

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
}

export type DxQualityLevel = 1 | 2 | 3 | 4 | 5;

export interface DxQualityResult {
  level: DxQualityLevel;
  /** El siguiente paso de mayor impacto para subir de nivel (null si ya es 5). */
  nextHint: string | null;
  /** Fuentes aún no aportadas, en lenguaje de usuario. */
  missing: string[];
}

/**
 * Calcula el nivel de calidad del DX y el "qué te falta" didáctico.
 * El nivel mínimo es 1 (piso); si ni la historia básica está, se refleja en
 * `missing` y `nextHint` sin bajar de 1.
 */
export function computeDxQuality(s: DxSourcePresence): DxQualityResult {
  const areasOk = s.areaQuestionnairesCount >= AREA_QUESTIONNAIRES_FOR_L3;

  let level: DxQualityLevel = 1;
  if (s.hasIntegralQuestionnaire) level = 2;
  if (level === 2 && areasOk && s.hasConsistentHabits) level = 3;
  if (level === 3 && s.hasLabs) level = 4;
  if (level === 4 && s.hasGenetics) level = 5;

  const missing: string[] = [];
  if (!s.hasBasicHistory) missing.push('Historia clínica básica');
  if (!s.hasIntegralQuestionnaire) missing.push('Cuestionario integral');
  if (!areasOk) {
    missing.push(
      `Cuestionarios por área (${s.areaQuestionnairesCount}/${AREA_QUESTIONNAIRES_FOR_L3})`,
    );
  }
  if (!s.hasConsistentHabits) missing.push('Hábitos consistentes');
  if (!s.hasLabs) missing.push('Laboratorios');
  if (!s.hasGenetics) missing.push('Genéticos');

  const nextHint = computeNextHint(level, s, areasOk);
  return { level, nextHint, missing };
}

function computeNextHint(
  level: DxQualityLevel,
  s: DxSourcePresence,
  areasOk: boolean,
): string | null {
  if (!s.hasBasicHistory) {
    return 'Completa tu historia clínica básica para arrancar tu diagnóstico.';
  }
  if (level < 2) {
    return 'Responde el cuestionario integral para subir a nivel 2.';
  }
  if (level < 3) {
    if (!areasOk && !s.hasConsistentHabits) {
      return 'Completa cuestionarios por área y registra hábitos para el nivel 3.';
    }
    if (!areasOk) {
      return `Completa ${AREA_QUESTIONNAIRES_FOR_L3} cuestionarios por área para el nivel 3.`;
    }
    return 'Registra hábitos de forma consistente para el nivel 3.';
  }
  if (level < 4) {
    return 'Sube un laboratorio para llegar a nivel 4.';
  }
  if (level < 5) {
    return 'Agrega tus genéticos para alcanzar el nivel máximo (5).';
  }
  return null;
}
