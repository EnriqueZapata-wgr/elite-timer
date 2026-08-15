/**
 * lectura-service — la parte sucia de LA LECTURA: junta el snapshot.
 *
 * Toda la interpretación vive en `lectura-core.ts` (puro y con tests). Aquí solo
 * se leen fuentes y se traducen a la forma que el núcleo espera.
 *
 * FAIL-SOFT POR FUENTE, A PROPÓSITO.
 * Esta semana aparecieron dos pantallas colgadas en "Cargando..." porque una
 * promesa se rechazó y nadie la atrapó. Aquí cada fuente cae sola: si labs
 * truena, la lectura sigue con lo demás y la persona ve, honestamente, que
 * faltan labs. Una fuente caída NUNCA tumba la pantalla.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { loadCanonicalLabValues } from '@/src/services/edad-atp/lab-values-service';
import { getLatestMeasurement } from '@/src/services/health-measurement-service';
import { getLatestCompleteBravermanResult } from '@/src/services/braverman-premium-service';
import { loadUserSymptoms } from '@/src/services/salud/user-symptoms-service';
import { partitionByStatus } from '@/src/services/salud/user-symptoms-core';
import { loadHistoriaClinica } from '@/src/services/historia-clinica-service';
import { getMyProtocol } from '@/src/services/interventions/intervention-service';
import { getCycleInfo } from '@/src/services/cycle-service';
import {
  construirLectura,
  SNAPSHOT_VACIO,
  type Lectura,
  type LecturaSnapshot,
} from './lectura-core';
import type { Sex } from '@/src/types/edad-atp-v2';
import { SALUD_DEL_SISTEMA_ALIMENTA_EL_DIA } from '@/src/constants/flags';
import { LECTURA_VACIA } from '@/src/services/health/health-read-core';
import { leerSaludDelDia } from '@/src/services/health/health-read-service';
import { getLocalToday } from '@/src/utils/date-helpers';

/** Corre una lectura y devuelve el fallback si truena. Nunca propaga. */
async function suave<T>(etiqueta: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logWarn(`[lectura] fuente "${etiqueta}" no cargó:`, err);
    return fallback;
  }
}

async function leerSexo(userId: string): Promise<Sex> {
  const { data } = await supabase
    .from('client_profiles')
    .select('biological_sex')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as { biological_sex?: string } | null)?.biological_sex === 'female' ? 'female' : 'male';
}

async function leerEdad(userId: string) {
  const { data } = await supabase
    .from('edad_atp_calculations')
    .select('chronological_age, edad_integral, phenoage, edad_corporal')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const r = data as {
    chronological_age: number | null;
    edad_integral: number | null;
    phenoage: number | null;
    edad_corporal: number | null;
  };
  return {
    cronologica: r.chronological_age ?? null,
    integral: r.edad_integral ?? null,
    porSangre: r.phenoage ?? null,
    porFisico: r.edad_corporal ?? null,
  };
}

async function leerCronotipo(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('user_chronotype')
    .select('chronotype')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as { chronotype?: string } | null)?.chronotype ?? null;
}

/** Junta las nueve fuentes en el snapshot que el núcleo sabe leer. */
export async function gatherLecturaSnapshot(userId: string): Promise<LecturaSnapshot> {
  const [sexo, labs, medicion, braverman, sintomas, historia, protocolo, cronotipo, edad, ciclo, salud] =
    await Promise.all([
      suave('sexo', () => leerSexo(userId), 'male' as Sex),
      suave('labs', () => loadCanonicalLabValues(userId), {} as Record<string, { value: number; measured_at: string; is_stale: boolean }>),
      suave('composicion', () => getLatestMeasurement(userId), null),
      suave('quimica', () => getLatestCompleteBravermanResult(userId), null),
      suave('sintomas', () => loadUserSymptoms(userId), []),
      suave('historia', () => loadHistoriaClinica(userId), {}),
      suave('protocolo', () => getMyProtocol(userId), []),
      suave('cronotipo', () => leerCronotipo(userId), null),
      suave('edad', () => leerEdad(userId), null),
      suave('ciclo', () => getCycleInfo(userId), null),
      // CIERRE-3: la salud que midió el teléfono hoy. Entra SOLO como relleno
      // de huecos (ver abajo): aquí no puede pisar nada.
      SALUD_DEL_SISTEMA_ALIMENTA_EL_DIA
        ? suave('salud_os', () => leerSaludDelDia(userId, getLocalToday()), LECTURA_VACIA)
        : Promise.resolve(LECTURA_VACIA),
    ]);

  /**
   * Relleno de huecos, y nada más.
   *
   * `medicion` es la ÚLTIMA medición manual, que puede ser de hace meses. Que
   * un peso manual viejo le gane a la báscula de hoy es discutible y no lo
   * decido aquí: por eso la máquina solo entra donde el valor manual es null,
   * o sea donde no hay nada que pisar. Un renglón vacío que se llena es una
   * mejora sin riesgo; reemplazar por antigüedad sería una política nueva.
   */
  const oHuecoDe = (manual: number | null | undefined, maquina: number | null): number | null =>
    manual ?? maquina;

  return {
    ...SNAPSHOT_VACIO,
    sexo,
    labs: labs ?? {},
    composicion: medicion
      ? {
          pesoKg: oHuecoDe(medicion.weight_kg, salud.peso.valor),
          grasaPct: medicion.body_fat_pct ?? null,
          musculoKg: medicion.muscle_mass_kg ?? null,
          visceral: medicion.visceral_fat ?? null,
          agarreKg: medicion.grip_strength_kg ?? null,
          sistolica: medicion.systolic_bp ?? null,
          diastolica: medicion.diastolic_bp ?? null,
          vo2: medicion.vo2max_estimate ?? null,
          pasos: oHuecoDe(medicion.steps_daily, salud.pasos.valor),
          ejercicioMin: medicion.exercise_min_weekly ?? null,
        }
      : null,
    quimica: braverman
      ? { dominante: braverman.dominant_type, deficitPrincipal: braverman.primary_deficiency }
      : null,
    edad,
    sintomasActivos: partitionByStatus(sintomas).active.map((s) => s.name),
    cronotipo,
    faseCiclo: (ciclo as { currentPhase?: string } | null)?.currentPhase ?? null,
    historiaCategorias: Object.keys(historia ?? {}).length,
    intervencionesActivas: (protocolo ?? []).length,
  };
}

/** Lo que consume la pantalla: snapshot + lectura, en una sola llamada. */
export async function loadLectura(userId: string): Promise<Lectura> {
  const snap = await gatherLecturaSnapshot(userId);
  return construirLectura(snap);
}
