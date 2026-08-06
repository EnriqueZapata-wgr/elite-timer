/**
 * pack-core — el motor de packs, núcleo PURO (MB-25 Pieza 2).
 *
 * Aquí vive TODA la decisión: qué se instala, qué se enciende, a qué hora,
 * qué se escribe y qué se respeta. Cero imports con runtime nativo:
 * testeable en el harness node. Los efectos viven en pack-service.ts.
 *
 * Tres ideas sostienen el motor:
 *
 *  1. ANCLAJE. Las horas de un pack son relativas (despertar +30, dormir
 *     −90) y aquí se vuelven absolutas con el horario del usuario. Una hora
 *     que caería fuera de la ventana despierto se recorta a la ventana.
 *
 *  2. PLAN DETERMINISTA. buildPackPlan(pack, intensidad, despertar, dormir)
 *     produce siempre lo mismo. Eso permite reconstruir el plan de la
 *     activación ANTERIOR desde la fila de user_packs y compararlo con el
 *     estado actual: si el usuario movió algo a mano después de activar, la
 *     re-activación NO lo pisa.
 *
 *  3. ENCENDER = EL CAMINO DE SIEMPRE. Un hábito con app se enciende
 *     instalando su app (installApp, instalar = activar, MB-20). Solo los
 *     hábitos activables sin app en el pack (ej. lentes rojos, agua) van
 *     por electron-prefs. Las demás apps del pack entran solo a la
 *     cuadrícula. Ningún atajo paralelo.
 */
import {
  PACK_BY_KEY,
  habitosPorIntensidad,
  type PackDef,
  type PackHora,
  type PackIntensidad,
  type PackMetaDef,
  type PackAviso,
} from '@/src/constants/packs';
import { TAREA_TIME, minutesFromMidnight } from '@/src/services/hoy/tareas-core';
import {
  ALL_BOOLEAN_OPTIONS,
  ALL_QUANT_OPTIONS,
  MANDATORY_BOOLEANS,
} from '@/src/services/hoy/day-booleans';
import { appForElectron } from '@/src/constants/electron-app-bridge';
import {
  appInstallState,
  togglesForApp,
  type InstallPrefs,
} from '@/src/services/hoy/install-core';
import type { AvisoAppKey } from '@/src/services/app-avisos-service';

// ─── Anclaje de horas ───────────────────────────────────────────────────────

/**
 * MB-26 P5: una entrada de goals.habit_times es hora FIJA ('HH:MM') o
 * REGLA relativa ({ ancla, offsetMin }, superset de PackHora con 'uv').
 * La forma canónica vive en habit-times-core; aquí el shape estructural
 * para no crear ciclo de imports (habit-times-core ya importa anclarHora).
 */
export interface HoraReglaLike {
  ancla: 'despertar' | 'dormir' | 'uv';
  offsetMin: number;
}
export type HabitTimeEntryLike = string | HoraReglaLike;

/** ¿Dos entradas son la misma regla? (fija ≠ relativa, siempre.) */
export function reglaIgual(
  a: HabitTimeEntryLike | null | undefined,
  b: HabitTimeEntryLike | null | undefined,
): boolean {
  if (a == null || b == null) return false;
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  return a.ancla === b.ancla && a.offsetMin === b.offsetMin;
}

export function esHoraValida(t: string): boolean {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  return !!m && parseInt(m[1], 10) <= 23 && parseInt(m[2], 10) <= 59;
}

