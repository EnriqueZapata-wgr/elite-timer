/**
 * cardio-perfil-service — lee del esquema real lo que el perfil de cardio
 * necesita y se lo entrega a cardio-core. BETA (31-ago-2026).
 *
 * De donde sale cada dato (verificado en la base el 31-ago-2026):
 *   - edad y sexo:  client_profiles.date_of_birth / biological_sex (misma
 *     lectura que edad-atp-v2-service).
 *   - FC en reposo: health_measurements.resting_hr (manual o captura Edad ATP)
 *     y health_os_daily.resting_hr (Health Connect / HealthKit, via
 *     health-platform-service). Gana la fecha mas reciente; se dice la fuente.
 *   - VO2max registrado: health_measurements.vo2max_estimate (Cooper de
 *     /tests/run/cooper, o valor directo del wearable capturado a mano en
 *     /edad-atp/vitals). Es lo que ya lee el motor de Edad ATP.
 *   - peso: health_measurements.weight_kg (para Rockport, que hoy no se
 *     alimenta solo; se lee para que el dia que exista la caminata no falte).
 *   - sesiones: cardio_sessions (manual e importadas de Health Connect /
 *     HealthKit, con avg_heart_rate cuando el proveedor lo trae). OJO: el
 *     brief decia workout_sessions, pero esa tabla es la sesion de FUERZA
 *     (mig 222) y no guarda FC ni distancia; el cardio vive en cardio_sessions
 *     y la sesion de fuerza solo lo "adopta" via workout_session_id (mig 225).
 *
 * Regla 6 de la casa: supabase-js no lanza en 4xx; cada lectura chequea
 * `error`. Las lecturas van en allSettled: si falla la de sesiones la
 * pantalla dice "no se pudo leer"; si falla una secundaria (perfil, FC
 * reposo) se degrada a null y se lista en `lecturasFallidas` para que la
 * pantalla no confunda "no hay" con "no se pudo leer".
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';
import { findMatrizParam } from '@/src/constants/edad-atp-matriz-lookup';
import { score9Bands } from '@/src/services/edad-atp/sf-9band-service';
import type { Sex } from '@/src/types/edad-atp-v2';
import {
  edadDesdeFechas, fcMaxima, zonasKarvonen, vo2maxUth, minutosPorZona,
  resumirSesiones, filtrarVentana, restarDias,
  type SesionCardioLite, type ZonaFC, type MinutosPorZona, type ResumenSesiones, type MetodoVo2,
} from './cardio-core';

export type FuenteFcReposo = 'manual' | 'edad_atp' | 'healthkit' | 'health_connect' | 'otra';

export interface FcReposoLeida {
  bpm: number;
  fecha: string;
  fuente: FuenteFcReposo;
}

export interface Vo2Estimado {
  valor: number;
  metodo: MetodoVo2;
  /** Frase corta para pantalla: con que dato se calculo. */
  detalle: string;
  fecha: string | null;
}

export interface ClasificacionVo2 {
  /** Mismo mapeo de score a estado que parameter-chart-model (>=80 optimo, >=50 aceptable). */
  estado: 'optimo' | 'aceptable' | 'atencion';
  /** La banda de la matriz V7/V6 en la que cae el valor (lo puede ser null en la primera). */
  banda: { lo: number | null; hi: number };
}

