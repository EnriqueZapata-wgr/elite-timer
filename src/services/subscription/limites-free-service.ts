/**
 * Límites de Free: el IO (ATP 3.0, 5-sep-2026, ruta 1.11). La regla vive en
 * limites-free-core.ts con test; aquí solo se junta la materia prima.
 *
 * Para los tres marcadores con ficha de Free hacen falta el sexo (decide qué
 * mitad de la matriz V7 se usa), el último valor canónico de cada parámetro y
 * su peso en la matriz. Con eso el core ordena por impacto y devuelve las
 * tres llaves abiertas.
 *
 * Regla 7 de la casa: "no se pudo leer" no es "no hay". Si algo falla, se
 * devuelve null y quien pinta abre la ficha (fail-open).
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { findMatrizParam } from '@/src/constants/edad-atp-matriz-lookup';
import { estadoDeParametro } from '@/src/services/edad-atp/labs-premium-core';
import {
  collapseLanguageDuplicates,
  dedupeLatestByKey,
  type CanonicalMap,
  type LabValueRow,
} from '@/src/services/edad-atp/lab-values-service';
import { getLocalToday } from '@/src/utils/date-helpers';
import type { Sex } from '@/src/types/edad-atp-v2';
import { marcadoresAbiertosFree, type MarcadorParaImpacto } from './limites-free-core';

/** Sexo biológico del perfil; sin dato se usa la matriz de hombres (mismo default que Edad ATP). */
async function sexoDe(userId: string): Promise<Sex> {
  const { data, error } = await supabase
    .from('client_profiles')
    .select('biological_sex')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.biological_sex === 'female' ? 'female' : 'male';
}

/**
 * Lectura ESTRICTA de los valores canónicos (4EP 5-sep-2026, regla 7):
 * `loadCanonicalLabValues` atrapa el error y devuelve `{}`, y aquí un mapa
 * vacío cerraría las tres fichas por "no tener datos" cuando lo que pasó es
 * que no se pudo leer. Mismo patrón que `loadAllSeriesEstricto`: con error se
 * rechaza, y el catch de arriba devuelve null (la ficha abre).
 */
async function valoresCanonicosEstricto(userId: string): Promise<CanonicalMap> {
  const { data, error } = await supabase
    .from('lab_values')
    .select('parameter_key, value, measured_at, source, is_voided')
    .eq('user_id', userId)
    .eq('is_voided', false)
    .order('measured_at', { ascending: false });
  if (error) throw new Error(`[limites-free] lab_values: ${error.message}`);
  return dedupeLatestByKey((data ?? []) as LabValueRow[], getLocalToday());
}

/**
 * Las llaves de los marcadores que este Free ve con ficha, o null si no se
 * pudo calcular (red, RLS). Quien llama decide con `puedeVerFicha`.
 */
export async function cargarMarcadoresAbiertosFree(userId: string): Promise<string[] | null> {
  try {
    const [sexo, canonRaw] = await Promise.all([sexoDe(userId), valoresCanonicosEstricto(userId)]);
    const canon = collapseLanguageDuplicates(canonRaw);
    const marcadores: MarcadorParaImpacto[] = [];
    for (const [key, cv] of Object.entries(canon)) {
      if (!cv || cv.value == null || !Number.isFinite(cv.value)) continue;
      marcadores.push({
        key,
        peso: findMatrizParam(sexo, key)?.weight ?? 0,
        estado: estadoDeParametro(sexo, key, cv.value),
      });
    }
    return marcadoresAbiertosFree(marcadores);
  } catch (e) {
    logWarn('[limites-free] no se pudo calcular los marcadores abiertos', e);
    return null;
  }
}
