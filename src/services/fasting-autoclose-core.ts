/**
 * Cierre automático del ayuno olvidado: la DECISIÓN, pura (31-ago-2026).
 *
 * Antes esta regla vivía entera dentro de app/fasting.tsx (loadActiveFast +
 * updateElapsed), así que un ayuno olvidado solo se cerraba si abrías esa
 * pantalla. Aquí queda la regla; fasting-autoclose-service.ts la ejecuta, y
 * lo llaman tanto la pantalla como el compilador del día (HOY), que corre al
 * arrancar la app y en cada `day_changed`.
 *
 * Política (sin cambio respecto a la pantalla, solo mudada):
 *   · inicio inválido o duración no finita   → cancelar (fila corrupta)
 *   · más de 144 h (120 + 24 de margen)      → cancelar (olvidado; NO inflar
 *                                              logros con un ayuno que no fue)
 *   · entre 120 y 144 h                      → cerrar como COMPLETADO a las
 *                                              120 h exactas (texto §2.5 del
 *                                              sign-off legal)
 *   · menos de 120 h                         → mantener
 *
 * Cero imports: se prueba en node.
 */

/**
 * Decisión de producto: el ayuno máximo en ATP es 120 horas. Los protocolos
 * funcionales no proponen ayunos más largos; los mayores requieren
 * supervisión médica.
 */
export const MAX_FAST_HOURS = 120;
/** Margen para detectar ayunos olvidados o corruptos (> límite + 24 h). */
export const FAST_CORRUPT_THRESHOLD_HOURS = MAX_FAST_HOURS + 24;

export type DecisionCierre =
  | { accion: 'mantener'; horas: number }
  | { accion: 'cancelar'; motivo: 'inicio_invalido' | 'olvidado'; horas: number | null }
  | { accion: 'cerrar_en_limite'; fin: Date; horas: number };

/**
 * @param fastStart  `fast_start` tal cual viene de la fila (ISO, Date o basura).
 * @param ahoraMs    instante de evaluación, inyectado para poder probar.
 */
export function decidirCierre(fastStart: unknown, ahoraMs: number): DecisionCierre {
  const inicio = aFecha(fastStart);
  if (!inicio) return { accion: 'cancelar', motivo: 'inicio_invalido', horas: null };
  const horas = (ahoraMs - inicio.getTime()) / 3_600_000;
  if (!Number.isFinite(horas)) return { accion: 'cancelar', motivo: 'inicio_invalido', horas: null };
  if (horas > FAST_CORRUPT_THRESHOLD_HOURS) return { accion: 'cancelar', motivo: 'olvidado', horas };
  if (horas >= MAX_FAST_HOURS) {
    return {
      accion: 'cerrar_en_limite',
      fin: new Date(inicio.getTime() + MAX_FAST_HOURS * 3_600_000),
      horas: MAX_FAST_HOURS,
    };
  }
  return { accion: 'mantener', horas };
}

function aFecha(v: unknown): Date | null {
  if (v == null || v === '') return null;
  const d = v instanceof Date ? v : new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ─────────────────────────────────────────────────────────────────────────────
// HUELLA del cierre automático (4EP, 31-ago-2026).
//
// Cuando compileDay cierra el ayuno olvidado al arrancar HOY, la persona
// llega a Ayuno y ya no hay activo: el aviso §2.5 del sign-off legal (auto-
// cierre obligatorio a 120 h) no se mostraba nunca. El servicio deja esta
// huella en AsyncStorage y la pantalla de Ayuno la lee al enfocarse, muestra
// el aviso que toque y la borra. Aquí vive el formato, puro y con prueba.
// ─────────────────────────────────────────────────────────────────────────────

export const HUELLA_AUTOCIERRE_KEY = 'fasting_autoclose_pendiente';

export type EventoHuella = 'cerrado_en_limite' | 'cancelado_olvidado';

export interface HuellaAutocierre {
  fastId: string;
  evento: EventoHuella;
  /** ISO del momento en que se cerró. */
  cuando: string;
}

/** Solo estos dos eventos ameritan aviso; el resto no deja huella. */
export function eventoDejaHuella(evento: string): evento is EventoHuella {
  return evento === 'cerrado_en_limite' || evento === 'cancelado_olvidado';
}

export function serializarHuella(h: HuellaAutocierre): string {
  return JSON.stringify(h);
}

/** null si el raw es nulo, no es JSON o no tiene la forma esperada. */
export function leerHuella(raw: string | null | undefined): HuellaAutocierre | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<HuellaAutocierre> | null;
    if (!o || typeof o !== 'object') return null;
    if (typeof o.fastId !== 'string' || !o.fastId) return null;
    if (typeof o.evento !== 'string' || !eventoDejaHuella(o.evento)) return null;
    if (typeof o.cuando !== 'string') return null;
    return { fastId: o.fastId, evento: o.evento, cuando: o.cuando };
  } catch {
    return null;
  }
}
