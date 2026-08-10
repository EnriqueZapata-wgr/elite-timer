/**
 * MB-32 — sincronización app → widgets (la dirección de LECTURA).
 *
 * La app empuja snapshots cuando compila el día (piggyback en el loadDay de
 * HOY: misma fuente única, cero queries extra). El widget solo PINTA; toda
 * escritura viaja en sentido contrario por la cola de widget-actions.
 *
 * El tema viaja con el snapshot: modo elegido (la MISMA llave AsyncStorage
 * de theme-context) + despertar/corte del usuario, para que el Kotlin
 * resuelva claro/oscuro con la semántica de theme-mode-core aunque la app
 * no corra (adaptativo cambia con el reloj).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';
import type { CompiledDay } from '@/src/services/day-compiler';
import { parseStoredMode, hhmmToMinutes } from '@/src/services/theme/theme-mode-core';
import { NIGHT_FILTER_FALLBACK_CUTOFF } from '@/src/constants/night-curve';
import { getUserSchedule, getHabitTime } from '@/src/services/hoy/habit-times-service';
import { timeToMinutes } from '@/src/services/notification-prefs-core';
import { getWidgetsNative } from '@/src/services/widgets/widget-bridge';
import {
  buildAguaSnapshot,
  buildHabitosSnapshot,
  snapshotSignedOut,
  type WidgetThemePayload,
} from '@/src/services/widgets/widget-snapshot-core';

/** Espejo de theme-context (misma llave, mismos defaults). */
const KEY_MODE = '@atp/theme_mode';
const FALLBACK_DESPERTAR = 7 * 60;

export async function leerWidgetTheme(userId: string): Promise<WidgetThemePayload> {
  let mode: WidgetThemePayload['mode'] = 'oscuro';
  try {
    mode = parseStoredMode(await AsyncStorage.getItem(KEY_MODE));
  } catch { /* sin dato: oscuro, el canónico */ }
  let despertarMin = FALLBACK_DESPERTAR;
  let corteMin = NIGHT_FILTER_FALLBACK_CUTOFF;
  try {
    const [schedule, corteHHMM] = await Promise.all([
      getUserSchedule(userId),
      getHabitTime(userId, 'screen_time_cutoff'),
    ]);
    despertarMin = hhmmToMinutes(schedule.despertar) ?? FALLBACK_DESPERTAR;
    corteMin = timeToMinutes(corteHHMM) ?? NIGHT_FILTER_FALLBACK_CUTOFF;
  } catch { /* se quedan los defaults */ }
  return { mode, despertarMin, corteMin };
}

/**
 * Empuja los snapshots desde un día YA compilado. Fire-and-forget: un fallo
 * aquí jamás rompe HOY (el widget se queda con lo anterior).
 */
export async function syncWidgetsFromCompiled(userId: string, day: CompiledDay): Promise<void> {
  const native = getWidgetsNative();
  if (!native) return;
  try {
    const theme = await leerWidgetTheme(userId);
    // OJO: CompiledDay.date es texto de display; el widget compara contra
    // LocalDate.now() en Kotlin, así que aquí va el YYYY-MM-DD local.
    const habitos = buildHabitosSnapshot({
      date: getLocalToday(),
      booleans: day.booleanElectrons.map((b) => ({
        source: b.source,
        name: b.name,
        completed: b.completed,
      })),
      habitStates: day.habitStates,
      habitTimes: day.habitTimes,
      theme,
    });
    native.setSnapshot('habitos', JSON.stringify(habitos));

    // Pieza 2: el agua sale del MISMO compile (quant 'water', en ml). Si el
    // usuario la quitó de sus hábitos, no se empuja y el widget invita a
    // abrir la app.
    const water = day.quantitativeElectrons.find((q) => q.source === 'water');
    if (water) {
      const agua = buildAguaSnapshot({
        date: getLocalToday(),
        theme,
        currentMl: water.current,
        targetMl: water.target,
      });
      native.setSnapshot('agua', JSON.stringify(agua));
    }
  } catch (e) {
    logWarn('[widget-sync] push snapshot failed', e);
  }
}

/** Logout: los widgets quedan en "Abre ATP" y la cola muere con la sesión. */
export function clearWidgets(): void {
  try {
    getWidgetsNative()?.clearAll();
  } catch { /* fail-soft */ }
}

/** Estado sin sesión explícito (lo empuja el drenador si la sesión murió). */
export function pushSignedOutSnapshot(): void {
  try {
    getWidgetsNative()?.setSnapshot('habitos', JSON.stringify(snapshotSignedOut()));
  } catch { /* fail-soft */ }
}
