/**
 * Instalar = activar el hábito — núcleo puro (MB-20 Pieza 2).
 *
 * Instalar una app de hábito recurrente enciende sus electrones en las
 * preferencias del día (la fila de TAREAS nace sola en el siguiente compile).
 * Desinstalar la apaga: los datos históricos NO se tocan jamás.
 *
 * Tres clases de app:
 *  · con toggles: sus electrones viven en los catálogos y se encienden/apagan;
 *  · fija: todos sus electrones son MANDATORY (journal, cardio) — siempre está;
 *  · sin toggle: instalable sin electrón activable (ayuno por eventos, sueño
 *    sin fuente, glucosa/cetonas por registro) — su instalación se recuerda en
 *    installed_apps (mig 247) y hoy no genera fila propia en TAREAS.
 */
import type { AppEntry } from '@/src/constants/app-registry';
import { electronsForApp } from '@/src/constants/electron-app-bridge';
import {
  ALL_BOOLEAN_OPTIONS,
  ALL_QUANT_OPTIONS,
  DEFAULT_BOOLEANS,
  MANDATORY_BOOLEANS,
} from '@/src/services/hoy/day-booleans';

/**
 * MB-22: apps que SIEMPRE viven en la cuadrícula, aunque no tengan electrón.
 * Ajustes es la puerta a tu cuenta: quitarla dejaría al usuario sin salida.
 */
export const FIXED_APPS: ReadonlySet<string> = new Set(['ajustes']);

/** Cuantitativos sin fuente conectada (espejo de hoy-habitos). */
const QUANTS_SIN_FUENTE = new Set(['steps', 'sleep']);

// Universo activable: los seleccionables del catálogo + los defaults (checkin
// vive en DEFAULT_BOOLEANS sin opción de catálogo).
const BOOL_KEYS = new Set([
  ...ALL_BOOLEAN_OPTIONS.map((o) => o.key as string),
  ...(DEFAULT_BOOLEANS as readonly string[]),
]);
const QUANT_KEYS = new Set(
  ALL_QUANT_OPTIONS.map((o) => o.key as string).filter((k) => !QUANTS_SIN_FUENTE.has(k)),
);

export interface AppToggles {
  booleans: string[];
  quants: string[];
}

/** Electrones activables (no mandatory) que una app enciende al instalarse. */
export function togglesForApp(appKey: string): AppToggles {
  const electrons = electronsForApp(appKey) as readonly string[];
  return {
    booleans: electrons.filter(
      (e) => BOOL_KEYS.has(e) && !(MANDATORY_BOOLEANS as readonly string[]).includes(e),
    ),
    quants: electrons.filter((e) => QUANT_KEYS.has(e)),
  };
}

/**
 * MB-27 0.4: TODO lo que instalar la app debe devolver a activo — sus
 * toggles Y sus MANDATORY. togglesForApp excluye los MANDATORY a propósito
 * (no viven en prefs: siempre están en el día por la unión del compile),
 * pero un MANDATORY en reposo (Ordenar mi día, Alert del techo) sí tiene
 * fila de estado, y reinstalar su app tiene que revivirlo. Sin esto, quien
 * mandó cardio a reposo instala la app Cardio y no ve nada: el toggle
 * silencioso que MB-26 dice cerrar.
 */
export function habitosQueEnciende(appKey: string): string[] {
  const t = togglesForApp(appKey);
  const mandatory = (electronsForApp(appKey) as readonly string[]).filter((e) =>
    (MANDATORY_BOOLEANS as readonly string[]).includes(e),
  );
  return [...t.booleans, ...t.quants, ...mandatory];
}

/**
 * true si instalar la app enciende al menos un electrón activable, es decir,
 * si su fila nace en TAREAS en el siguiente compile. Es el MISMO cruce de
 * togglesForApp: el copy de instalar sale de aquí (installAlertBody), nunca de
 * una constante aparte, para que texto y comportamiento no se desincronicen.
 */
export function installCreatesRow(appKey: string): boolean {
  const t = togglesForApp(appKey);
  return t.booleans.length > 0 || t.quants.length > 0;
}

