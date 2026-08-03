/**
 * TAREAS editorial — núcleo puro (MB-20.1).
 *
 * MB-20 acertó la UX y perdió la UI: este módulo decide el CÓMO SE VE de cada
 * tarea sin tocar el comportamiento. Tres responsabilidades, las tres puras:
 *
 *   · seccionForTarea: de qué sección de la sala ATP es cada tarea, para
 *     pintarla con su color (APP_SECTION_COLORS, nada escrito a mano).
 *   · datoForTarea: el dato vivo de la card, SOLO de lo que ya se compila
 *     (CompiledDay / uvMini que ya viaja al HOY). Sin dato compilado, la
 *     card va sin dato: aquí no se inventan cifras.
 *   · pickHeroTarea: el héroe de la lente AGENDA — lo que importa ahora,
 *     y cambia con la hora.
 *
 * Cero imports con runtime nativo: testeable en el harness node.
 */
import { APP_BY_KEY, type AppSection } from '@/src/constants/app-registry';
import { ELECTRON_TO_APP } from '@/src/constants/electron-app-bridge';
import type { ElectronSource } from '@/src/constants/electrons';
import { minutesFromMidnight, type Tarea } from '@/src/services/hoy/tareas-core';

// ── Sección de cada tarea ──

/** Las secciones que pintan TAREAS: las de la sala + ciclo con color propio. */
export type TareaSeccion = Exclude<AppSection, 'sistema'> | 'ciclo';

/**
 * Sección manual de los hábitos sin app (espejo de ELECTRONS_SIN_APP en
 * electron-app-bridge). Se practican, no se abren; pero sí tienen color.
 */
const SECCION_SIN_APP: Record<string, TareaSeccion> = {
  cold_shower: 'diario',
  grounding: 'diario',
  no_alcohol: 'diario',
  red_glasses: 'diario',
  no_processed_foods: 'diario',
  screen_time_cutoff: 'diario',
  steps: 'cuerpo',
};

/**
 * La sección (color) de una tarea. Resuelve por el puente electrón→app y la
 * sección de esa app en el registro; los sin-app salen del mapa manual.
 * period_log pinta ciclo (rosa propio del manual, no el teal de salud).
 * Los smart de agenda (romper ayuno) son hábito de ayuno → diario.
 */
export function seccionForTarea(key: string): TareaSeccion {
  if (key === 'period_log') return 'ciclo';
  if (key.startsWith('agenda-')) return 'diario';
  const app = ELECTRON_TO_APP[key as ElectronSource];
  if (app) {
    const section = APP_BY_KEY[app]?.section;
    if (section && section !== 'sistema') return section;
  }
  return SECCION_SIN_APP[key] ?? 'diario';
}

// ── El dato de la card ──

export interface UvDato {
  current: number;
  vitaminD?: string;
}

type TareaDato = Pick<Tarea, 'key' | 'kind' | 'meta' | 'time' | 'desc'>;

/**
 * El dato que hace que la card merezca media pantalla. Sale de lo que YA
 * llega a la vista: meta compilada (cuantitativos y ayuno) o el uvMini que
 * el HOY ya carga para el sol. Los hábitos sin dato vivo muestran su
 * descripción compilada (CompiledDay la trae; no es cifra inventada).
 */
export function datoForTarea(t: TareaDato, uv?: UvDato | null): string | undefined {
  if (t.key === 'sunlight' && uv) {
    return `UV ${uv.current} ahora${uv.vitaminD ? ` · ${uv.vitaminD}` : ''}`;
  }
  if (t.kind === 'quant') return t.meta;
  if (t.kind === 'agenda') {
    return t.meta ? `${t.meta} · rompe a las ${t.time}` : `Rompe a las ${t.time}`;
  }
  return t.desc;
}

// ── El héroe de AGENDA ──

/** Una tarea "está en su ventana" si arrancó hace menos de esto. */
export const HERO_VENTANA_MIN = 90;

/**
 * La tarea que importa ahora: la pendiente cuya ventana está abierta (la que
 * arrancó más recientemente dentro de HERO_VENTANA_MIN); si ninguna, la
 * próxima por hora; si el día ya se pasó, la última pendiente. Con todo
 * hecho no hay héroe (null): el día está cerrado.
 */
export function pickHeroTarea<T extends { time: string; completed: boolean }>(
  tareas: T[],
  nowMinutes: number,
): T | null {
  const pendientes = tareas
    .filter((t) => !t.completed)
    .sort((a, b) => minutesFromMidnight(a.time) - minutesFromMidnight(b.time));
  if (pendientes.length === 0) return null;
  const enVentana = pendientes.filter((t) => {
    const delta = nowMinutes - minutesFromMidnight(t.time);
    return delta >= 0 && delta <= HERO_VENTANA_MIN;
  });
  if (enVentana.length > 0) return enVentana[enVentana.length - 1];
  return pendientes.find((t) => minutesFromMidnight(t.time) > nowMinutes)
    ?? pendientes[pendientes.length - 1];
}
