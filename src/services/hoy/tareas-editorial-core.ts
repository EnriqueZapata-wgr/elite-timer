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
import { QUADRANTS, type QuadrantKey } from '@/src/data/emotions-library';
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

/**
 * El dato de VERDAD de cada hábito (MB-20.2 · Pieza 2), compilado por
 * day-compiler desde las mismas queries que ya deciden `completed` (que
 * dejaron de tirar la fila con head:true) — más el último check-in que ya
 * viajaba en memoria y una sola consulta nueva (mind_sessions, ver 2.3).
 * Cualquier campo puede faltar: sin dato, la card va sin línea de dato.
 */
export interface DatosVivos {
  /** Tomas de suplementos: registradas hoy contra las del protocolo. */
  supplements?: { taken: number; total: number } | null;
  /** Última sesión de fuerza (exercise_logs). */
  strength?: { lastDate: string } | null;
  /** Última sesión de cardio con su distancia y tiempo. */
  cardio?: { lastDate: string; distanceMeters?: number | null; durationSeconds?: number | null } | null;
  /** Última entrada de journal. */
  journal?: { lastDate: string } | null;
  /** Última partida completada de N-Back y su nivel. */
  nback?: { lastDate: string; nLevel?: number | null } | null;
  /** Dónde terminó el último check-in (cuadrante del circumplejo). */
  checkin?: { lastDate: string; quadrant?: string | null } | null;
  /** Última sesión de meditación (mind_sessions). */
  meditation?: { lastDate: string; durationSeconds?: number | null } | null;
}

/** Días entre dos fechas locales YYYY-MM-DD (hoy - fecha). Ilegible → null. */
function diasDesde(fecha: string | undefined | null, hoy: string | undefined): number | null {
  if (!fecha || !hoy) return null;
  const a = Date.parse(`${fecha}T00:00:00Z`);
  const b = Date.parse(`${hoy}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

/** "hoy" / "ayer" / "hace N días". Fecha ilegible o futura → null. */
function etiquetaDias(fecha: string | undefined | null, hoy: string | undefined): string | null {
  const d = diasDesde(fecha, hoy);
  if (d == null || d < 0) return null;
  if (d === 0) return 'hoy';
  if (d === 1) return 'ayer';
  return `hace ${d} días`;
}

function fmtKm(meters: number | null | undefined): string | null {
  if (!meters || meters <= 0) return null;
  const km = meters / 1000;
  const v = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10;
  return `${v} km`;
}

function fmtMin(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

/** La etiqueta canónica del cuadrante (QUADRANTS de la biblioteca RULER). */
function quadrantLabel(q: string | null | undefined): string | null {
  if (!q) return null;
  return QUADRANTS[q as QuadrantKey]?.label ?? null;
}

/**
 * El dato vivo de un hábito booleano. Solo cifras reales de DatosVivos:
 * si el dato no está, devuelve undefined y la card va sin línea de dato
 * (decisión de Enrique: "luego lo imaginamos", nunca folleto).
 */
export function datoVivoForTarea(
  key: string,
  vivos?: DatosVivos | null,
  hoy?: string,
): string | undefined {
  if (!vivos) return undefined;
  switch (key) {
    case 'supplements': {
      const s = vivos.supplements;
      return s && s.total > 0 ? `${s.taken} de ${s.total} tomados` : undefined;
    }
    case 'strength': {
      const rel = etiquetaDias(vivos.strength?.lastDate, hoy);
      return rel ? `Última sesión: ${rel}` : undefined;
    }
    case 'cardio': {
      const c = vivos.cardio;
      if (!c) return undefined;
      const partes = [fmtKm(c.distanceMeters), fmtMin(c.durationSeconds)].filter(Boolean);
      return partes.length > 0 ? `Última: ${partes.join(' · ')}` : undefined;
    }
    case 'journal': {
      const rel = etiquetaDias(vivos.journal?.lastDate, hoy);
      return rel ? `Última entrada: ${rel}` : undefined;
    }
    case 'nback': {
      const n = vivos.nback?.nLevel;
      if (Number.isFinite(Number(n))) return `Último nivel: ${n}`;
      const rel = etiquetaDias(vivos.nback?.lastDate, hoy);
      return rel ? `Última partida: ${rel}` : undefined;
    }
    case 'checkin': {
      const label = quadrantLabel(vivos.checkin?.quadrant);
      return label ? `Última vez: ${label}` : undefined;
    }
    case 'meditation': {
      const min = fmtMin(vivos.meditation?.durationSeconds);
      return min ? `Última sesión: ${min}` : undefined;
    }
    default:
      return undefined;
  }
}

type TareaDato = Pick<Tarea, 'key' | 'kind' | 'meta' | 'time'>;

/**
 * El dato que hace que la card merezca media pantalla. Sale de lo que YA
 * llega a la vista: meta compilada (cuantitativos y ayuno), el uvMini que
 * el HOY ya carga para el sol, o el dato vivo compilado (DatosVivos).
 * Sin dato, la card va sin dato: aquí no se inventan cifras ni folletos.
 */
export function datoForTarea(
  t: TareaDato,
  uv?: UvDato | null,
  vivos?: DatosVivos | null,
  hoy?: string,
): string | undefined {
  if (t.key === 'sunlight' && uv) {
    return `UV ${uv.current} ahora${uv.vitaminD ? ` · ${uv.vitaminD}` : ''}`;
  }
  if (t.kind === 'quant') return t.meta;
  if (t.kind === 'agenda') {
    return t.meta ? `${t.meta} · Rompe a las ${t.time}` : `Rompe a las ${t.time}`;
  }
  return datoVivoForTarea(t.key, vivos, hoy);
}

/**
 * El dato de CIERRE de una tarea hecha (la cinta de HECHAS, MB-20.2 · 3.2):
 * "12 min", "5.2 km · 32 min", "3 de 5" — nunca el electrón (+1.5 e-), que
 * es economía y no cierre. Cuantitativos y ayuno cierran con su meta
 * compilada; los booleanos con su dato vivo SI es de hoy. Sin dato de
 * cierre → undefined: va solo el nombre tachado.
 */
export function datoCierreForTarea(
  t: TareaDato,
  vivos?: DatosVivos | null,
  hoy?: string,
): string | undefined {
  if (t.kind === 'quant' || t.kind === 'agenda') return t.meta || undefined;
  if (!vivos || !hoy) return undefined;
  switch (t.key) {
    case 'meditation': {
      const m = vivos.meditation;
      return m?.lastDate === hoy ? fmtMin(m.durationSeconds) ?? undefined : undefined;
    }
    case 'cardio': {
      const c = vivos.cardio;
      if (c?.lastDate !== hoy) return undefined;
      const partes = [fmtKm(c.distanceMeters), fmtMin(c.durationSeconds)].filter(Boolean);
      return partes.length > 0 ? partes.join(' · ') : undefined;
    }
    case 'supplements': {
      const s = vivos.supplements;
      return s && s.total > 0 ? `${s.taken} de ${s.total}` : undefined;
    }
    case 'nback': {
      const n = vivos.nback;
      return n?.lastDate === hoy && Number.isFinite(Number(n.nLevel)) ? `Nivel ${n.nLevel}` : undefined;
    }
    case 'checkin': {
      const c = vivos.checkin;
      return c?.lastDate === hoy ? quadrantLabel(c.quadrant) ?? undefined : undefined;
    }
    default:
      return undefined;
  }
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
