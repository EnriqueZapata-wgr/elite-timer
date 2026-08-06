/**
 * graduacion-service (MB-26 Pieza 2) — efectos de la graduación.
 *
 * El historial se lee del ledger que ya existe (electron_logs por fecha);
 * la decisión es de graduacion-core (pura); aquí solo se ejecuta:
 *  · procesarRecaidas: graduado verificado con 5/7 fallados → vuelve a
 *    activo y se avisa por el inbox, sin regaño. El flip mismo es el
 *    dedup: solo se avisa cuando el estado de verdad cambió.
 *  · graduarHabito: el usuario aceptó la propuesta.
 *
 * ⚠️ Clase {error}: supabase-js no lanza en 4xx — toda lectura se revisa.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { ELECTRON_WEIGHTS, type ElectronSource } from '@/src/constants/electrons';
import { recaidasDeGraduados, type HistorialHabitos } from '@/src/services/hoy/graduacion-core';
import { setHabitState } from '@/src/services/hoy/habit-states-service';
import type { HabitEstado } from '@/src/services/hoy/habit-states-core';

const nombreDe = (key: string) => ELECTRON_WEIGHTS[key as ElectronSource]?.name ?? key;

/**
 * Historial de hechos por hábito en los últimos `dias`. null = FALLO de
 * lectura (no confundir con "sin historial": un fallo aquí que se leyera
 * como ceros propondría reposos y recaídas falsas).
 */
export async function getHistorialBooleanos(
  userId: string,
  desdeFecha: string,
): Promise<HistorialHabitos | null> {
  const { data, error } = await supabase
    .from('electron_logs')
    .select('source, date')
    .eq('user_id', userId)
    .eq('category', 'boolean_daily')
    .gte('date', desdeFecha);
  if (error) {
    logWarn('[graduacion] historial read failed', error);
    return null;
  }
  const out: Record<string, Set<string>> = {};
  for (const r of (data ?? []) as { source: string; date: string }[]) {
    if (!r.source || !r.date) continue;
    (out[r.source] ??= new Set()).add(r.date);
  }
  return out;
}

/** El usuario aceptó: el hábito se gradúa. Nada más se toca. */
export async function graduarHabito(userId: string, key: string): Promise<{ ok: boolean }> {
  return setHabitState(userId, key, 'graduado');
}

/**
 * Recaídas de graduados verificados: vuelven solos a activo, con aviso al
 * inbox SIN regaño. Se llama fire-and-forget desde el compile; el
 * setHabitState emite 'electrons_changed' y el siguiente compile ya los
 * pinta como renglón.
 */
export async function procesarRecaidas(
  userId: string,
  estados: Record<string, HabitEstado>,
  historial: HistorialHabitos,
  hoy: string,
): Promise<void> {
  for (const key of recaidasDeGraduados(estados, historial, hoy)) {
    const { ok } = await setHabitState(userId, key, 'activo');
    if (!ok) continue; // sin flip no hay aviso: el flip es el dedup
    const { error } = await supabase.from('user_notifications').insert({
      user_id: userId,
      type: 'habit_recaida',
      title: `${nombreDe(key)} volvió a tu día`,
      body: 'Se te fue unos días, así que regresa a tu lista. Tu historial y tu racha siguen intactos.',
      data: { habitKey: key },
    });
    if (error) logWarn('[graduacion] aviso de recaída failed', error);
  }
}
