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
