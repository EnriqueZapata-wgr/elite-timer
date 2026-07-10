/**
 * Vocabulario controlado de Intervenciones (categorías + raíces).
 *
 * Fuente doctrinal: `Business development/Beta_Launch_Kit/09_CATALOGO_INTERVENCIONES_MARIANA_ENRIQUE.md`.
 * Normalizado por Fable a keys estables. Mariana+Enrique pueden agregar términos
 * nuevos → se catalogan aquí (Cowork).
 *
 * Doble uso:
 *  1. El catálogo (`interventions-catalog.ts`) referencia SOLO estos keys.
 *  2. El motor DX valida las raíces que ARGOS devuelve contra ROOT_KEYS —
 *     cualquier raíz fuera del vocabulario se descarta (mitiga alucinación,
 *     riesgo #3 del mapa).
 */

// ── Categorías (para qué SIRVE) ──────────────────────────────────────────────

export const INTERVENTION_CATEGORIES = [
  'sueno', 'digestion', 'inflamacion', 'estres', 'metabolismo', 'movimiento',
  'hormonal', 'cognitivo', 'inmunologico', 'piel', 'energia', 'ansiedad',
  'hidratacion', 'cardiovascular', 'ritual',
] as const;

export type InterventionCategory = (typeof INTERVENTION_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<InterventionCategory, string> = {
  sueno: 'Sueño',
  digestion: 'Digestión',
  inflamacion: 'Inflamación',
  estres: 'Estrés',
  metabolismo: 'Metabolismo',
  movimiento: 'Movimiento',
  hormonal: 'Hormonal',
  cognitivo: 'Cognitivo/Foco',
  inmunologico: 'Inmunológico',
  piel: 'Piel',
  energia: 'Energía',
  ansiedad: 'Ansiedad',
  hidratacion: 'Hidratación',
  cardiovascular: 'Cardiovascular',
  ritual: 'Ritual/Hábito',
};

// ── Raíces que ataca (causas raíz) ───────────────────────────────────────────

export const INTERVENTION_ROOTS = [
  'estres_cronico',
  'adrenalina_nocturna',
  'cortisol_matutino_bajo',
  'cortisol_elevado_sostenido',
  'hiperinsulinemia',
  'resistencia_insulina',
  'hipertension',
  'disbiosis',
  'permeabilidad_intestinal',
  'sobrecarga_hepatica',
  'inflamacion_silenciosa',
  'deficit_sueno_profundo',
  'ritmo_circadiano_desregulado',
  'sedentarismo',
  'sarcopenia',
  'dominancia_estrogenica',
  'baja_testosterona',
  'hipotiroidismo_funcional',
  'deficit_neurotransmisores',
  'sobreexposicion_luz_azul',
  'deficit_exposicion_solar',
  'toxicidad_ambiental',
  'sobrecarga_procesados',
] as const;

export type InterventionRoot = (typeof INTERVENTION_ROOTS)[number];

export const ROOT_LABELS: Record<InterventionRoot, string> = {
  estres_cronico: 'Estrés crónico',
  adrenalina_nocturna: 'Señales de adrenalina nocturna',
  cortisol_matutino_bajo: 'Bajo cortisol matutino',
  cortisol_elevado_sostenido: 'Cortisol elevado sostenido',
  hiperinsulinemia: 'Hiperinsulinemia',
  resistencia_insulina: 'Resistencia a la insulina',
  hipertension: 'Hipertensión',
  disbiosis: 'Disbiosis intestinal',
  permeabilidad_intestinal: 'Permeabilidad intestinal',
  sobrecarga_hepatica: 'Sobrecarga hepática',
  inflamacion_silenciosa: 'Inflamación sistémica silenciosa',
  deficit_sueno_profundo: 'Deficiencia de sueño profundo',
  ritmo_circadiano_desregulado: 'Ritmo circadiano desregulado',
  sedentarismo: 'Sedentarismo',
  sarcopenia: 'Sarcopenia',
  dominancia_estrogenica: 'Dominancia estrogénica',
  baja_testosterona: 'Baja testosterona',
  hipotiroidismo_funcional: 'Hipotiroidismo funcional',
  deficit_neurotransmisores: 'Deficiencia de neurotransmisores',
  sobreexposicion_luz_azul: 'Sobreexposición a luz azul',
  deficit_exposicion_solar: 'Deficiencia de exposición solar',
  toxicidad_ambiental: 'Toxicidad ambiental',
  sobrecarga_procesados: 'Sobrecarga de procesados',
};

// ── Sets para validación O(1) (usados por el motor DX) ───────────────────────

export const CATEGORY_KEYS = new Set<string>(INTERVENTION_CATEGORIES);
export const ROOT_KEYS = new Set<string>(INTERVENTION_ROOTS);

/** True si `key` es una raíz del vocabulario controlado. */
export function isValidRoot(key: string): key is InterventionRoot {
  return ROOT_KEYS.has(key);
}

/** True si `key` es una categoría del vocabulario controlado. */
export function isValidCategory(key: string): key is InterventionCategory {
  return CATEGORY_KEYS.has(key);
}

/** Filtra una lista arbitraria (p.ej. salida de ARGOS) a raíces válidas, sin duplicados. */
export function sanitizeRoots(keys: string[]): InterventionRoot[] {
  const seen = new Set<InterventionRoot>();
  for (const k of keys) if (isValidRoot(k)) seen.add(k);
  return [...seen];
}
