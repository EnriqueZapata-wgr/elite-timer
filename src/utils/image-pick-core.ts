/**
 * image-pick-core — lógica PURA de selección de imágenes (#asset-swap). SIN `require()` de assets
 * → 100% testeable en vitest (los módulos con require('.png') rompen el resolver de node/vitest).
 * Los pickers con assets (agenda-image-picker, yo-image-picker, image-rotation) importan estas
 * funciones; los tests importan SOLO este módulo.
 */

/**
 * Índice determinístico dentro de [0, length). Misma `seedKey` → mismo índice (no "salta" entre
 * re-renders). Sin seed → 0 (estable; el caller puede randomizar si quiere variedad por sesión).
 */
export function seededIndex(seedKey: string | undefined, length: number): number {
  if (length <= 0) return 0;
  if (!seedKey) return 0;
  const hash = seedKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return hash % length;
}

/** Categoría de AgendaEvent (+ título) → carpeta de imágenes de agenda. `hour` para sol AM/PM. */
export function categoryToFolder(eventCategory: string, eventTitle: string | undefined, hour: number): string {
  const t = (eventTitle ?? '').toLowerCase();
  if (eventCategory === 'meal') return 'comida';
  if (eventCategory === 'exercise') return t.includes('cardio') ? 'cardio' : 'entrenar';
  if (eventCategory === 'supplement') return 'suplementos';
  if (eventCategory === 'mind') return 'meditacion';
  if (eventCategory === 'recovery') return 'sleep';
  if (eventCategory === 'rhythm') {
    if (t.includes('sol') || t.includes('luz')) return hour < 14 ? 'sol-am' : 'sol-pm';
    if (t.includes('despertar') || t.includes('wake')) return 'despertar';
    if (t.includes('agua') || t.includes('hidrat')) return 'hidratacion';
    if (t.includes('off') || t.includes('pantalla')) return 'off-pantallas';
    return 'otros';
  }
  return 'otros';
}

export type TuDiaGroup = 'despertar' | 'medio-dia' | 'atardecer' | 'noche';
/**
 * #v13e 3.B.5 — grupo de imagen de la card "TU DÍA" según la hora (rotación por hora, no por día).
 *   5–12 despertar · 12–18 medio-día · 18–22 atardecer · 22–5 noche.
 * Las carpetas medio-día/atardecer/noche se generan después → el picker cae a despertar mientras tanto.
 */
export function tuDiaImageGroup(hour: number): TuDiaGroup {
  if (hour >= 5 && hour < 12) return 'despertar';
  if (hour >= 12 && hour < 18) return 'medio-dia';
  if (hour >= 18 && hour < 22) return 'atardecer';
  return 'noche';
}

/**
 * #v13g — categoría de un evento de agenda (+ nombre) → carpeta de imágenes (assets/images/agenda/*).
 * Keyword-based y robusto (las categorías vienen de protocolo/cronotipo/manual, no normalizadas).
 * Mapea a las 12 carpetas existentes; default 'otros'.
 */
export function agendaCategoryToFolder(category: string, name?: string): string {
  const t = `${(category ?? '').toLowerCase()} ${(name ?? '').toLowerCase()}`;
  if (/(cardio|corr|run|bici|cicl|nad|remo)/.test(t)) return 'cardio';
  if (/(fuerza|entren|gym|pesas|fitness|ejercicio|workout|strength|mobil)/.test(t)) return 'entrenar';
  if (/(suplement|supp)/.test(t)) return 'suplementos';
  if (/(medit|mente|mind|respir|breath|journal|calm)/.test(t)) return 'meditacion';
  if (/(dorm|sue|sleep|noche)/.test(t)) return 'sleep';
  if (/(despert|wake|levant)/.test(t)) return 'despertar';
  if (/(hidrat|agua|water)/.test(t)) return 'hidratacion';
  if (/(comida|nutric|desayun|almuerz|cena|meal|food|protei)/.test(t)) return 'comida';
  if (/(off|pantalla|screen)/.test(t)) return 'off-pantallas';
  if (/(sol|luz|sun|uv)/.test(t)) return 'sol-am';
  return 'otros';
}

