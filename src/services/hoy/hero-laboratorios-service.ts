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
import {
  marcadoresConSexo, sexoDePerfil,
  type DatosHero, type EdadHero, type JuezPorSexo, type MarcadorHero, type ValorMedidoHero,
} from './hero-laboratorios-core';

/**
 * El sexo del perfil, o null si no esta (sin fila, NULL, o un valor que la
 * matriz no conoce). 20-sep-2026 (ronda de arreglos): antes caia a hombre
 * en todos esos casos y el hero y "Que hacer hoy" juzgaban con rangos de
 * hombre a quien nunca lo dijo. Dato del usuario sagrado: si falta, falta.
 * Un error de consulta sigue rechazando (regla 7).
 */
async function leerSexo(userId: string): Promise<Sex | null> {
  const { data, error } = await supabase
    .from('client_profiles')
    .select('biological_sex')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`[hero-labs] perfil: ${error.message}`);
  return sexoDePerfil((data as { biological_sex?: unknown } | null)?.biological_sex);
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

/** La matriz V7 por sexo: peso y estado de un valor. Solo se llama con sexo conocido. */
const JUEZ_MATRIZ: JuezPorSexo = (sexo, key, value) => ({
  peso: findMatrizParam(sexo, key)?.weight ?? 0,
  estado: estadoDeParametro(sexo, key, value),
});

/**
 * Los marcadores medidos con su estado, su peso y su fecha de toma, listos
 * para el core. Con `sexo` null no se juzga nada: todo sale `sin_banda`
 * (marcadoresConSexo, con test).
 */
export function marcadoresDesdeCanon(sexo: Sex | null, canon: CanonicalMap): MarcadorHero[] {
  const valores: ValorMedidoHero[] = [];
  for (const [key, cv] of Object.entries(canon)) {
    if (!cv || cv.value == null || !Number.isFinite(cv.value)) continue;
    valores.push({
      key,
      etiqueta: getLabParamMeta(key).display_name,
      value: cv.value,
      // 20-sep-2026: la fecha viaja hasta la UI ("toma de ...") y decide que
      // un valor de hace meses no gane sobre el ultimo estudio (core).
      fecha: typeof cv.measured_at === 'string' && cv.measured_at ? cv.measured_at.slice(0, 10) : null,
    });
  }
  return marcadoresConSexo(sexo, valores, JUEZ_MATRIZ);
}

export interface SexoYLabs {
  /** null: el perfil no tiene sexo; los estados por rango no se calculan. */
  sexo: Sex | null;
  canon: CanonicalMap;
}

/**
 * 20-sep-2026: una sola lectura de sexo y lab_values por entrada a HOY. El
 * hero y "Que hacer hoy" se montan a la vez y cada uno pedia lo mismo (dos
 * viajes a client_profiles y dos a lab_values, y otros dos con cada evento).
 * La promesa en vuelo se comparte y el resultado bueno vive unos segundos;
 * un fallo no se cachea (el reintento tiene que ir a la base). `forzar`
 * salta la cache (el boton Reintentar).
 */
const TTL_LABS_MS = 3_000;
let cacheLabs: { userId: string; promesa: Promise<SexoYLabs>; resueltaEn: number | null } | null = null;

export function leerSexoYLabs(userId: string, opts?: { forzar?: boolean }): Promise<SexoYLabs> {
  const hit = cacheLabs;
  if (hit && hit.userId === userId && !opts?.forzar && (hit.resueltaEn === null || Date.now() - hit.resueltaEn < TTL_LABS_MS)) {
    return hit.promesa;
  }
  const promesa = Promise.all([leerSexo(userId), leerLabsEstricto(userId)]).then(([sexo, canon]) => ({ sexo, canon }));
  const entrada = { userId, promesa, resueltaEn: null as number | null };
  cacheLabs = entrada;
  promesa.then(() => { if (cacheLabs === entrada) entrada.resueltaEn = Date.now(); })
    .catch(() => { if (cacheLabs === entrada) cacheLabs = null; });
  return promesa;
}

/** Todo lo que el hero necesita. Rechaza si CUALQUIER lectura falló (regla 7). */
export async function cargarHeroLaboratorios(userId: string, opts?: { forzar?: boolean }): Promise<DatosHero> {
  const [{ sexo, canon }, edad] = await Promise.all([
    leerSexoYLabs(userId, opts),
    leerUltimaEdadAtp(userId),
  ]);
  const marcadores = marcadoresDesdeCanon(sexo, canon);
  return { tieneEstudio: marcadores.length > 0, edad, marcadores, faltaSexo: sexo === null };
}