/** Cuerpo del Alert de instalar: promete solo lo que de verdad pasa. */
export function installAlertBody(appKey: string): string {
  return installCreatesRow(appKey)
    ? 'Aparece su fila en TAREAS y su hábito empieza a contar desde hoy.'
    : 'Queda activa entre tus funciones y su registro vive dentro de la app. No agrega fila en TAREAS.';
}

/** Cuerpo del Alert de desinstalar: mismo cruce, misma honestidad. */
export function uninstallAlertBody(appKey: string): string {
  return installCreatesRow(appKey)
    ? 'Su fila sale de TAREAS. Tus datos históricos no se tocan: si la reinstalas, tu historia sigue ahí.'
    : 'Se retira de tus funciones activas. Tus datos históricos no se tocan: si la reinstalas, tu historia sigue ahí.';
}

export type InstallState = 'instalada' | 'fija' | 'no';

export interface InstallPrefs {
  booleans: string[];
  quants: string[];
  installedApps: string[];
}

export function appInstallState(appKey: string, prefs: InstallPrefs): InstallState {
  if (FIXED_APPS.has(appKey)) return 'fija';
  const electrons = electronsForApp(appKey) as readonly string[];
  const mandatory = electrons.filter((e) => (MANDATORY_BOOLEANS as readonly string[]).includes(e));
  // Todos sus electrones son core no-deseleccionables → siempre está en tu día.
  if (electrons.length > 0 && mandatory.length === electrons.length) return 'fija';
  const t = togglesForApp(appKey);
  if (t.booleans.some((b) => prefs.booleans.includes(b))) return 'instalada';
  if (t.quants.some((q) => prefs.quants.includes(q))) return 'instalada';
  if (prefs.installedApps.includes(appKey)) return 'instalada';
  return 'no';
}

/**
 * MB-22.1 P3 — el set inicial que NO emerge de los defaults del HOY.
 * Decisión de Enrique: Respirar para todos y Ciclo (modo propio) para
 * usuarias. Entran a la cuadrícula SIN encender electrones: cero filas
 * nuevas en TAREAS — activar el hábito sigue siendo decisión del usuario.
 *
 * MB-29 P3: Edad ATP entra al set inicial (decisión de Enrique: es el
 * gancho, queda a un toque). Para usuarios existentes la siembra la hace
 * la migración 259 (esta función ya corrió y dejó su bandera).
 */
export function initialSeedApps(isFemale: boolean): string[] {
  return ['respirar', 'edad-atp', ...(isFemale ? ['ciclo'] : [])];
}

// ─────────────────────────────────────────────────────────────────────────────
// CIERRE-1 — el día 1 se siembra, no se hereda del default
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Los 3 con los que arranca quien NO eligió pack.
 *
 * Criterio: universales, sin equipo, sin depender de otra pantalla. Dos se
 * palomean con el dedo (luz solar, sin alcohol) para que el día 1 tenga
 * victorias reales, y meditación es verificado: se enciende solo cuando el
 * usuario de verdad medita. Nada de arrancar con hábitos que exigen comprar
 * algo o conectar un wearable.
 */
export const SIEMBRA_DIA_1 = ['sunlight', 'meditation', 'no_alcohol'] as const;

/** Cuántos hábitos elegibles se encienden el día 1. Doctrina: arranque en 3. */
export const TOPE_SIEMBRA_DIA_1 = 3;

