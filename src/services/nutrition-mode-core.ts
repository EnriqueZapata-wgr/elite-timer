/**
 * Modo nutrición SIMPLE vs COMPLETO — lógica pura (#52, Sprint NUTRICIÓN T2).
 *
 * 'simple' (default): score + proteína. 'complete' (opt-in): macros, micros,
 * timing, calidad. Filosofía "guiado no prisionero" — nadie forzado.
 *
 * Unificación con el precursor `macro_mode` (booleano PRD §6.6): mientras
 * ambos campos convivan, `nutrition_mode` es la verdad y `macro_mode` se
 * deriva de él (complete → macros visibles).
 */

export type NutritionMode = 'simple' | 'complete';

export interface NutritionModeRow {
  nutrition_mode?: string | null;
  macro_mode?: boolean | null;
}

/**
 * Resuelve el modo desde la fila de client_profiles:
 *  1. nutrition_mode válido → ese.
 *  2. Sin nutrition_mode (perfil pre-166) → deriva de macro_mode.
 *  3. Sin nada → 'simple' (default filosofía).
 */
export function resolveNutritionMode(row: NutritionModeRow | null | undefined): NutritionMode {
  if (row?.nutrition_mode === 'complete' || row?.nutrition_mode === 'simple') {
    return row.nutrition_mode;
  }
  if (row?.macro_mode === true) return 'complete';
  return 'simple';
}

/** macro_mode que corresponde a un modo (sync transicional). */
export function macroModeFor(mode: NutritionMode): boolean {
  return mode === 'complete';
}

/** ¿La card/feature es visible en este modo? (mapa del hub, T1). */
export function isFeatureVisible(
  feature: 'score' | 'register' | 'fasting' | 'recipes' | 'supplements' | 'argos' | 'glucose' | 'scanner',
  mode: NutritionMode,
): boolean {
  if (mode === 'complete') return true;
  // SIMPLE: esencial sin ruido — score, registrar, ayuno (si activo) y ARGOS.
  return feature === 'score' || feature === 'register' || feature === 'fasting' || feature === 'argos';
}
