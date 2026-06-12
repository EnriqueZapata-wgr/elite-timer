/**
 * Lookup plano de la matriz V7/V6 por `parameter_key` (clave canónica español de `lab_values`).
 * La matriz está organizada por dominio; aquí se aplana a un índice key→MatrizParam para que
 * la UI de labs (gráfica, banda funcional, nombre/unidad) resuelva un parámetro sin recorrer
 * dominios. PURO, sin tocar el motor.
 */
import { MATRIZ_HOMBRES, MATRIZ_MUJERES, type MatrizParam, type MatrizSexo } from './edad-atp-matriz-v7-v6';
import type { Sex } from '@/src/types/edad-atp-v2';

function flatten(matriz: MatrizSexo): Record<string, MatrizParam> {
  const out: Record<string, MatrizParam> = {};
  for (const dom of Object.values(matriz)) {
    for (const p of dom.params) {
      if (out[p.key] === undefined) out[p.key] = p; // primera definición gana (params repetidos en dominios)
    }
  }
  return out;
}

const FLAT_HOMBRES = flatten(MATRIZ_HOMBRES);
const FLAT_MUJERES = flatten(MATRIZ_MUJERES);

/** MatrizParam de un parameter_key para el sexo dado (o undefined si no existe). */
export function findMatrizParam(sex: Sex, key: string): MatrizParam | undefined {
  return (sex === 'female' ? FLAT_MUJERES : FLAT_HOMBRES)[key];
}

/** Dominio (categoría) al que pertenece un parameter_key — para agrupar en ATP Labs (#13). */
export function findMatrizDomain(sex: Sex, key: string): { domain_key: string; domain_name_es: string } | undefined {
  const matriz = sex === 'female' ? MATRIZ_MUJERES : MATRIZ_HOMBRES;
  for (const dom of Object.values(matriz)) {
    if (dom.params.some((p) => p.key === key)) {
      return { domain_key: dom.domain_key, domain_name_es: dom.domain_name_es };
    }
  }
  return undefined;
}

/**
 * Rango funcional ATP (banda óptima, score 100) de un parámetro = [bandLimits[3], bandLimits[4]]
 * (S..T en score9Bands). null si el parámetro no define esa banda (no se inventa rango).
 */
export function functionalBand(param: MatrizParam | undefined): { lo: number; hi: number } | null {
  if (!param) return null;
  const lo = param.bandLimits[3];
  const hi = param.bandLimits[4];
  if (lo == null || hi == null) return null;
  return { lo, hi };
}
