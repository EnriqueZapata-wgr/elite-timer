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
  habitosQueEnciende,
  initialSeedApps,
  siembraDia1,
  type InstallPrefs,
} from '@/src/services/hoy/install-core';
import { DIA_1_SIEMBRA_SUAVE } from '@/src/constants/flags';
import { reactivarHabitos } from '@/src/services/hoy/habit-states-service';
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
  // MB-26 P1: instalar ES encender — si el hábito estaba graduado o en
  // reposo, vuelve a activo ANTES del write que recompila. Sin esto, la
  // card jamás reaparecería (toggle silencioso clase checkin).
  // MB-27 0.4: el alcance incluye los MANDATORY de la app (cardio, journal…):
  // togglesForApp los excluye y reinstalar no los devolvía del reposo.
  await reactivarHabitos(userId, habitosQueEnciende(appKey));
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

// ─────────────────────────────────────────────────────────────────────────────
// CIERRE-1 — siembra explícita del día 1 (solo usuarios nuevos)
// ─────────────────────────────────────────────────────────────────────────────

/** Bandera one-shot: la siembra del día 1 corre UNA vez por usuario. */
const DIA1_FLAG = 'cierre1_dia1_v1';

/**
 * Escribe la lista EXPLÍCITA de hábitos con la que arranca un usuario nuevo.
 *
 * Sin esto, quien no tiene fila en user_day_preferences hereda
 * DEFAULT_BOOLEANS ∪ MANDATORY_BOOLEANS + DEFAULT_QUANTS y abre HOY con 13
 * tareas ajenas y la barra en cero. Con esto abre con 3 elegidos (los suyos si
 * hubo pack) más los 5 mandatory: 8 renglones, que es el techo que la doctrina
 * ya fijaba.
 *
 * TRES CANDADOS PARA NO TOCAR A NADIE QUE YA ESTÉ ADENTRO
 *  1. Bandera one-shot en goals: corre una sola vez y nunca vuelve.
 *  2. Se ABORTA si el usuario ya tiene `active_boolean_electrons` persistido.
 *     Esa columna solo existe si alguien ya eligió (o si una migración lo
 *     backfilleó), y una elección previa no se pisa jamás.
 *  3. Solo la llama el cierre del onboarding v2. Un usuario existente no vuelve
 *     a pasar por ahí, así que ni siquiera llega a evaluar los otros dos.
 *
 * Fail-soft: cualquier error deja todo como estaba y no escribe la bandera.
 *
 * @param packBooleans hábitos del pack elegido, si el usuario eligió uno.
 * @returns true si escribió (el caller decide releer).
 */
export async function sembrarDia1(
  userId: string,
  packBooleans?: readonly string[] | null,
): Promise<boolean> {
  if (!DIA_1_SIEMBRA_SUAVE) return false;

  const { data, error } = await supabase
    .from('user_day_preferences')
    .select('active_boolean_electrons, active_quantitative_electrons, goals')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    logWarn('[install] siembra dia 1: lectura falló', error);
    return false;
  }

  const goals = (data?.goals as Record<string, unknown>) ?? {};
  if (goals[DIA1_FLAG]) return false;

  // Candado 2: ya eligió. No se pisa una decisión del usuario ni con bandera
  // limpia. Se marca la bandera para no volver a preguntarlo cada arranque.
  const yaEligio =
    Array.isArray(data?.active_boolean_electrons) ||
    Array.isArray(data?.active_quantitative_electrons);
  if (yaEligio) {
    await supabase
      .from('user_day_preferences')
      .upsert(
        { user_id: userId, goals: { ...goals, [DIA1_FLAG]: true }, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
    return false;
  }

  const siembra = siembraDia1(packBooleans);
  const { error: writeErr } = await supabase
    .from('user_day_preferences')
    .upsert(
      {
        user_id: userId,
        active_boolean_electrons: siembra.booleans,
        active_quantitative_electrons: siembra.quants,
        goals: { ...goals, [DIA1_FLAG]: true },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  if (writeErr) {
    // Sin bandera: se reintenta. Nada a medias.
    logWarn('[install] siembra dia 1: escritura falló', writeErr);
    return false;
  }
  // Regla 5: el HOY tiene que recompilar con la lista nueva.
  DeviceEventEmitter.emit('electrons_changed');
  return true;
}
