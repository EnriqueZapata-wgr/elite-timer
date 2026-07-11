/**
 * Checkin Bridge Core — trigger PURO del puente a la Tribu (Skool) cuando hay
 * mood bajo sostenido (~3 semanas). Comunidad C5.
 *
 * Doctrina: la app no diagnostica ni etiqueta; solo abre la puerta a humanos.
 * "Bajo" replica el criterio existente del day-compiler (deriveCrossPillar):
 * pleasantness <= 4 (escala 1-10) o quadrant 'low_unpleasant'.
 *
 * Lógica node-only, sin imports de RN/Supabase → testeable en Vitest.
 */

/** Subconjunto mínimo de un emotional_checkin que necesita el trigger. */
export interface BridgeCheckin {
  created_at: string;
  quadrant: string;
  /** Opcional: la pantalla de check-in no lo captura hoy, pero la tabla lo soporta. */
  pleasantness?: number | null;
}

/** Ventana de observación (~3 semanas). */
export const BRIDGE_WINDOW_DAYS = 21;
/** Mínimo de días DISTINTOS con check-in dentro de la ventana (evita falsos positivos con poca data). */
export const BRIDGE_MIN_DAYS_WITH_DATA = 8;
/** Proporción de días bajos sobre días con data para considerarlo "sostenido". */
export const BRIDGE_LOW_DAY_RATIO = 0.6;
/** mood < 4 aprox → pleasantness <= 4 en escala 1-10 (mismo umbral que day-compiler). */
export const BRIDGE_LOW_PLEASANTNESS_MAX = 4;

/** Copy aprobado del puente (no editar sin approval). */
export const TRIBE_BRIDGE_COPY = 'Escucharte importa. La Tribu está aquí.';

/** Un check-in individual cuenta como "bajo" (mismo criterio que day-compiler). */
export function isLowMoodCheckin(c: BridgeCheckin): boolean {
  const p = c.pleasantness;
  if (typeof p === 'number' && p > 0) return p <= BRIDGE_LOW_PLEASANTNESS_MAX;
  return c.quadrant === 'low_unpleasant';
}

/** Clave de día LOCAL (no UTC) de un timestamp — agrupa check-ins por día. */
function localDayKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * ¿Mostrar el puente a la Tribu tras el check-in?
 *
 * true si, en los últimos BRIDGE_WINDOW_DAYS días:
 *  - hay al menos BRIDGE_MIN_DAYS_WITH_DATA días distintos con check-in, y
 *  - la proporción de días "bajos" (mayoría de check-ins bajos ese día)
 *    es >= BRIDGE_LOW_DAY_RATIO.
 */
export function shouldShowTribeBridge(
  checkins: BridgeCheckin[],
  now: Date = new Date(),
): boolean {
  const cutoff = now.getTime() - BRIDGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // Agrupar por día local dentro de la ventana.
  const byDay = new Map<string, { low: number; total: number }>();
  for (const c of checkins) {
    const t = new Date(c.created_at).getTime();
    if (!Number.isFinite(t) || t < cutoff || t > now.getTime() + 60_000) continue;
    const key = localDayKey(c.created_at);
    const agg = byDay.get(key) ?? { low: 0, total: 0 };
    agg.total += 1;
    if (isLowMoodCheckin(c)) agg.low += 1;
    byDay.set(key, agg);
  }

  const daysWithData = byDay.size;
  if (daysWithData < BRIDGE_MIN_DAYS_WITH_DATA) return false;

  let lowDays = 0;
  for (const agg of byDay.values()) {
    // Día "bajo" = la mayoría de los check-ins de ese día fueron bajos.
    if (agg.low * 2 >= agg.total && agg.low > 0) lowDays += 1;
  }

  return lowDays / daysWithData >= BRIDGE_LOW_DAY_RATIO;
}
