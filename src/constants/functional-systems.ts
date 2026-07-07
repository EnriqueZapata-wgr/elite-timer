/**
 * 7 Sistemas Funcionales — matriz de medicina funcional (framework Mariana).
 *
 * Base del expediente vivo de Historia Clínica (F3 sprint UX blockers V1.3):
 * cada síntoma registrado pertenece a un sistema, y cada sistema correlaciona
 * con parameter_keys canónicos de `lab_values` para el drill-down.
 *
 * Colores: desaturados, tomados de la paleta existente (CATEGORY_COLORS /
 * gradientes de health-hub) — no inventar colores (DESIGN_SYSTEM.md §1).
 */

export type FunctionalSystemKey =
  | 'asimilacion'
  | 'defensa'
  | 'energia'
  | 'biotransformacion'
  | 'transporte'
  | 'comunicacion'
  | 'estructura';

export interface FunctionalSystem {
  key: FunctionalSystemKey;
  name: string;
  icon: string;
  color: string;
  /** Qué cubre el sistema, en lenguaje de usuario */
  scope: string;
  /** Ejemplos de síntomas para el quick-input */
  exampleSymptoms: string[];
  /** parameter_key canónicos de lab_values correlacionados (drill-down) */
  relatedLabs: string[];
}

export const FUNCTIONAL_SYSTEMS: FunctionalSystem[] = [
  {
    key: 'asimilacion',
    name: 'Asimilación',
    icon: '🍽️',
    color: '#5B9BD5', // nutrition
    scope: 'Digestión, absorción de nutrientes, microbiota',
    exampleSymptoms: ['Inflamación abdominal', 'Reflujo', 'Estreñimiento', 'Diarrea', 'Intolerancias'],
    relatedLabs: ['albumin', 'total_protein', 'ferritina', 'vitamina_b12', 'folato_acido_folico', 'zinc', 'magnesio'],
  },
  {
    key: 'defensa',
    name: 'Defensa y reparación',
    icon: '🛡️',
    color: '#1D9E75', // metrics/health
    scope: 'Sistema inmune, inflamación, reparación de tejidos',
    exampleSymptoms: ['Infecciones frecuentes', 'Alergias', 'Inflamación crónica', 'Cicatrización lenta'],
    relatedLabs: ['proteina_c_reactiva_cuantitativa_pcr', 'pcr', 'wbc', 'lymphocyte_pct', 'neutrophils_pct', 'esr', 'anti_tpo'],
  },
  {
    key: 'energia',
    name: 'Energía',
    icon: '⚡',
    color: '#EF9F27', // optimization
    scope: 'Producción de energía celular, función mitocondrial',
    exampleSymptoms: ['Fatiga persistente', 'Bajones de energía', 'Niebla mental', 'Intolerancia al ejercicio'],
    relatedLabs: ['glucosa_en_ayuno', 'hba1c', 'trigliceridos', 't3_libre', 'ferritina', 'vitamina_d', 'vitamina_b12'],
  },
  {
    key: 'biotransformacion',
    name: 'Biotransformación y eliminación',
    icon: '🌿',
    color: '#3DBF6E', // green2
    scope: 'Detoxificación hepática, eliminación renal e intestinal',
    exampleSymptoms: ['Sensibilidad a químicos', 'Resacas intensas', 'Sudoración con olor fuerte', 'Orina turbia'],
    relatedLabs: ['transaminasa_glutamico_piruvica_alt', 'transaminasa_g_oxalacetica_ast_tgo', 'gama_glutamil_transferasa', 'bilirrubina', 'creatinina_serica', 'urea', 'acido_urico'],
  },
  {
    key: 'transporte',
    name: 'Transporte',
    icon: '🫀',
    color: '#38BDF8', // sky (mi-salud)
    scope: 'Sistema cardiovascular y linfático, circulación',
    exampleSymptoms: ['Palpitaciones', 'Manos/pies fríos', 'Retención de líquidos', 'Presión alta'],
    relatedLabs: ['colesterol_total', 'colesterol_hdl', 'colesterol_ldl', 'trigliceridos', 'lp_a', 'apolipoproteinas_b', 'nt_pro_bnp'],
  },
  {
    key: 'comunicacion',
    name: 'Comunicación',
    icon: '📡',
    color: '#C084FC', // tests/hormonal (Braverman)
    scope: 'Hormonas, neurotransmisores, señalización celular',
    exampleSymptoms: ['Insomnio', 'Ansiedad', 'Ciclo irregular', 'Libido baja', 'Cambios de humor'],
    relatedLabs: ['tsh', 't3_libre', 't4_free', 'cortisol_matutino', 'testosterona_total', 'estradiol', 'progesterone', 'dhea', 'prolactina', 'lh', 'fsh'],
  },
  {
    key: 'estructura',
    name: 'Integridad estructural',
    icon: '🦴',
    color: '#A8E02A', // fitness (color de categoría)
    scope: 'Músculo-esquelético, membranas, postura',
    exampleSymptoms: ['Dolor articular', 'Dolor de espalda', 'Calambres', 'Pérdida de fuerza', 'Lesiones recurrentes'],
    relatedLabs: ['vitamina_d', 'calcium', 'phosphorus', 'magnesio', 'cpk', 'pth'],
  },
];

export const FUNCTIONAL_SYSTEM_BY_KEY: Record<FunctionalSystemKey, FunctionalSystem> =
  Object.fromEntries(FUNCTIONAL_SYSTEMS.map(s => [s.key, s])) as Record<FunctionalSystemKey, FunctionalSystem>;

export const SEVERITY_LABELS: Record<number, string> = {
  1: 'Muy leve',
  2: 'Leve',
  3: 'Moderado',
  4: 'Fuerte',
  5: 'Severo',
};

/** Color semántico por severidad (1-5) — misma escala visual que scores */
export function severityColor(severity: number): string {
  if (severity <= 1) return '#4ade80';
  if (severity === 2) return '#a8e02a';
  if (severity === 3) return '#fbbf24';
  if (severity === 4) return '#f97316';
  return '#ef4444';
}
