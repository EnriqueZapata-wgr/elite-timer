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
import { electronsForApp } from '@/src/constants/electron-app-bridge';
import {
  ALL_BOOLEAN_OPTIONS,
  ALL_QUANT_OPTIONS,
  DEFAULT_BOOLEANS,
  MANDATORY_BOOLEANS,
} from '@/src/services/hoy/day-booleans';

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

export type InstallState = 'instalada' | 'fija' | 'no';

export interface InstallPrefs {
  booleans: string[];
  quants: string[];
  installedApps: string[];
}

export function appInstallState(appKey: string, prefs: InstallPrefs): InstallState {
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

/** Listas nuevas tras desinstalar. Los MANDATORY no se apagan (fijas). */
export function applyUninstall(appKey: string, prefs: InstallPrefs): InstallPrefs {
  const t = togglesForApp(appKey);
  return {
    booleans: prefs.booleans.filter((b) => !t.booleans.includes(b)),
    quants: prefs.quants.filter((q) => !t.quants.includes(q)),
    installedApps: prefs.installedApps.filter((k) => k !== appKey),
  };
}
