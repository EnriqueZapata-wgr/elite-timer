/**
 * Instalar = activar el hábito — capa con I/O (MB-20 Pieza 2).
 *
 * Persistencia en user_day_preferences (viaja entre dispositivos, igual que
 * los hábitos del HOY). installed_apps llega con la mig 247: si el remoto aún
 * no la tiene, el write reintenta SIN esa columna (patrón checkin-service de
 * columna fantasma) y la instalación vive solo en los electrones.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { DEFAULT_BOOLEANS } from '@/src/services/hoy/day-booleans';
import {
  applyInstall,
  applyInstallGridOnly,
  applyUninstall,
  initialSeedApps,
  type InstallPrefs,
} from '@/src/services/hoy/install-core';
import { getCycleAppMode, setCycleAppMode } from '@/src/services/app-mode-service';

const DEFAULT_QUANTS = ['protein', 'water'];

/** null = FALLO de lectura (clase {error}): no pintar defaults como elección. */
export async function getInstallPrefs(userId: string): Promise<InstallPrefs | null> {
  const { data, error } = await supabase
    .from('user_day_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    logWarn('[install] prefs read failed', error);
    return null;
  }
  return {
    booleans: (data?.active_boolean_electrons as string[]) ?? [...DEFAULT_BOOLEANS],
    quants: (data?.active_quantitative_electrons as string[]) ?? DEFAULT_QUANTS,
    installedApps: (data?.installed_apps as string[]) ?? [],
  };
}

async function writePrefs(userId: string, prefs: InstallPrefs): Promise<{ ok: boolean }> {
  const row = {
    user_id: userId,
    active_boolean_electrons: prefs.booleans,
    active_quantitative_electrons: prefs.quants,
    installed_apps: prefs.installedApps,
    updated_at: new Date().toISOString(),
  };
  let { error } = await supabase
    .from('user_day_preferences')
    .upsert(row, { onConflict: 'user_id' });
  if (error && (error.code === 'PGRST204' || error.code === '42703' || /installed_apps/.test(error.message ?? ''))) {
    // Remoto sin mig 247: la instalación vive solo en los electrones.
    const { installed_apps: _omit, ...sinColumna } = row;
    ({ error } = await supabase
      .from('user_day_preferences')
      .upsert(sinColumna, { onConflict: 'user_id' }));
  }
  if (error) {
    logWarn('[install] prefs write failed', error);
    return { ok: false };
  }
  // Regla 5: el HOY recompila con el caller emitiendo, no el servicio de logs.
  DeviceEventEmitter.emit('electrons_changed');
  return { ok: true };
}

export async function installApp(userId: string, appKey: string): Promise<{ ok: boolean }> {
  const prefs = await getInstallPrefs(userId);
  if (!prefs) return { ok: false };
  return writePrefs(userId, applyInstall(appKey, prefs));
}

/**
 * MB-22 P4: instalación SOLO a la cuadrícula. Cero electrones: no nace fila
 * en TAREAS, no se toca ningún hábito. MB-23 P2 retiró su único caller (el
 * install de Ciclo acompañante); se queda con su core y sus tests para el
 * proyecto de permisos de ciclo, que instala vistas sin hábito propio.
 */
export async function installAppGridOnly(userId: string, appKey: string): Promise<{ ok: boolean }> {
  const prefs = await getInstallPrefs(userId);
  if (!prefs) return { ok: false };
  return writePrefs(userId, applyInstallGridOnly(appKey, prefs));
}

export async function uninstallApp(userId: string, appKey: string): Promise<{ ok: boolean }> {
  const prefs = await getInstallPrefs(userId);
  if (!prefs) return { ok: false };
  return writePrefs(userId, applyUninstall(appKey, prefs));
}

// ─────────────────────────────────────────────────────────────────────────────
// MB-22.1 P3 — siembra del set inicial que no emerge de los defaults.
// ─────────────────────────────────────────────────────────────────────────────

/** Bandera one-shot en goals: la siembra corre UNA vez por usuario. */
const SEED_FLAG = 'mb22_seed_v1';

/**
 * Siembra Respirar (todos) y Ciclo en propio (usuarias) a la cuadrícula, SIN
 * encender electrones — cero filas nuevas en TAREAS. Para usuarios ya
 * sembrados por las migraciones 250/251 solo deja la bandera.
 *
 * · Idempotente: goals.mb22_seed_v1 la corta para siempre.
 * · Fail-soft: cualquier error deja todo como estaba y se reintenta en el
 *   siguiente focus (la bandera solo se escribe si el write entró).
 * · NUNCA pisa un modo de ciclo ya elegido (solo escribe propio si no hay).
 *
 * Devuelve true si escribió algo (el caller decide releer).
 */
export async function seedInitialApps(userId: string, isFemale: boolean): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_day_preferences')
    .select('installed_apps, goals')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    logWarn('[install] seed read failed', error);
    return false;
  }
  const goals = (data?.goals as Record<string, unknown>) ?? {};
  if (goals[SEED_FLAG]) return false;

  const current = (data?.installed_apps as string[]) ?? [];
  const add = initialSeedApps(isFemale).filter((k) => !current.includes(k));

  const { error: writeErr } = await supabase
    .from('user_day_preferences')
    .upsert(
      {
        user_id: userId,
        installed_apps: [...current, ...add],
        goals: { ...goals, [SEED_FLAG]: true },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  if (writeErr) {
    // Remoto sin mig 247/250: sin bandera, se reintenta después. Nada a medias.
    logWarn('[install] seed write failed', writeErr);
    return false;
  }

  // Usuaria nueva: su Ciclo queda en propio EXPLÍCITO. Si ya hay un modo
  // elegido (backfill 249/251 o decisión previa), no se toca.
  if (isFemale) {
    const mode = await getCycleAppMode(userId);
    if (mode == null) await setCycleAppMode(userId, 'propio');
  }
  return add.length > 0;
}
