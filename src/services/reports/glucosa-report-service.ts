/**
 * Lectura del dominio glucosa (NOCHE-REP): glucosa y cetonas del rango, que
 * es lo mínimo para poder calcular el índice de los dos juntos.
 *
 * LANZA si una consulta falla. Que no haya lecturas y que no se pueda leer son
 * cosas distintas, y la persona merece saber cuál de las dos le pasó.
 */
import { supabase } from '@/src/lib/supabase';
import type { ResolvedRange } from './report-domain-core';
import type { GlucosaRow, CetonaRow } from './glucosa-report-core';

/** Lecturas que se traen como máximo. Un año de medición intensa cabe aquí. */
export const LECTURA_CAP = 3000;

export interface GlucosaReportData {
  glucosa: GlucosaRow[];
  cetonas: CetonaRow[];
}

export async function loadGlucosaReport(range: ResolvedRange): Promise<GlucosaReportData> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('sin sesión');

  let glucosaQ = supabase
    .from('glucose_logs')
    .select('date, time, value_mg_dl, context')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .limit(LECTURA_CAP);
  if (range.from) glucosaQ = glucosaQ.gte('date', range.from);

  let cetonasQ = supabase
    .from('ketones_logs')
    .select('date, time, source, value_mmol, value_ppm, urine_level')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .limit(LECTURA_CAP);
  if (range.from) cetonasQ = cetonasQ.gte('date', range.from);

  const [glucosa, cetonas] = await Promise.all([glucosaQ, cetonasQ]);
  if (glucosa.error) throw glucosa.error;
  if (cetonas.error) throw cetonas.error;

  return {
    glucosa: (glucosa.data ?? []) as GlucosaRow[],
    cetonas: (cetonas.data ?? []) as CetonaRow[],
  };
}