export interface PerfilCardio {
  hoy: string;
  edad: number | null;
  sexo: Sex | null;
  /** 4EP: el perfil SI trae sexo biologico pero no es hombre ni mujer
   *  ('intersex' es valor permitido): la matriz V7/V6 no tiene banda para el.
   *  OJO: Edad ATP lo trata como male (edad-atp-v2-service); aqui NO. */
  sexoRegistrado: boolean;
  pesoKg: number | null;
  fcReposo: FcReposoLeida | null;
  /** Tanaka 2001. null sin edad. */
  fcMax: number | null;
  /** Karvonen. null sin fcMax o sin fcReposo. */
  zonas: ZonaFC[] | null;
  /** El VO2max que se muestra grande: registrado gana sobre estimado. */
  vo2: Vo2Estimado | null;
  /** Todas las estimaciones disponibles, para que la pantalla diga cual uso. */
  vo2Alternativas: Vo2Estimado[];
  /** Solo si la matriz V7/V6 tiene banda para vo2_estimado (la tiene) y hay sexo. */
  clasificacionVo2: ClasificacionVo2 | null;
  sesiones28: SesionCardioLite[];
  semana: ResumenSesiones;
  ventana28: ResumenSesiones;
  cargaSemana: MinutosPorZona | null;
  carga28: MinutosPorZona | null;
  /** Lecturas secundarias que fallaron (perfil, medidas, wearable). */
  lecturasFallidas: string[];
}

export interface ResultadoPerfilCardio {
  perfil: PerfilCardio | null;
  /** Solo cuando NO se pudo leer lo esencial (las sesiones). */
  error: string | null;
}

/** Filas tal como llegan de PostgREST (numeric viaja como string). */
interface FilaSesion { date: string; discipline: string | null; duration_seconds: number | null; distance_meters: number | string | null; avg_heart_rate: number | null; source: string | null }
interface FilaMedida { date: string; resting_hr: number | null; vo2max_estimate: number | string | null; weight_kg: number | string | null; source: string | null }
interface FilaOs { date: string; resting_hr: number | null; source: string | null }

const DIAS_VENTANA = 28;
/** Filas de health_measurements que se leen para coalescer por columna
 *  (el upsert diario fragmenta las metricas entre filas, ver edad-atp-v2). */
const FILAS_MEDIDAS = 60;

