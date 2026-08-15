/**
 * Lectura del dominio expediente (NOCHE-REP): las seis fuentes del registro,
 * cada una por separado.
 *
 * CÓMO SE DECIDE ENTRE "NO HAY NADA" Y "NO PUDIMOS LEER". Cada fuente se lee
 * por su cuenta y se anota si respondió o no. Si TODAS fallaron, se lanza: eso
 * ya no es un expediente vacío, es que no hay conexión. Si falló solo alguna,
 * el reporte se pinta con lo que sí llegó y dice en voz alta cuál no cargó.
 *
 * La alternativa era fail-soft en todo, y ese es justo el bug que dejó dos
 * pantallas colgadas esta semana: una fuente caída se veía idéntica a una
 * fuente vacía, y la persona creía que había perdido su historial.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { loadUserSymptoms } from '@/src/services/salud/user-symptoms-service';
import { getMyProtocol } from '@/src/services/interventions/intervention-service';
import type { TimelineSources } from '@/src/services/salud/mi-expediente-core';
import type { ResolvedRange } from './report-domain-core';
import type { FuenteKey } from './expediente-report-core';

/** Eventos que se traen por fuente. Suficiente para una línea de tiempo densa. */
export const FUENTE_CAP = 500;

export interface ExpedienteReportData {
  fuentes: TimelineSources;
  /** Las fuentes que no respondieron. Se dicen, no se esconden. */
  caidas: FuenteKey[];
}

const VACIO: TimelineSources = {
  symptoms: [], interventionsActivated: [], labs: [],
  measurements: [], glucose: [], ketones: [],
};

/** Etiqueta humana de cada medición del cuerpo, para el evento del timeline. */
const CAMPOS_MEDICION: { campo: string; label: string }[] = [
  { campo: 'weight_kg', label: 'Peso' },
  { campo: 'body_fat_pct', label: 'Grasa corporal' },
  { campo: 'muscle_mass_kg', label: 'Masa muscular' },
  { campo: 'waist_cm', label: 'Cintura' },
  { campo: 'systolic_bp', label: 'Presión arterial' },
  { campo: 'resting_hr', label: 'Frecuencia en reposo' },
  { campo: 'grip_strength_kg', label: 'Fuerza de agarre' },
];

async function intentar<T>(key: FuenteKey, fn: () => Promise<T>, vacio: T): Promise<{ key: FuenteKey; ok: boolean; data: T }> {
  try {
    return { key, ok: true, data: await fn() };
  } catch (e) {
    logWarn(`[reports] fuente del expediente no disponible: ${key}`, e);
    return { key, ok: false, data: vacio };
  }
}

export async function loadExpedienteReport(range: ResolvedRange): Promise<ExpedienteReportData> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('sin sesión');

  const desdeISO = range.from ? `${range.from}T00:00:00.000Z` : null;

  const [labs, mediciones, sintomas, intervenciones, glucosa, cetonas] = await Promise.all([
    intentar('labs', async () => {
      let q = supabase.from('lab_values')
        .select('parameter_key, measured_at')
        .eq('user_id', userId).eq('is_voided', false)
        .order('measured_at', { ascending: false }).limit(FUENTE_CAP);
      if (range.from) q = q.gte('measured_at', range.from);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ marker: r.parameter_key, measured_at: r.measured_at }));
    }, [] as TimelineSources['labs']),

    intentar('mediciones', async () => {
      let q = supabase.from('health_measurements')
        .select('date, weight_kg, body_fat_pct, muscle_mass_kg, waist_cm, systolic_bp, resting_hr, grip_strength_kg')
        .eq('user_id', userId)
        .order('date', { ascending: false }).limit(FUENTE_CAP);
      if (range.from) q = q.gte('date', range.from);
      const { data, error } = await q;
      if (error) throw error;
      const salida: TimelineSources['measurements'] = [];
      for (const fila of (data ?? []) as any[]) {
        // Un renglón trae varias mediciones: se abre una por campo con dato.
        // Contarlo como "una medición" escondería que ese día se midió todo.
        for (const { campo, label } of CAMPOS_MEDICION) {
          if (fila[campo] != null) salida.push({ date: fila.date, label: `${label}: ${fila[campo]}` });
        }
      }
      return salida;
    }, [] as TimelineSources['measurements']),

    intentar('sintomas', async () => {
      const filas = await loadUserSymptoms(userId);
      return filas
        .filter((s) => !range.from || (s.resolved_at ?? s.started_at ?? '') >= range.from)
        .map((s) => ({
          id: s.id, name: s.name, started_at: s.started_at,
          resolved_at: s.resolved_at, severity: s.severity,
        }));
    }, [] as TimelineSources['symptoms']),

    intentar('intervenciones', async () => {
      const filas = await getMyProtocol(userId);
      return filas.map((p) => ({
        id: p.row.id,
        name: p.def.name,
        activated_at: (p.row as any).activated_at ?? null,
      })).filter((x) => !range.from || (x.activated_at ?? '') >= range.from);
    }, [] as TimelineSources['interventionsActivated']),

    intentar('glucosa', async () => {
      let q = supabase.from('glucose_logs')
        .select('value_mg_dl, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(FUENTE_CAP);
      if (desdeISO) q = q.gte('created_at', desdeISO);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((g: any) => ({ value: g.value_mg_dl, at: g.created_at }));
    }, [] as TimelineSources['glucose']),

    intentar('cetonas', async () => {
      let q = supabase.from('ketones_logs')
        .select('value_mmol, created_at')
        .eq('user_id', userId)
        .not('value_mmol', 'is', null)
        .order('created_at', { ascending: false }).limit(FUENTE_CAP);
      if (desdeISO) q = q.gte('created_at', desdeISO);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((k: any) => ({ value: k.value_mmol, at: k.created_at }));
    }, [] as TimelineSources['ketones']),
  ]);

  const todas = [labs, mediciones, sintomas, intervenciones, glucosa, cetonas];
  const caidas = todas.filter((x) => !x.ok).map((x) => x.key);

  // Todas caídas no es un expediente vacío: es que no llegamos a él.
  if (caidas.length === todas.length) throw new Error('ninguna fuente del expediente respondió');

  return {
    fuentes: {
      ...VACIO,
      labs: labs.data,
      measurements: mediciones.data,
      symptoms: sintomas.data,
      interventionsActivated: intervenciones.data,
      glucose: glucosa.data,
      ketones: cetonas.data,
    },
    caidas,
  };
}
