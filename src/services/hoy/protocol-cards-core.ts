/**
 * Bridge Mi Protocolo → cards del HOY (#3b). PURO y testeable.
 *
 * Cuando `INTERVENTIONS_DRIVE_HOY` está ON, las cards editoriales del HOY dejan de
 * gatearse solo por la config manual ("Configura HOY") y responden al protocolo
 * activo (`user_interventions`): visible = baseline universal ∪ cards prescritas.
 *
 * Límite honesto: el catálogo tiene ~59 intervenciones y HOY ~20 cardKeys; una
 * intervención sin card editorial (oil pulling, etc.) sigue viviendo en la AGENDA.
 * La fusión completa HOY↔Agenda↔Mi Protocolo es Batch 4/#30.
 */
import { canonicalConcept } from '@/src/services/interventions/intervention-agenda-core';

/**
 * Baseline universal: cards que se muestran SIEMPRE aunque el protocolo no las
 * prescriba — métricas/cuantitativas siempre-relevantes (uv, proteína, agua,
 * sueño) + el pulso emocional diario (checkin). El resto se gana su lugar vía
 * Mi Protocolo.
 */
export const HOY_BASELINE_CARDS: readonly string[] = ['uv', 'checkin', 'proteina', 'agua', 'sleep'];

/** Familia canónica (intervention-agenda-core) → cardKey del HOY. */
const FAMILY_TO_CARD: Record<string, string> = {
  sol: 'luz_solar',
  hidratacion: 'agua',
  suplementos: 'suplementos',
  lentes_rojos: 'lentes_rojos',
  pantallas: 'screen_time_cutoff',
  grounding: 'grounding',
  dormir: 'sleep',
  romper_ayuno: 'ayuno',
  ventana_alimentacion: 'ayuno',
};

/**
 * Conceptos SIN familia canónica (canonicalConcept devuelve el nombre normalizado):
 * reglas ordenadas sobre ese nombre. La primera que matchea gana; sin match → null
 * (la intervención vive solo en la agenda, NO se inventa card).
 */
const NAME_TO_CARD: [string, RegExp][] = [
  ['meditacion', /medita/],
  ['breathwork', /respiracion|breath|coherencia|wim hof/],
  ['bano_frio', /bano frio|ducha fria|crioterapia|inmersion.*fri/],
  ['journal', /journal|diario|gratitud/],
  ['fuerza', /fuerza|pesas|resistencia muscular/],
  ['cardio', /cardio|zona 2/],
  ['pasos', /(^|\s)pasos($|\s)|caminata/],
  ['no_alcohol', /alcohol/],
  ['no_processed_foods', /procesad/],
  ['proteina', /proteina/],
  ['checkin', /check.?in|emocional/],
];

/** cardKey del HOY para una intervención (por nombre), o null si no tiene card. */
export function cardKeyForIntervention(name: string): string | null {
  const concept = canonicalConcept(name ?? '');
  const byFamily = FAMILY_TO_CARD[concept];
  if (byFamily) return byFamily;
  for (const [cardKey, rule] of NAME_TO_CARD) {
    if (rule.test(concept)) return cardKey;
  }
  return null;
}

/**
 * Set de cards visibles derivado del protocolo activo: baseline ∪ prescritas.
 * Con protocolo vacío devuelve null → el caller cae a la config manual
 * (getCardsVisible) para no dejar el HOY vacío en usuarios sin motor corrido.
 */
export function deriveProtocolDrivenVisible(interventionNames: string[]): Set<string> | null {
  if (!interventionNames.length) return null;
  const visible = new Set<string>(HOY_BASELINE_CARDS);
  for (const name of interventionNames) {
    const cardKey = cardKeyForIntervention(name);
    if (cardKey) visible.add(cardKey);
  }
  return visible;
}
