/**
 * Lectura del dominio labs (NOCHE-REP): las mediciones canónicas del rango,
 * el sexo (que decide qué matriz aplica) y la fase del ciclo (que decide cómo
 * se leen los marcadores hormonales).
 *
 * Se lee de lab_values, que es la tabla canónica time-series, y NO de la tabla
 * ancha legacy: aquella guarda un estudio por renglón con una columna por
 * biomarcador, y de ahí no sale una serie limpia por parámetro.
 *
 * LANZA si la lectura de valores falla. El sexo y la fase del ciclo son
 * fail-soft: sin ellos el reporte sigue de pie, solo que dice menos. Tumbarlo
 * entero porque no se pudo leer una preferencia sería castigar al usuario por
 * un problema que no es suyo.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getCycleInfo } from '@/src/services/cycle-service';
import type { Sex } from '@/src/types/edad-atp-v2';
import type { ResolvedRange } from './report-domain-core';
import type { MedicionLab } from './labs-report-core';

/** Mediciones que se traen como máximo. Años de estudios caben aquí. */
export const MEDICION_CAP = 4000;

export interface LabsReportData {
  mediciones: MedicionLab[];
  sexo: Sex;
  /** Fase del ciclo de HOY, no la del día del estudio. null si no aplica o no se sabe. */
  faseCiclo: string | null;
}

/**
 * `userIdExplicito` existe para que el contexto de ARGOS pueda reusar esta
 * lectura tal cual: allá el userId ya viene resuelto y volver a pedir la sesión
 * sería una llamada de más. Sin él se comporta igual que siempre.
 */
export async function loadLabsReport(
  range: ResolvedRange,
  userIdExplicito?: string,
): Promise<LabsReportData> {
  let userId = userIdExplicito;
  if (!userId) {
    const { data: sessionData } = await supabase.auth.getSession();
    userId = sessionData.session?.user?.id;
  }
  if (!userId) throw new Error('sin sesión');

  let q = supabase
    .from('lab_values')
    .select('parameter_key, value, unit, measured_at, source')
    .eq('user_id', userId)
    .eq('is_voided', false)
    .order('measured_at', { ascending: true })
    .limit(MEDICION_CAP);
  if (range.from) q = q.gte('measured_at', range.from);

  const { data, error } = await q;
  if (error) throw error;

  const [sexo, faseCiclo] = await Promise.all([leerSexo(userId), leerFase(userId)]);

  return {
    mediciones: (data ?? []) as MedicionLab[],
    sexo,
    faseCiclo,
  };
}

/**
 * Resumen barato para la tarjeta del hub: cuántos biomarcadores distintos y
 * cuántas mediciones hay en el rango. Es UNA consulta y sin evaluar bandas a
 * propósito: el hub ya dispara una docena de lecturas, y meterle la lectura
 * completa del dominio para pintar dos cifras lo volvería lento.
 *
 * Fail-soft: si no responde, la tarjeta no aparece y el hub sigue en pie.
 */
export async function loadLabsHubSummary(
  range: ResolvedRange,
): Promise<{ parametros: number; mediciones: number } | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return null;

    let q = supabase
      .from('lab_values')
      .select('parameter_key')
      .eq('user_id', userId)
      .eq('is_voided', false)
      .limit(MEDICION_CAP);
    if (range.from) q = q.gte('measured_at', range.from);

    const { data, error } = await q;
    if (error) throw error;
    const filas = (data ?? []) as { parameter_key: string }[];
    return {
      parametros: new Set(filas.map((r) => r.parameter_key)).size,
      mediciones: filas.length,
    };
  } catch (e) {
    logWarn('[reports] resumen de labs para el hub no disponible', e);
    return null;
  }
}

/**
 * El sexo biológico decide qué matriz de rangos funcionales aplica. Sin dato
 * se cae a 'male', que es lo que ya hace el resto de la app: es un default
 * declarado, no una suposición nueva de este archivo.
 */
async function leerSexo(userId: string): Promise<Sex> {
  try {
    const { data, error } = await supabase
      .from('client_profiles')
      .select('biological_sex')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data?.biological_sex === 'female' ? 'female' : 'male';
  } catch (e) {
    logWarn('[reports] sexo biológico no disponible para labs', e);
    return 'male';
  }
}

/** La fase del ciclo. null cuando la puerta del pilar cierra o no hay registro. */
async function leerFase(userId: string): Promise<string | null> {
  try {
    const info = await getCycleInfo(userId);
    return info?.currentPhase ?? null;
  } catch (e) {
    logWarn('[reports] fase del ciclo no disponible para labs', e);
    return null;
  }
}
