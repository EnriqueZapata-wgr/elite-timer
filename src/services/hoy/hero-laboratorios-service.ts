/**
 * Hero de HOY: el IO (ATP 3.0, 6-sep-2026, ruta 2.1). La regla vive en
 * hero-laboratorios-core.ts con test; aquí solo se junta la materia prima:
 * sexo (decide la mitad de la matriz V7), el último valor de cada marcador y
 * el último cálculo persistido de Edad ATP.
 *
 * Regla 7 de la casa: este servicio RECHAZA cuando una lectura falla. No se
 * usa `loadCanonicalLabValues` porque devuelve `{}` ante error y con eso el
 * hero diría "Sube tu primer estudio" a alguien sin red. Tampoco se llama a
 * `computeEdadAtpV2`: ese orquestador inserta una fila en
 * `edad_atp_calculations` en cada corrida, y HOY se abre muchas veces al día.
 * Se lee el último cálculo y punto; calcular sigue siendo decisión de la
 * persona en /edad-atp.
 */
import { supabase } from '@/src/lib/supabase';
import { getLabParamMeta } from '@/src/components/edad-atp/component-meta';
import { findMatrizParam } from '@/src/constants/edad-atp-matriz-lookup';
import { estadoDeParametro } from '@/src/services/edad-atp/labs-premium-core';
import {
  collapseLanguageDuplicates,
  dedupeLatestByKey,
  type CanonicalMap,
  type LabValueRow,
} from '@/src/services/edad-atp/lab-values-service';
import type { Sex } from '@/src/types/edad-atp-v2';
import { getLocalToday } from '@/src/utils/date-helpers';
import { numeroDePg } from '@/src/utils/pg-number';
import type { DatosHero, EdadHero, MarcadorHero } from './hero-laboratorios-core';

async function leerSexo(userId: string): Promise<Sex> {
  const { data, error } = await supabase
    .from('client_profiles')
    .select('biological_sex')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`[hero-labs] perfil: ${error.message}`);
  return (data as { biological_sex?: string } | null)?.biological_sex === 'female' ? 'female' : 'male';
}

/** Último valor por parámetro, o rechaza si la lectura falló. */
export async function leerLabsEstricto(userId: string): Promise<CanonicalMap> {
  const { data, error } = await supabase
    .from('lab_values')
    .select('parameter_key, value, measured_at, source, is_voided')
    .eq('user_id', userId)
    .eq('is_voided', false)
    .order('measured_at', { ascending: false });
  if (error) throw new Error(`[hero-labs] lab_values: ${error.message}`);
  return collapseLanguageDuplicates(dedupeLatestByKey((data ?? []) as LabValueRow[], getLocalToday()));
}

/** Último cálculo persistido de Edad ATP; null si nunca se calculó. Rechaza si falló la lectura. */
export async function leerUltimaEdadAtp(userId: string): Promise<EdadHero | null> {
  const { data, error } = await supabase
    .from('edad_atp_calculations')
    .select('chronological_age, edad_integral')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`[hero-labs] edad_atp_calculations: ${error.message}`);
  if (!data) return null;
  const r = data as { chronological_age: unknown; edad_integral: unknown };
  const integral = numeroDePg(r.edad_integral);
  const cronologica = numeroDePg(r.chronological_age);
  if (integral == null || cronologica == null) return null;
  return { integral, cronologica };
}

/** Los marcadores medidos con su estado y su peso, listos para el core. */
export function marcadoresDesdeCanon(sexo: Sex, canon: CanonicalMap): MarcadorHero[] {
  const out: MarcadorHero[] = [];
  for (const [key, cv] of Object.entries(canon)) {
    if (!cv || cv.value == null || !Number.isFinite(cv.value)) continue;
    out.push({
      key,
      etiqueta: getLabParamMeta(key).display_name,
      peso: findMatrizParam(sexo, key)?.weight ?? 0,
      estado: estadoDeParametro(sexo, key, cv.value),
    });
  }
  return out;
}

/** Todo lo que el hero necesita. Rechaza si CUALQUIER lectura falló (regla 7). */
export async function cargarHeroLaboratorios(userId: string): Promise<DatosHero> {
  const [sexo, canon, edad] = await Promise.all([
    leerSexo(userId),
    leerLabsEstricto(userId),
    leerUltimaEdadAtp(userId),
  ]);
  const marcadores = marcadoresDesdeCanon(sexo, canon);
  return { tieneEstudio: marcadores.length > 0, edad, marcadores };
}
