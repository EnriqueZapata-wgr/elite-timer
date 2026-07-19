/**
 * Contexto de fase del ciclo para labs hormonales — núcleo PURO (MB-7).
 *
 * Doctrina: un lab hormonal de mujer SIN la fase del ciclo es un dato incompleto
 * y potencialmente mal interpretado — estradiol, progesterona, LH y FSH cambian
 * brutal según el día del ciclo. Todo valor de estos marcadores debe mostrarse
 * con su fase; si no se conoce, se DICE explícito en vez de interpretar a ciegas.
 *
 * Este core no toca supabase ni RN: recibe la fase ya resuelta (getCycleInfo,
 * que ya está gateado a 'female') y devuelve la anotación a pintar junto al valor.
 */

/** Marcadores cuyo valor depende de la fase del ciclo (claves canónicas de lab_values). */
export const CYCLE_SENSITIVE_MARKERS = new Set<string>([
  'estradiol', 'progesterone', 'lh', 'fsh',
]);

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

const PHASE_LABEL: Record<CyclePhase, string> = {
  menstrual: 'fase menstrual',
  follicular: 'fase folicular',
  ovulation: 'ovulación',
  luteal: 'fase lútea',
};

export function isCycleSensitiveMarker(markerKey: string): boolean {
  return CYCLE_SENSITIVE_MARKERS.has(markerKey.toLowerCase());
}

export interface LabCycleContext {
  /** true → hay que mostrar la anotación (marcador hormonal de mujer). */
  show: boolean;
  /** false cuando el marcador es hormonal pero NO se conoce la fase. */
  phaseKnown: boolean;
  /** Texto a pintar junto al valor. '' si show=false. */
  note: string;
}

const NONE: LabCycleContext = { show: false, phaseKnown: false, note: '' };

/**
 * Deriva la anotación de fase para un marcador.
 *
 * @param markerKey clave canónica del lab (p.ej. 'estradiol').
 * @param isFemale  biological_sex === 'female' (los demás no ven anotación de ciclo).
 * @param phase     fase actual del ciclo, o null/undefined si no se conoce.
 *
 * - Marcador no hormonal, o usuaria no-female → { show:false }.
 * - Hormonal + fase conocida → nota con la fase.
 * - Hormonal + fase desconocida → nota EXPLÍCITA de que falta la fase (nunca se
 *   calla el hueco: interpretar sin fase es el error que evitamos).
 */
export function deriveLabCycleContext(
  markerKey: string,
  isFemale: boolean,
  phase: CyclePhase | string | null | undefined,
): LabCycleContext {
  if (!isFemale || !isCycleSensitiveMarker(markerKey)) return NONE;

  const p = (phase ?? '').toLowerCase();
  if (p in PHASE_LABEL) {
    return {
      show: true,
      phaseKnown: true,
      note: `Tomado en ${PHASE_LABEL[p as CyclePhase]} — interpreta según tu fase.`,
    };
  }
  return {
    show: true,
    phaseKnown: false,
    note: 'Sin fase del ciclo registrada — este valor puede malinterpretarse. Anota tu día del ciclo.',
  };
}