/**
 * Qué se enciende el día 1 de un usuario NUEVO.
 *
 * EL PROBLEMA QUE RESUELVE
 *  Sin fila persistida, el compilador cae a DEFAULT_BOOLEANS (10) ∪
 *  MANDATORY_BOOLEANS (5) y el servicio cae a DEFAULT_QUANTS (2): el usuario
 *  abría HOY con 13 tareas que nunca eligió y la barra en "0 de 13". Eso
 *  contradice la doctrina propia (instalar una app equivale a activar un
 *  hábito) porque el usuario no instaló nada y ya tenía trece.
 *
 * POR QUÉ SE SIEMBRA EN LUGAR DE RECORTAR EL DEFAULT
 *  Recortar DEFAULT_BOOLEANS los rompería a TODOS: cualquier usuario que
 *  todavía no tiene fila en user_day_preferences (nunca tocó sus hábitos)
 *  resuelve su día contra esa constante, y encogerla le apagaría hábitos que
 *  lleva meses palomeando sin que nadie se lo pidiera. El dato del usuario es
 *  sagrado. Escribir una fila EXPLÍCITA al cerrar el onboarding afecta
 *  exactamente a quien pasa por el onboarding nuevo, y a nadie más.
 *
 * LÍMITE CONOCIDO, DICHO EN VOZ ALTA
 *  Esto baja el día 1 de 13 filas a 8, no a 3. Los 5 MANDATORY (journal,
 *  no_processed_foods, screen_time_cutoff, cardio, checkin) los fuerza el
 *  compilador por unión y NO son deseleccionables: existen para tapar el bug
 *  del "toggle silencioso" y hoy ni siquiera se ofrecen en /hoy-habitos, así
 *  que quitarlos dejaría al usuario sin forma de volver a encenderlos. Bajar
 *  de 8 exige antes hacerlos seleccionables, y eso es su propio trabajo con su
 *  propia regresión. 8 es justo el techo que la doctrina ya fijaba.
 *
 * @param packBooleans hábitos que el pack elegido quiere encender, si hubo pack.
 */
export function siembraDia1(packBooleans?: readonly string[] | null): AppToggles {
  // Solo se siembran los SELECCIONABLES: los mandatory no viven en prefs (el
  // compilador los une igual) y meterlos aquí sería ruido que nunca se apaga.
  const elegibles = (packBooleans ?? SIEMBRA_DIA_1).filter(
    (k) => BOOL_KEYS.has(k) && !(MANDATORY_BOOLEANS as readonly string[]).includes(k),
  );
  // Sin duplicados y con tope: un pack generoso no puede devolvernos al día 1
  // de trece renglones por la puerta de atrás.
  const booleans = Array.from(new Set(elegibles)).slice(0, TOPE_SIEMBRA_DIA_1);
  return {
    // Arranca sin cuantitativos a propósito. Proteína y agua obligan a abrir
    // otra pantalla para mover el número: son excelentes en la semana 2 y son
    // dos renglones en cero el día 1.
    booleans: booleans.length > 0 ? booleans : [...SIEMBRA_DIA_1],
    quants: [],
  };
}

/**
 * MB-22 P4: instalar SOLO a la cuadrícula, sin encender ningún electrón.
 * Es la instalación del Ciclo en modo acompañante: el calendario de otra
 * persona JAMÁS genera fila en TAREAS ni hábito del usuario (period_log
 * implicaría "registré MI ciclo" y alimentaría su score).
 */
export function applyInstallGridOnly(appKey: string, prefs: InstallPrefs): InstallPrefs {
  if (prefs.installedApps.includes(appKey)) return prefs;
  return { ...prefs, installedApps: [...prefs.installedApps, appKey] };
}

/** Listas nuevas tras instalar. Conserva orden; nunca duplica. */
export function applyInstall(appKey: string, prefs: InstallPrefs): InstallPrefs {
  const t = togglesForApp(appKey);
  const add = (list: string[], keys: string[]) => [
    ...list,
    ...keys.filter((k) => !list.includes(k)),
  ];
  return {
    booleans: add(prefs.booleans, t.booleans),
    quants: add(prefs.quants, t.quants),
    installedApps: add(prefs.installedApps, [appKey]),
  };
}

/**
 * MB-22 Pieza 1: la cuadrícula de la sala ATP lista SOLO lo instalado (y lo
 * fijo). null = la lectura de prefs falló → se muestran todas: una sala con
 * apps de más se corrige sola al siguiente focus; una sala vacía es una app
 * rota.
 */
export function gridApps(apps: AppEntry[], prefs: InstallPrefs | null): AppEntry[] {
  if (!prefs) return apps;
  return apps.filter((a) => appInstallState(a.key, prefs) !== 'no');
}

/** Listas nuevas tras desinstalar. Los MANDATORY no se apagan (fijas). */
export function applyUninstall(appKey: string, prefs: InstallPrefs): InstallPrefs {
  const t = togglesForApp(appKey);
  return {
    booleans: prefs.booleans.filter((b) => !t.booleans.includes(b)),
    quants: prefs.quants.filter((q) => !t.quants.includes(q)),
    installedApps: prefs.installedApps.filter((k) => k !== appKey),
  };
}
