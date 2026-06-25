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
