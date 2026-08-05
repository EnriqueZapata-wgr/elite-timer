/**
 * ARGOS Chat — carga de señales del día para el estado vacío (MB-21 P4.4).
 * Cuatro lecturas baratas, cada una fail-soft: si algo falla, la señal queda
 * neutra y el chip cae al default. La decisión vive en argos-suggestions-core.
 */
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import type { TodaySignals } from './argos-suggestions-core';

export async function loadTodaySignals(userId: string): Promise<TodaySignals> {
  const today = getLocalToday();
  const signals: TodaySignals = {
    hasInsight: false,
    fastingActive: false,
    mealsToday: null,
    electronsEarned: null,
    hour: new Date().getHours(),
  };

  const [insight, meals, fasting, electrons] = await Promise.all([
    supabase
      .from('argos_daily_insights')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()
      .then((r) => r, () => ({ data: null, error: true } as any)),
    supabase
      .from('food_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('date', today)
      .then((r) => r, () => ({ count: null, error: true } as any)),
    supabase
      .from('fasting_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
      .then((r) => r, () => ({ data: null, error: true } as any)),
    supabase
      .from('electron_logs')
      .select('electrons')
      .eq('user_id', userId)
      .eq('date', today)
      .then((r) => r, () => ({ data: null, error: true } as any)),
  ]);

  if (!insight.error && insight.data) signals.hasInsight = true;
  if (!meals.error && typeof meals.count === 'number') signals.mealsToday = meals.count;
  if (!fasting.error && fasting.data) signals.fastingActive = true;
  if (!electrons.error && Array.isArray(electrons.data)) {
    signals.electronsEarned = electrons.data.reduce((s: number, e: any) => s + Number(e.electrons || 0), 0);
  }
  return signals;
}