function fmtMin(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * Vuelve absoluta una hora relativa del pack, recortada a la ventana
 * despierto del usuario. Soporta dormir cruzando medianoche (23:30 → 00:30
 * también es "después de despertar").
 */
export function anclarHora(hora: PackHora, despertar: string, dormir: string): string {
  const w = minutesFromMidnight(despertar);
  let s = minutesFromMidnight(dormir);
  if (s <= w) s += 1440; // la noche cruza medianoche
  let abs = hora.ancla === 'despertar' ? w + hora.offsetMin : s + hora.offsetMin;
  // Fuera de la ventana despierto → se recorta: un aviso mientras duermes
  // es un aviso que se ignora (o que despierta, que es peor).
  if (abs < w) abs = w;
  if (abs > s) abs = s;
  return fmtMin(abs);
}

// ─── Clasificación de hábitos ───────────────────────────────────────────────

/** Espejo de QUANTS_SIN_FUENTE (install-core, no exportado): cuantitativos
 * sin fuente conectada — no generan fila en TAREAS. */
const QUANTS_SIN_FUENTE = new Set(['steps', 'sleep']);

const BOOL_SELECCIONABLES = new Set(ALL_BOOLEAN_OPTIONS.map((o) => o.key));
const QUANT_CON_FUENTE = new Set(
  ALL_QUANT_OPTIONS.map((o) => o.key).filter((k) => !QUANTS_SIN_FUENTE.has(k)),
);

// ─── El plan ────────────────────────────────────────────────────────────────

export interface PackPlan {
  packKey: string;
  intensidad: PackIntensidad;
  despertar: string;
  dormir: string;
  /** Apps del pack con hábito activo en esta intensidad → installApp. */
  installFull: string[];
  /** Resto de apps del pack → solo cuadrícula (installAppGridOnly). */
  installGrid: string[];
  /** Booleanos activables sin app en el pack → electron-prefs. */
  boolsPrefs: string[];
  /** Cuantitativos con fuente sin app en el pack → electron-prefs. */
  quantsPrefs: string[];
  /** Hora absoluta por hábito con el horario dado — SOLO para mostrar el
   *  resumen. Lo que se escribe son las reglas (habitReglas, MB-26 P5). */
  habitTimes: Record<string, string>;
  /** MB-26 P5: la REGLA por hábito (lo que de verdad se persiste). El sol
   *  va anclado al UV del día (Pieza 6), no a que despiertes. */
  habitReglas: Record<string, HoraReglaLike>;
  metas: PackMetaDef[];
  avisos: { app: AvisoAppKey; time: string }[];
  /** Para el resumen: hábitos que quedan encendidos en TAREAS. */
  encendidos: string[];
  /** Para el resumen: lo que vive dentro de su app (por evento o registro). */
  enModulo: string[];
}

/**
 * El plan completo de una activación. Determinista: mismo pack + intensidad
 * + horario → mismo plan, siempre. Sobre esa propiedad se construye la
 * idempotencia (reconcilarPack).
 */
export function buildPackPlan(
  packKey: string,
  intensidad: PackIntensidad,
  despertar: string,
  dormir: string,
): PackPlan {
  const pack = PACK_BY_KEY[packKey];
  if (!pack) throw new Error(`pack desconocido: ${packKey}`);

  const activos = habitosPorIntensidad(pack, intensidad);
  const installFull: string[] = [];
  const boolsPrefs: string[] = [];
  const quantsPrefs: string[] = [];
  const habitTimes: Record<string, string> = {};
  const habitReglas: Record<string, HoraReglaLike> = {};
  const encendidos: string[] = [];
  const enModulo: string[] = [];

  for (const h of activos) {
    const key = h.electron as string;
    const app = appForElectron(h.electron);
    const appEnPack = app != null && pack.instala.includes(app);

    if ((MANDATORY_BOOLEANS as readonly string[]).includes(key)) {
      // Siempre está en el día de todos: nada que encender.
      encendidos.push(key);
    } else if (BOOL_SELECCIONABLES.has(key)) {
      encendidos.push(key);
      if (appEnPack) {
        if (!installFull.includes(app!)) installFull.push(app!);
      } else {
        boolsPrefs.push(key);
      }
    } else if (QUANT_CON_FUENTE.has(key)) {
      encendidos.push(key);
      if (appEnPack) {
        if (!installFull.includes(app!)) installFull.push(app!);
      } else {
        quantsPrefs.push(key);
      }
    } else {
      // Por evento o sin fuente: su registro vive dentro de su app.
      enModulo.push(key);
      if (appEnPack && !installFull.includes(app!)) {
        // La app igual se instala completa: es el vehículo del hábito
        // (ej. glucosa) aunque no genere fila en TAREAS.
        installFull.push(app!);
      }
    }

    // La hora solo se ancla donde hay fila que la use (hora canónica en
    // TAREAS y fuente conectada). Anclar horas de hábitos sin fila sería
    // escribir datos muertos.
    // MB-26 P5: lo que se persiste es la REGLA (el compile la vuelve
    // absoluta cada día contra el horario real: el pack no reescribe horas
    // cuando cambia tu vida). habitTimes queda como preview del resumen.
    // El sol se ancla al UV del día (Pieza 6, espejo de REGLA_SOL_DEFAULT),
    // no a que despiertes: es dato que ya pagamos.
    if (h.hora && TAREA_TIME[key] && !QUANTS_SIN_FUENTE.has(key)) {
      habitTimes[key] = anclarHora(h.hora, despertar, dormir);
      habitReglas[key] = key === 'sunlight' ? { ancla: 'uv', offsetMin: 0 } : h.hora;
    }
  }

  const installGrid = pack.instala.filter((a) => !installFull.includes(a));
  const avisos = pack.avisos.map((a: PackAviso) => ({
    app: a.app,
    time: anclarHora(a.hora, despertar, dormir),
  }));

  return {
    packKey,
    intensidad,
    despertar,
    dormir,
    installFull,
    installGrid,
    boolsPrefs,
    quantsPrefs,
    habitTimes,
    habitReglas,
    metas: pack.metas,
    avisos,
    encendidos,
    enModulo,
  };
}

// ─── Reconciliación (idempotencia + respeto a lo manual) ────────────────────

export interface EstadoActual {
  prefs: InstallPrefs;
  /** goals.habit_times del usuario: fija 'HH:MM' o regla (MB-26 P5). */
  habitTimes: Record<string, HabitTimeEntryLike>;
  /** Valores actuales de las metas con writer. */
  metas: { proteina_g: number; agua_ml: number; ayuno_h: number };
  /** Preferencia de aviso actual por app del pack (sin fila = disabled). */
  avisos: Partial<Record<AvisoAppKey, { enabled: boolean; time: string }>>;
}

export interface PackWrites {
  installApps: string[];
  gridApps: string[];
  bools: string[];
  quants: string[];
  /** MB-26 P5: se escriben REGLAS, no horas absolutas. */
  habitReglas: Record<string, HoraReglaLike>;
  metas: PackMetaDef[];
  avisos: { app: AvisoAppKey; time: string }[];
}

export function sinEscrituras(w: PackWrites): boolean {
  return (
    w.installApps.length === 0 &&
    w.gridApps.length === 0 &&
    w.bools.length === 0 &&
    w.quants.length === 0 &&
    Object.keys(w.habitReglas).length === 0 &&
    w.metas.length === 0 &&
    w.avisos.length === 0
  );
}

function valorMeta(tipo: PackMetaDef['tipo'], metas: EstadoActual['metas']): number {
  if (tipo === 'proteina_g') return metas.proteina_g;
  if (tipo === 'agua_ml') return metas.agua_ml;
  return metas.ayuno_h;
}

/** ¿La app ya tiene sus electrones encendidos (o su cuadrícula, si no tiene)? */
function appEncendida(appKey: string, prefs: InstallPrefs): boolean {
  const t = togglesForApp(appKey);
  if (t.booleans.length === 0 && t.quants.length === 0) {
    return appInstallState(appKey, prefs) !== 'no';
  }
  return (
    t.booleans.every((b) => prefs.booleans.includes(b)) &&
    t.quants.every((q) => prefs.quants.includes(q))
  );
}

/**
 * Decide qué se escribe DE VERDAD al activar. Las dos reglas duras del
 * brief viven aquí:
 *
 *  · Re-activar es idempotente: lo que ya está como el plan lo pide, no se
 *    vuelve a escribir. Activar dos veces = mismo estado, cero escrituras
 *    la segunda vez.
 *
 *  · No pisa lo manual: si hay plan previo (la activación anterior,
 *    reconstruida desde user_packs) y el valor actual difiere de lo que
 *    aquel plan dejó, el usuario lo cambió a mano después de activar y ES
 *    SUYO: no se toca. Sin plan previo (primera activación) el pack sí
 *    fija todo: para eso lo activaste.
 */
export function reconcilarPack(
  nuevo: PackPlan,
  previo: PackPlan | null,
  actual: EstadoActual,
): PackWrites {
  const { prefs } = actual;

  const installApps = nuevo.installFull.filter(
    (app) => !appEncendida(app, prefs) && !previo?.installFull.includes(app),
  );

  const gridApps = nuevo.installGrid.filter(
    (app) =>
      appInstallState(app, prefs) === 'no' &&
      !(previo && (previo.installGrid.includes(app) || previo.installFull.includes(app))),
  );

  const bools = nuevo.boolsPrefs.filter(
    (b) => !prefs.booleans.includes(b) && !previo?.boolsPrefs.includes(b),
  );
  const quants = nuevo.quantsPrefs.filter(
    (q) => !prefs.quants.includes(q) && !previo?.quantsPrefs.includes(q),
  );

  // MB-26 P5: se comparan REGLAS. Compatibilidad: quien traiga un override
  // absoluto ('HH:MM', incluidas las horas que MB-25 escribió absolutas)
  // difiere de cualquier regla del plan previo → cuenta como manual y SE
  // CONSERVA. Nadie pierde su hora al actualizar.
  const habitReglas: Record<string, HoraReglaLike> = {};
  for (const [src, regla] of Object.entries(nuevo.habitReglas)) {
    const cur = actual.habitTimes[src];
    if (reglaIgual(cur, regla)) continue; // ya está
    if (previo && cur != null && !reglaIgual(cur, previo.habitReglas[src])) continue; // manual
    habitReglas[src] = regla;
  }

  const metas = nuevo.metas.filter((m) => {
    const cur = valorMeta(m.tipo, actual.metas);
    if (cur === m.valor) return false;
    const prevMeta = previo?.metas.find((p) => p.tipo === m.tipo);
    if (previo && prevMeta && cur !== prevMeta.valor) return false; // manual
    return true;
  });

  const avisos = nuevo.avisos.filter((a) => {
    const cur = actual.avisos[a.app];
    if (cur?.enabled && cur.time === a.time) return false; // ya está
    const prev = previo?.avisos.find((p) => p.app === a.app);
    if (prev && cur && (!cur.enabled || cur.time !== prev.time)) return false; // manual
    return true;
  });

  return { installApps, gridApps, bools, quants, habitReglas, metas, avisos };
}

// ─── Desactivar ─────────────────────────────────────────────────────────────

/**
 * Lo que desactivar un pack toca en la configuración del usuario: NADA.
 *
 * Desactivar = dejar de agrupar y medir. Nada se desinstala, nada se borra,
 * ningún hábito se apaga: es la doctrina de intervenciones (el dato del
 * usuario es sagrado). pack-service ejecuta ESTAS listas al desactivar; que
 * estén vacías es el contrato — la mutación que las llene truena en test y,
 * de pasar, desinstalaría de verdad: por eso el servicio las consume en vez
 * de ignorarlas.
 */
export function writesAlDesactivar(_pack: PackDef): { desinstala: string[]; apaga: string[] } {
  return { desinstala: [], apaga: [] };
}

// ─── El registro de activaciones ────────────────────────────────────────────

export interface UserPackRow {
  pack_key: string;
  intensidad: PackIntensidad;
  wake_time: string;
  sleep_time: string;
  active: boolean;
  activated_at: string;
}

/** El pack activo del usuario (doctrina: UNO a la vez), o null. */
export function packActivo(rows: UserPackRow[] | null): UserPackRow | null {
  return rows?.find((r) => r.active) ?? null;
}

/** Reconstruye el plan de una activación previa desde su fila. */
export function planDeFila(row: UserPackRow): PackPlan | null {
  if (!PACK_BY_KEY[row.pack_key]) return null;
  if (!esHoraValida(row.wake_time) || !esHoraValida(row.sleep_time)) return null;
  return buildPackPlan(row.pack_key, row.intensidad, row.wake_time, row.sleep_time);
}
