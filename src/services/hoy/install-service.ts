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
  applyUninstall,
  type InstallPrefs,
} from '@/src/services/hoy/install-core';

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

export async function uninstallApp(userId: string, appKey: string): Promise<{ ok: boolean }> {
  const prefs = await getInstallPrefs(userId);
  if (!prefs) return { ok: false };
  return writePrefs(userId, applyUninstall(appKey, prefs));
}
