/**
 * reaction-toast-core — lógica PURA del toast de atribución ARGOS (hotfix-ux FIX 4).
 *
 * Problema que resuelve: Enrique vio "+4.5" en el HOY sin saber de dónde vino (eran 2 awards
 * separados). Este core define la semántica de colapso/cola de awards de electrones para que
 * el toast siempre muestre la atribución ("+4.5 ⚡ Cardio · Sin procesados").
 *
 * Semántica de colapso:
 *  - Un award que llega dentro de COLLAPSE_WINDOW_MS (2s) del ÚLTIMO award del batch visible
 *    se COLAPSA: suma electrones, agrega la fuente (sin duplicar) y extiende la ventana
 *    (lastAt se mueve al award nuevo → ráfagas encadenadas siguen colapsando).
 *  - Un award fuera de la ventana (o sin batch previo) inicia un batch NUEVO (merged: false →
 *    la UI elige una reacción fresca del pool `encouragement`).
 *
 * Node-only: cero imports de React Native. Testeado en __tests__/reaction-toast-core.test.ts.
 */

/** Ventana de colapso: awards a <2s entre sí se agregan en un solo toast. */
export const COLLAPSE_WINDOW_MS = 2000;

/** Duración del toast en pantalla (auto-dismiss). Se reinicia si el batch colapsa uno nuevo. */
export const TOAST_DURATION_MS = 2500;

export interface AwardEvent {
  /** Fuente del electrón (key de ELECTRON_WEIGHTS, ej. 'cardio'). */
  source: string;
  /** Electrones otorgados (weight). */
  electrons: number;
  /** Timestamp del award (ms epoch). */
  at: number;
}

export interface ToastBatch {
  /** Suma de electrones del batch (redondeada a 2 decimales). */
  total: number;
  /** Fuentes en orden de llegada, sin duplicados. */
  sources: string[];
  /** Timestamp del último award agregado (ancla de la ventana de colapso). */
  lastAt: number;
}

/** Redondeo a 2 decimales estable contra flotantes (2.5 + 2.0 → 4.5, no 4.499…). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Reduce un award entrante contra el batch actual (o null si no hay toast visible).
 * Retorna el batch resultante y si fue un colapso (merged) o un batch nuevo.
 */
export function reduceAward(
  current: ToastBatch | null,
  ev: AwardEvent,
  windowMs: number = COLLAPSE_WINDOW_MS,
): { batch: ToastBatch; merged: boolean } {
  const delta = current ? ev.at - current.lastAt : Number.POSITIVE_INFINITY;
  if (current && delta >= 0 && delta <= windowMs) {
    return {
      batch: {
        total: round2(current.total + ev.electrons),
        sources: current.sources.includes(ev.source)
          ? current.sources
          : [...current.sources, ev.source],
        lastAt: ev.at,
      },
      merged: true,
    };
  }
  return {
    batch: { total: round2(ev.electrons), sources: [ev.source], lastAt: ev.at },
    merged: false,
  };
}

/** "+4.5" / "+2" — sin ceros colgantes (2.0 → "2"). */
export function formatElectrons(total: number): string {
  return `+${String(round2(total))}`;
}

/**
 * Línea de atribución del toast: "+4.5 ⚡ Cardio · Sin procesados".
 * `names` es un lookup source → { name } (en runtime se pasa ELECTRON_WEIGHTS);
 * una fuente desconocida cae a su key cruda para no romper el toast.
 */
export function formatAttribution(
  batch: Pick<ToastBatch, 'total' | 'sources'>,
  names: Record<string, { name: string } | undefined>,
): string {
  const labels = batch.sources.map((s) => names[s]?.name ?? s);
  return `${formatElectrons(batch.total)} ⚡ ${labels.join(' · ')}`;
}