export type SexKey = 'male' | 'female';
/** Normaliza el sexo biológico a la clave de imagen el/ella (default male). */
export function sexKey(sex: string | undefined | null): SexKey {
  return sex === 'female' ? 'female' : 'male';
}

export type CronotipoKey = 'leon' | 'lobo' | 'oso' | 'delfin';
/** Normaliza el cronotipo (acepta inglés del modelo: lion/bear/wolf/dolphin, o español) → clave ES. */
export function cronotipoKey(chronotype: string | undefined | null): CronotipoKey {
  switch ((chronotype ?? '').toLowerCase()) {
    case 'lion': case 'leon': return 'leon';
    case 'wolf': case 'lobo': return 'lobo';
    case 'bear': case 'oso': return 'oso';
    case 'dolphin': case 'delfin': return 'delfin';
    default: return 'leon';
  }
}

// ── Mapeo intervención → imagen (Mega-Sprint C · el fix real de #132) ─────────
//
// Problema: la card de una intervención tomaba su imagen de `categories[0]`, que
// son ejes de DX (circadiano/ritual/estrés...), NO conceptos visuales → grounding,
// frío, sauna, oil-pulling salían con la MISMA imagen. Fix: mapeo dedicado keyed en
// `family` (específico) primero, luego `key` por patrón. Doctrina simple>inteligente:
// mapeo EXPLÍCITO y legible; si no matchea → undefined → cae al sistema de carpetas
// actual (cero pantalla rota).

/** Las 11 claves de imagen de concepto visual disponibles (JPEG MJ · #132). */
export type InterventionImageKey =
  | 'grounding' | 'frio' | 'calor' | 'respiracion' | 'oral' | 'lentes'
  | 'luz-roja' | 'audio' | 'naturaleza' | 'mente' | 'cognitivo';

/** family del catálogo → clave de imagen (match exacto, es lo más específico). */
const FAMILY_TO_IMAGE: Record<string, InterventionImageKey> = {
  grounding: 'grounding',
  ducha_fria: 'frio',
  wim_hof: 'frio',
  bano_frio: 'frio',
  sauna: 'calor',
  box_breathing: 'respiracion',
  apnea_tables: 'respiracion',
  respiracion_nocturna: 'respiracion',
  oil_pulling: 'oral',
  lentes_azul: 'lentes',
  panel_luz_roja: 'luz-roja',
  binaurales: 'audio',
  nsdr_yoga_nidra: 'audio',
  journal: 'mente',
};

/** Reglas por patrón sobre la `key` (para intervenciones SIN family que apliquen). */
const KEY_PATTERNS: [RegExp, InterventionImageKey][] = [
  [/luz_roja|red_light|fotobiomod/, 'luz-roja'],
  [/nsdr|binaural|audio|sonido/, 'audio'],
  [/grounding|earthing|descalz/, 'grounding'],
  [/n_back|cognit|atencion|nback/, 'cognitivo'],
  [/green_time|naturaleza|bosque|forest|aire_libre/, 'naturaleza'],
  [/oil_pulling|omt_mastica|masticat|oral|bucal/, 'oral'],
  [/coherencia_cardiaca|physiological_sigh|hiperventilacion|respiracion|breath/, 'respiracion'],
  [/dive_reflex|compresa_fria|wim_hof|ducha_fria|bano_frio|cold|crio|hielo|frio/, 'frio'],
  [/sauna|termoterapia/, 'calor'],
  [/lentes/, 'lentes'],
  [/silencio|digital_minimalism|meditac|mindful|journal/, 'mente'],
];

/**
 * Clave de imagen de concepto visual para una intervención, o `undefined` si no
 * matchea (el caller cae al sistema de carpetas por categoría). `family` gana
 * sobre `key` porque es lo más específico.
 */
export function interventionImageKey(
  intervention: { family?: string | null; key: string },
): InterventionImageKey | undefined {
  const fam = (intervention.family ?? '').toLowerCase();
  if (fam && FAMILY_TO_IMAGE[fam]) return FAMILY_TO_IMAGE[fam];

  const key = (intervention.key ?? '').toLowerCase();
  for (const [rx, img] of KEY_PATTERNS) {
    if (rx.test(key)) return img;
  }
  return undefined;
}
