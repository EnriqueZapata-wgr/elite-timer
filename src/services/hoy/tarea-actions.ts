/**
 * TAREAS — acciones con efectos (MB-20 Pieza 1).
 *
 * 1. persistBooleanToggle: EL contrato de escritura del palomeo, extraído del
 *    persistToggle de HoyEditorialSection (v13d 2.1): dual write blob
 *    daily_electrons + electron_logs idempotente + espejo HOY→Agenda + emit.
 *    Saltarse cualquier pata rompe `completed` en el siguiente compile.
 * 2. registrarExperiencia: el registro manual de los módulos (MB-20.5: el
 *    botón "Ya medité"/"Ya respiré" de meditación y respiración). Una
 *    sesión hecha POR FUERA se registra como sesión REAL (mind_sessions /
 *    cardio_sessions); un insert suelto a electron_logs lo revocaría
 *    reconcileVerifiedLedger en el siguiente compile.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';
import {
  awardBooleanElectron,
  revokeBooleanElectron,
  awardPracticeElectron,
} from '@/src/services/electron-service';
import { syncCompletionFromElectron } from '@/src/services/agenda-service';
import { logCardioSession } from '@/src/services/fitness-service';

/**
 * Palomeo de un booleano NO verificado. `currentStates` es el estado completo
 * de booleanos del día (el blob se escribe entero con el source pisado).
 */
export async function persistBooleanToggle(
  userId: string,
  source: string,
  next: boolean,
  currentStates: Record<string, boolean>,
): Promise<void> {
  const today = getLocalToday();
  const newStates = { ...currentStates, [source]: next };
  const { error } = await supabase
    .from('daily_electrons')
    .upsert({ user_id: userId, date: today, electrons: newStates }, { onConflict: 'user_id,date' });
  if (error) throw error;
  if (next) {
    await awardBooleanElectron(userId, source as never, {
      idempotencyKey: `${userId}:${source}:${today}`,
    });
  } else {
    // MB-20.4 (nota del audit): toda revocación deja rastro — si un electrón
    // vuelve a desaparecer, las tres puertas al borrado deben verse en el log.
    logWarn('[tareas] revoca electrón', { source, motivo: 'despalomeo del usuario en HOY' });
    await revokeBooleanElectron(userId, source as never);
  }
  await syncCompletionFromElectron(userId, source, next).catch((e) => {
    logWarn('[tareas] sync HOY→Agenda failed', e);
  });
  DeviceEventEmitter.emit('electrons_changed');
}

export type ExperienciaExterna = 'meditation' | 'breathwork' | 'cardio';

/**
 * Registra una experiencia hecha por fuera como sesión real:
 *  · meditation/breathwork → mind_sessions (espejo de meditation.tsx) + e- de
 *    práctica (cap 3/día + espaciado 3h los decide el trigger 213, fail-soft).
 *  · cardio → cardio_sessions manual; el electrón lo deriva el compile de la
 *    actividad real (verificado).
 */
export async function registrarExperiencia(
  userId: string,
  source: ExperienciaExterna,
  minutes: number,
): Promise<{ ok: boolean; error?: string }> {
  const durationSeconds = Math.max(60, Math.round(minutes * 60));
  try {
    if (source === 'cardio') {
      await logCardioSession({ discipline: 'other', duration_seconds: durationSeconds });
    } else {
      const type = source === 'meditation' ? 'meditation' : 'breathing';
      const { error } = await supabase.from('mind_sessions').insert({
        user_id: userId,
        type,
        template_id: 'external_manual',
        template_name: 'Sesión externa',
        duration_seconds: durationSeconds,
        date: getLocalToday(),
      });
      if (error) return { ok: false, error: error.message };
      // Hecha completa por declaración del usuario → califica; el servidor
      // aplica cap y espaciado.
      await awardPracticeElectron(userId, source).catch(() => 'error' as const);
    }
    DeviceEventEmitter.emit('electrons_changed');
    DeviceEventEmitter.emit('day_changed');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}
