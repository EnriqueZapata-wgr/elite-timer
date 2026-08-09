/**
 * MB-30B Pieza 1 — puerta JS del filtro nocturno de sistema.
 *
 * ⚠️ Doctrina "nativos nuevos SIEMPRE lazy require" (crash ExpoPrint): el
 * módulo AtpNightFilter NO existe en binarios viejos ni en iOS. Todo acceso
 * va dentro de try con require perezoso; sin módulo, cada función degrada
 * fail-soft (no-disponible) y la pantalla lo dice con honestidad.
 *
 * Contratos duros del brief:
 *  - El permiso de superposición se pide SOLO cuando el usuario activa la
 *    función (openOverlaySettings se llama desde la pantalla, nunca al abrir
 *    la app).
 *  - APAGAR SIEMPRE FUNCIONA: disableNightFilter() no tiene ninguna rama que
 *    dependa del permiso, de la red ni del estado del servicio.
 *  - Si el usuario apagó desde el aviso persistente, la preferencia se apaga
 *    también (consumeStoppedFromNotification) — el off de un toque es
 *    permanente, no "hasta que la app reinicie el servicio".
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { warn as logWarn } from '@/src/lib/logger';
import { getHabitTime } from '@/src/services/hoy/habit-times-service';
import { timeToMinutes } from '@/src/services/notification-prefs-core';
import {
  NIGHT_FILTER_END_MINUTES,
  NIGHT_FILTER_FALLBACK_CUTOFF,
  rampStopsJson,
} from '@/src/services/night-filter-core';

const KEY_ENABLED = '@atp/night_filter_enabled';

interface NativeNightFilter {
  canDrawOverlays(): boolean;
  openOverlaySettings(): void;
  startFilter(cutoffMinutes: number, endMinutes: number, stopsJson: string): boolean;
  stopFilter(): boolean;
  isFilterRunning(): boolean;
  consumeStoppedFromNotification(): boolean;
}

let cached: NativeNightFilter | null | undefined;

function native(): NativeNightFilter | null {
  if (cached !== undefined) return cached;
  if (Platform.OS !== 'android') {
    cached = null;
    return cached;
  }
  try {
    // Lazy require: en un binario viejo el módulo no existe y esto lanza.
    const { requireNativeModule } = require('expo-modules-core');
    cached = requireNativeModule('AtpNightFilter') as NativeNightFilter;
  } catch {
    cached = null;
  }
  return cached;
}

/** ¿Este binario trae el módulo? (false en iOS y en binarios pre-MB-30). */
export function nightFilterAvailable(): boolean {
  return native() != null;
}

/** ¿El usuario ya concedió la superposición? Sin módulo = false, sin romper. */
export function canDrawOverlays(): boolean {
  try {
    return native()?.canDrawOverlays() ?? false;
  } catch {
    return false;
  }
}

/**
 * Abre el ajuste del sistema para conceder la superposición. SOLO se llama
 * desde la pantalla del filtro cuando el usuario activa la función.
 */
export function openOverlaySettings(): void {
  try {
    native()?.openOverlaySettings();
  } catch (e) {
    logWarn('[night-filter] openOverlaySettings failed', e);
  }
}

export function isNightFilterRunning(): boolean {
  try {
    return native()?.isFilterRunning() ?? false;
  } catch {
    return false;
  }
}

/** La preferencia del usuario (device-local: la superposición es por equipo). */
export async function isNightFilterEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_ENABLED)) === 'true';
  } catch {
    return false;
  }
}

async function persistEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_ENABLED, enabled ? 'true' : 'false');
  } catch (e) {
    logWarn('[night-filter] persist pref failed', e);
  }
}

/** La hora de corte del usuario, en minutos (fail-soft al canónico 21:45). */
async function cutoffMinutesFor(userId: string): Promise<number> {
  try {
    const hhmm = await getHabitTime(userId, 'screen_time_cutoff');
    return timeToMinutes(hhmm) ?? NIGHT_FILTER_FALLBACK_CUTOFF;
  } catch {
    return NIGHT_FILTER_FALLBACK_CUTOFF;
  }
}

/**
 * Enciende el filtro. Sin permiso de superposición NO arranca nada y lo dice
 * ({ ok: false, reason: 'permission' }): la pantalla muestra el paso a
 * Ajustes. Sin módulo nativo → { ok: false, reason: 'unavailable' }.
 */
export async function enableNightFilter(
  userId: string,
): Promise<{ ok: boolean; reason?: 'permission' | 'unavailable' }> {
  const mod = native();
  if (!mod) return { ok: false, reason: 'unavailable' };
  try {
    if (!mod.canDrawOverlays()) return { ok: false, reason: 'permission' };
    const cutoff = await cutoffMinutesFor(userId);
    const started = mod.startFilter(cutoff, NIGHT_FILTER_END_MINUTES, rampStopsJson());
    if (!started) return { ok: false, reason: 'permission' };
    await persistEnabled(true);
    return { ok: true };
  } catch (e) {
    logWarn('[night-filter] enable failed', e);
    return { ok: false, reason: 'unavailable' };
  }
}

/**
 * APAGA EL FILTRO, SIEMPRE. Sin ramas condicionadas a permiso/red/estado:
 * stopService sobre un servicio muerto es un no-op y la preferencia queda
 * apagada pase lo que pase.
 */
export async function disableNightFilter(): Promise<void> {
  try {
    native()?.stopFilter();
  } catch (e) {
    logWarn('[night-filter] stop failed', e);
  }
  await persistEnabled(false);
}

/**
 * Al arrancar la app (post-login): re-arma el filtro si el usuario lo dejó
 * encendido (el servicio no sobrevive un reboot — limitación honesta: sin
 * RECEIVE_BOOT_COMPLETED a propósito, un permiso menos que explicar).
 * Si el último apagado vino del aviso persistente, apaga la preferencia:
 * "Apagar filtro" de un toque es definitivo.
 */
export async function restoreNightFilterOnLaunch(userId: string): Promise<void> {
  const mod = native();
  if (!mod) return;
  try {
    if (mod.consumeStoppedFromNotification()) {
      await persistEnabled(false);
      return;
    }
    const enabled = await isNightFilterEnabled();
    if (!enabled) return;
    if (!mod.canDrawOverlays()) return; // permiso revocado: la pantalla lo dice
    if (!mod.isFilterRunning()) {
      const cutoff = await cutoffMinutesFor(userId);
      mod.startFilter(cutoff, NIGHT_FILTER_END_MINUTES, rampStopsJson());
    }
  } catch (e) {
    logWarn('[night-filter] restore failed', e);
  }
}
