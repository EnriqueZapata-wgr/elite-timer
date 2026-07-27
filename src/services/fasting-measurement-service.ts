/**
 * Fasting Measurement Service — lee la glucosa y cetonas capturadas DURANTE el
 * ayuno activo para el modo medido (MB-9 · Track E.3). Best-effort: si falla,
 * la pastilla de fase cae al estado estimado por tiempo. La matemática (GKI,
 * profundidad de cetosis) vive en fasting-metrics-core (puro).
 *
 * Fuentes ya existentes: glucose_logs (040, value_mg_dl) y ketones_logs (078,
 * value_mmol, β-hidroxibutirato). Solo se leen las lecturas con context='fasting'
 * tomadas después del inicio del ayuno.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';

export interface FastingMeasurement {
  /** Última glucosa en mg/dL durante el ayuno (null si no hay). */
  glucoseMgdl: number | null;
  /** Última cetona (β-hidroxibutirato) en mmol/L durante el ayuno (null si no hay). */
  ketonesMmol: number | null;
}

/** Lee la glucosa y cetonas más recientes tomadas desde el inicio del ayuno. */
export async function loadLatestFastingMeasurement(fastStartIso: string): Promise<FastingMeasurement> {
  const empty: FastingMeasurement = { glucoseMgdl: null, ketonesMmol: null };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return empty;
    const [g, k] = await Promise.all([
      supabase
        .from('glucose_logs')
        .select('value_mg_dl, created_at')
        .eq('user_id', user.id)
        .eq('context', 'fasting')
        .gte('created_at', fastStartIso)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('ketones_logs')
        .select('value_mmol, created_at')
        .eq('user_id', user.id)
        .eq('context', 'fasting')
        .gte('created_at', fastStartIso)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);
    if (g.error) logWarn('[fasting-measurement] glucose read failed:', g.error.message);
    if (k.error) logWarn('[fasting-measurement] ketones read failed:', k.error.message);
    const gVal = g.data?.[0]?.value_mg_dl;
    const kVal = k.data?.[0]?.value_mmol;
    return {
      glucoseMgdl: typeof gVal === 'number' ? gVal : null,
      ketonesMmol: kVal != null && Number.isFinite(Number(kVal)) ? Number(kVal) : null,
    };
  } catch (e) {
    logWarn('[fasting-measurement] loadLatestFastingMeasurement threw:', e);
    return empty;
  }
}
