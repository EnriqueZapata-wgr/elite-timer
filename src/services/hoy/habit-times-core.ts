/**
 * habit-times-core (MB-26 Pieza 5) — las horas dejan de ser texto y se
 * vuelven REGLA, puro.
 *
 * Antes goals.habit_times guardaba '07:30' y por eso quien viaja seguía
 * con horarios de su casa y cambiar la hora de despertar no recorría
 * nada. Ahora una entrada puede ser:
 *
 *   · 'HH:MM'                    → regla FIJA (el override manual de
 *     siempre y el de los usuarios existentes: nadie pierde su hora).
 *   · { ancla, offsetMin }       → regla RELATIVA a la vida del usuario
 *     (despertar / dormir, la misma forma que PackHora de pack-core) o al
 *     'uv' del día (MB-26 Pieza 6: la ventana buena de vitamina D).
 *
 * La hora ABSOLUTA se calcula aquí al compilar el día, contra el reloj
 * local y el horario real del usuario. Gratis con esto: viajas y todo se
 * recorre solo; cambias tu despertar y no reconfiguras nada; el pack no
 * reescribe horas cuando cambia tu vida.
 *
 * El ancla 'uv' degrada con gracia: sin dato de UV cae a despertar + 30 y
 * la fuente lo dice ('uv_fallback'). NUNCA deja un hábito sin hora.
 */
import { anclarHora } from '@/src/services/pack-core';
import { minutesFromMidnight } from '@/src/services/hoy/tareas-core';
import type { PackHora } from '@/src/constants/packs';

export type HoraAncla = 'despertar' | 'dormir' | 'uv';

/** Superset de PackHora: agrega el ancla 'uv'. PackHora asigna directo. */
export interface HoraRegla {
  ancla: HoraAncla;
  offsetMin: number;
}

export type HabitTimeEntry = string | HoraRegla;

export interface ContextoHorario {
  /** 'HH:MM' del horario real del usuario (prefs > cronotipo > default). */
  despertar: string;
  dormir: string;
  /** Inicio de la ventana de vitamina D de HOY, o null sin dato/permiso. */
  uvInicio: string | null;
}

export type HoraFuente = 'fija' | 'ancla' | 'uv' | 'uv_fallback';

/** Regla del sol cuando el usuario no fijó nada: la ventana UV del día. */
export const REGLA_SOL_DEFAULT: HoraRegla = { ancla: 'uv', offsetMin: 0 };
/** Sin dato de UV el sol cae a despertar + 30 (y lo dice). */
export const SOL_FALLBACK_OFFSET_MIN = 30;

export function esHoraHHMM(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  return !!m && parseInt(m[1], 10) <= 23 && parseInt(m[2], 10) <= 59;
}

/** Entrada legible de goals.habit_times, o null (basura se ignora). */
export function parseHabitTimeEntry(v: unknown): HabitTimeEntry | null {
  if (esHoraHHMM(v)) return v;
  if (v && typeof v === 'object') {
    const r = v as Record<string, unknown>;
    if (
      (r.ancla === 'despertar' || r.ancla === 'dormir' || r.ancla === 'uv') &&
      typeof r.offsetMin === 'number' && Number.isFinite(r.offsetMin)
    ) {
      return { ancla: r.ancla, offsetMin: r.offsetMin };
    }
  }
  return null;
}

// ¿Dos entradas son la misma regla? La comparación vive en pack-core (que
// no puede importarnos sin crear ciclo); aquí solo se re-exporta.
export { reglaIgual } from '@/src/services/pack-core';

/** Recorta minutos absolutos a la ventana despierto (espejo de anclarHora). */
function recortarAVentana(absMin: number, despertar: string, dormir: string): string {
  const w = minutesFromMidnight(despertar);
  let s = minutesFromMidnight(dormir);
  if (s <= w) s += 1440;
  let abs = absMin;
  if (abs < w) abs = w;
  if (abs > s) abs = s;
  const m = ((abs % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Una entrada → hora absoluta del día, SIEMPRE (nunca sin hora). */
export function resolverHora(
  entry: HabitTimeEntry,
  ctx: ContextoHorario,
): { time: string; fuente: HoraFuente } {
  if (typeof entry === 'string') return { time: entry, fuente: 'fija' };
  if (entry.ancla === 'uv') {
    if (ctx.uvInicio && esHoraHHMM(ctx.uvInicio)) {
      return {
        time: recortarAVentana(
          minutesFromMidnight(ctx.uvInicio) + entry.offsetMin,
          ctx.despertar,
          ctx.dormir,
        ),
        fuente: 'uv',
      };
    }
    // Degradación con gracia: sin permiso, sin red o sin dato → despertar
    // + 30, y la fuente lo dice para que la UI lo pueda decir también.
    return {
      time: anclarHora(
        { ancla: 'despertar', offsetMin: SOL_FALLBACK_OFFSET_MIN },
        ctx.despertar,
        ctx.dormir,
      ),
      fuente: 'uv_fallback',
    };
  }
  return { time: anclarHora(entry as PackHora, ctx.despertar, ctx.dormir), fuente: 'ancla' };
}

export interface HorasResueltas {
  /** source → 'HH:MM' absoluta (lo que consumen TAREAS y la agenda). */
  times: Record<string, string>;
  /** source → de dónde salió la hora (la UI honesta del sol la usa). */
  fuentes: Record<string, HoraFuente>;
}

/**
 * Resuelve goals.habit_times completo contra el contexto del día. El sol
 * SIN entrada del usuario se ancla al UV por default (Pieza 6): es dato
 * que ya pagamos; quien fijó su hora a mano la conserva (regla fija).
 */
export function resolverHabitTimes(raw: unknown, ctx: ContextoHorario): HorasResueltas {
  const times: Record<string, string> = {};
  const fuentes: Record<string, HoraFuente> = {};
  const entradas = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  for (const [source, v] of Object.entries(entradas)) {
    const entry = parseHabitTimeEntry(v);
    if (entry == null) continue; // basura → la canónica de tareas-core manda
    const r = resolverHora(entry, ctx);
    times[source] = r.time;
    fuentes[source] = r.fuente;
  }
  if (times.sunlight === undefined) {
    const r = resolverHora(REGLA_SOL_DEFAULT, ctx);
    times.sunlight = r.time;
    fuentes.sunlight = r.fuente;
  }
  return { times, fuentes };
}