export async function cargarPerfilCardio(userId: string): Promise<ResultadoPerfilCardio> {
  const hoy = getLocalToday();
  const desde28 = restarDias(hoy, DIAS_VENTANA - 1);
  const lecturasFallidas: string[] = [];

  const [sesRes, perfilRes, medidasRes, osRes] = await Promise.allSettled([
    supabase
      .from('cardio_sessions')
      .select('date, discipline, duration_seconds, distance_meters, avg_heart_rate, source')
      .eq('user_id', userId)
      .gte('date', desde28)
      .lte('date', hoy)
      .order('date', { ascending: false }),
    supabase
      .from('client_profiles')
      .select('date_of_birth, biological_sex')
      .eq('user_id', userId)
      .limit(1),
    supabase
      .from('health_measurements')
      .select('date, resting_hr, vo2max_estimate, weight_kg, source')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(FILAS_MEDIDAS),
    supabase
      .from('health_os_daily')
      .select('date, resting_hr, source')
      .eq('user_id', userId)
      .not('resting_hr', 'is', null)
      .order('date', { ascending: false })
      .limit(1),
  ]);

  // Esencial: sin sesiones legibles la pantalla no puede decir nada honesto.
  if (sesRes.status === 'rejected' || sesRes.value.error) {
    const e = sesRes.status === 'rejected' ? sesRes.reason : sesRes.value.error;
    logWarn('[cardio-perfil] cardio_sessions', e);
    return { perfil: null, error: 'No se pudieron leer tus sesiones de cardio.' };
  }
  const sesiones28 = ((sesRes.value.data ?? []) as FilaSesion[]).map((r): SesionCardioLite => ({
    date: String(r.date),
    discipline: String(r.discipline ?? 'other'),
    duration_seconds: numOrNull(r.duration_seconds),
    distance_meters: numOrNull(r.distance_meters),
    avg_heart_rate: numOrNull(r.avg_heart_rate),
    source: r.source ?? null,
  }));

  // Perfil (edad, sexo): secundario.
  let edad: number | null = null;
  let sexo: Sex | null = null;
  let sexoRegistrado = false;
  if (perfilRes.status === 'fulfilled' && !perfilRes.value.error) {
    const p = (perfilRes.value.data ?? [])[0] as { date_of_birth?: string | null; biological_sex?: string | null } | undefined;
    edad = edadDesdeFechas(p?.date_of_birth ?? null, hoy);
    sexo = p?.biological_sex === 'female' ? 'female' : p?.biological_sex === 'male' ? 'male' : null;
    sexoRegistrado = !!p?.biological_sex;
  } else {
    lecturasFallidas.push('perfil');
    logWarn('[cardio-perfil] client_profiles', perfilRes.status === 'rejected' ? perfilRes.reason : perfilRes.value.error);
  }

  // Medidas: coalesce por columna (la fila mas reciente que tenga el dato).
  let fcReposoManual: FcReposoLeida | null = null;
  let vo2Registrado: { valor: number; fecha: string } | null = null;
  let pesoKg: number | null = null;
  if (medidasRes.status === 'fulfilled' && !medidasRes.value.error) {
    for (const r of (medidasRes.value.data ?? []) as FilaMedida[]) {
      const fecha = String(r.date);
      const rhr = numOrNull(r.resting_hr);
      if (fcReposoManual == null && rhr != null && rhr > 0) {
        fcReposoManual = { bpm: rhr, fecha, fuente: r.source === 'edad_atp' ? 'edad_atp' : 'manual' };
      }
      const vo2 = numOrNull(r.vo2max_estimate);
      if (vo2Registrado == null && vo2 != null && vo2 > 0) vo2Registrado = { valor: vo2, fecha };
      const w = numOrNull(r.weight_kg);
      if (pesoKg == null && w != null && w > 0) pesoKg = w;
      if (fcReposoManual && vo2Registrado && pesoKg != null) break;
    }
  } else {
    lecturasFallidas.push('medidas');
    logWarn('[cardio-perfil] health_measurements', medidasRes.status === 'rejected' ? medidasRes.reason : medidasRes.value.error);
  }

  // Wearable: health_os_daily puede no existir en remoto; degrada a null.
  let fcReposoOs: FcReposoLeida | null = null;
  if (osRes.status === 'fulfilled' && !osRes.value.error) {
    const r = ((osRes.value.data ?? []) as FilaOs[])[0];
    const rhr = r ? numOrNull(r.resting_hr) : null;
    if (r && rhr != null && rhr > 0) {
      fcReposoOs = { bpm: rhr, fecha: String(r.date), fuente: r.source === 'healthkit' ? 'healthkit' : r.source === 'health_connect' ? 'health_connect' : 'otra' };
    }
  } else {
    // Tabla ausente o sin permiso: no es "no hay", es "no se pudo leer".
    lecturasFallidas.push('wearable');
  }

  const fcReposo = masReciente(fcReposoManual, fcReposoOs);
  const fcMax = fcMaxima(edad);
  const zonas = zonasKarvonen(fcMax, fcReposo?.bpm ?? null);

  // VO2max: registrado gana (es una medicion o un test hecho a proposito);
  // Uth es estimacion sobre estimacion y se ofrece como alternativa.
  const vo2Alternativas: Vo2Estimado[] = [];
  if (vo2Registrado) {
    vo2Alternativas.push({
      valor: vo2Registrado.valor, metodo: 'registrado', fecha: vo2Registrado.fecha,
      detalle: 'Estimado por el test de Cooper o por tu wearable, capturado en Edad ATP',
    });
  }
  const uth = vo2maxUth(fcMax, fcReposo?.bpm ?? null);
  if (uth != null && fcMax != null && fcReposo) {
    vo2Alternativas.push({
      valor: uth, metodo: 'uth2004', fecha: fcReposo.fecha,
      detalle: `Uth 2004: 15.3 x FCmax estimada ${fcMax} (Tanaka) / FC reposo ${fcReposo.bpm}. Método validado en hombres entrenados`,
    });
  }
  const vo2 = vo2Alternativas[0] ?? null;

  const semanaDesde = restarDias(hoy, 6);
  const sesionesSemana = filtrarVentana(sesiones28, semanaDesde, hoy);

  return {
    perfil: {
      hoy, edad, sexo, sexoRegistrado, pesoKg, fcReposo, fcMax, zonas, vo2, vo2Alternativas,
      clasificacionVo2: clasificarVo2(vo2?.valor ?? null, sexo),
      sesiones28,
      semana: resumirSesiones(sesiones28, semanaDesde, hoy),
      ventana28: resumirSesiones(sesiones28, desde28, hoy),
      cargaSemana: minutosPorZona(sesionesSemana, zonas),
      carga28: minutosPorZona(sesiones28, zonas),
      lecturasFallidas,
    },
    error: null,
  };
}

