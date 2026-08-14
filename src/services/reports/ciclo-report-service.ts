/**
 * Lectura del dominio ciclo (OLA1 R-3): los ciclos y el registro diario, en
 * UNA sola ida en vez de las dos pantallas que había.
 *
 * Lanza si la consulta falla. Las dos pantallas viejas ya distinguían "fallo de
 * red" de "sin datos" con una bandera propia (D-2); aquí esa distinción la hace
 * el shell para los trece reportes por igual.
 */
import { supabase } from '@/src/lib/supabase';
import type { ResolvedRange } from './report-domain-core';
import type { CyclePeriodRow, CycleDailyRow } from './ciclo-report-core';

/** Ciclos que se listan como máximo. Dos años de historia larga. */
export const CYCLE_LIST_CAP = 24;

export interface CicloReportData {
  cycles: CyclePeriodRow[];
  logs: CycleDailyRow[];
}

export async function loadCicloReport(range: ResolvedRange): Promise<CicloReportData> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('sin sesión');

  let cyclesQuery = supabase
    .from('cycle_periods')
    .select('id, start_date, end_date, cycle_length, period_length')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
    .limit(CYCLE_LIST_CAP);
  if (range.from) cyclesQuery = cyclesQuery.gte('start_date', range.from);

  let logsQuery = supabase
    .from('cycle_daily_logs')
    .select('date, is_period, energy, mood, appetite, libido, cramps, bloating, sleep_quality, temperature_c, hrv_ms')
    .eq('user_id', userId)
    .order('date', { ascending: true });
  if (range.from) logsQuery = logsQuery.gte('date', range.from);

  const [cycles, logs] = await Promise.all([cyclesQuery, logsQuery]);
  if (cycles.error) throw cycles.error;
  if (logs.error) throw logs.error;

  return {
    cycles: (cycles.data ?? []) as CyclePeriodRow[],
    logs: (logs.data ?? []) as CycleDailyRow[],
  };
}