/**
 * Clasificacion del VO2max con la banda `vo2_estimado` de la Matriz de Salud
 * Funcional V7 (hombres) / V6 (mujeres), src/constants/edad-atp-matriz-v7-v6.ts
 * (Zapata y Doria, extraida 2026-06-09). Es la unica tabla de la casa con
 * dueño; NO se agrega otra por edad. Sin sexo no hay matriz y se devuelve
 * null: la pantalla dice "clasificacion pendiente".
 */
export function clasificarVo2(vo2: number | null, sexo: Sex | null): ClasificacionVo2 | null {
  if (vo2 == null || !sexo) return null;
  const param = findMatrizParam(sexo, 'vo2_estimado');
  if (!param) return null;
  const score = score9Bands(vo2, param.bandLimits);
  if (score == null) return null;
  // La banda en la que cae el valor: primer limite (no null) que lo cubre y el
  // limite anterior. Se pinta para que la persona vea de donde sale el estado.
  // 4EP (31-ago-2026): score9Bands abre cada banda con >= y la cierra con <
  // (salvo el optimo 2, cerrado en T). Con <= aqui, 36/42/50 exactos caian en
  // la banda anterior y el estado y la banda se contradecian. Se usa < y el
  // ultimo limite (100) inclusivo.
  let lo: number | null = null;
  let hi: number | null = null;
  const limites = param.bandLimits.filter((l): l is number => l != null);
  for (let i = 0; i < limites.length; i++) {
    const lim = limites[i];
    const ultimo = i === limites.length - 1;
    if (vo2 < lim || (ultimo && vo2 <= lim)) { hi = lim; break; }
    lo = lim;
  }
  if (hi == null) return null; // fuera de rango de la matriz: no se clasifica
  return { estado: score >= 80 ? 'optimo' : score >= 50 ? 'aceptable' : 'atencion', banda: { lo, hi } };
}

/**
 * Captura manual de FC en reposo desde la pantalla de cardio. Va a la fila de
 * HOY de health_measurements (upsert por user_id+date que solo toca
 * resting_hr y source): misma columna que /edad-atp/vitals, asi Edad ATP y el
 * score la ven igual. Rango 25 a 220: el mismo CHECK que la base ya impone a
 * resting_hr en health_os_daily (migracion 264); no hay otra cifra con fuente.
 * source = 'manual' explicito (vocabulario de health_measurements: 'manual' |
 * 'edad_atp') para que la fila no herede 'edad_atp' y la pantalla lo diga mal.
 */
export async function guardarFcReposo(userId: string, bpm: number): Promise<{ error: string | null }> {
  if (!Number.isFinite(bpm) || bpm < 25 || bpm > 220) {
    return { error: 'Escribe una FC en reposo entre 25 y 220 latidos por minuto.' };
  }
  try {
    const { error } = await supabase
      .from('health_measurements')
      .upsert(
        { user_id: userId, date: getLocalToday(), resting_hr: Math.round(bpm), source: 'manual', updated_at: new Date().toISOString() },
        { onConflict: 'user_id,date' },
      );
    if (error) throw new Error(error.message);
    return { error: null };
  } catch (e) {
    logWarn('[cardio-perfil] guardarFcReposo', e);
    return { error: 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.' };
  }
}

// ── helpers ──

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function masReciente(a: FcReposoLeida | null, b: FcReposoLeida | null): FcReposoLeida | null {
  if (!a) return b;
  if (!b) return a;
  return b.fecha > a.fecha ? b : a;
}
