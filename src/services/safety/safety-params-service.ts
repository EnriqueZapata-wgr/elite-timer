/**
 * Sprint Compliance 3 — Parámetros de seguridad server-driven.
 *
 * Los umbrales clínicos son BORRADOR (Mariana los confirma como contenido):
 * viven en la tabla safety_params (migración 210) para poder ajustarlos con
 * un UPDATE sin re-deploy ni OTA. El cliente los lee con cache en memoria y
 * fallback a los defaults compilados (fail-safe sin red = umbrales
 * conservadores del handoff).
 */
import { supabase } from '@/src/lib/supabase';
import { DEFAULT_SAFETY_PARAMS, type SafetyParams } from './safety-params-defaults';

// Tipos + defaults viven en safety-params-defaults.ts (módulo PURO, sin
// supabase — el motor de prescripción también los consume). Se re-exportan
// para los consumidores del servicio.
export {
  DEFAULT_SAFETY_PARAMS,
  PULL_ONLY_INTERVENTION_KEYS,
  type SafetyParams,
  type FeverScreeningParams,
  type FastingSafetyParams,
  type BreathLimitsParams,
  type GateFamilyParams,
  type ProtocolGateParams,
} from './safety-params-defaults';

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { params: SafetyParams; at: number } | null = null;

/** Merge superficial: cada key de la tabla reemplaza al default completo. */
function mergeParams(rows: { key: string; value: unknown }[]): SafetyParams {
  const out: SafetyParams = { ...DEFAULT_SAFETY_PARAMS };
  for (const row of rows) {
    if (row.key in out && row.value && typeof row.value === 'object') {
      (out as any)[row.key] = { ...(out as any)[row.key], ...(row.value as object) };
    }
  }
  return out;
}

/** Parámetros vigentes (server-driven con fallback compilado). */
export async function getSafetyParams(): Promise<SafetyParams> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.params;
  try {
    const { data, error } = await supabase.from('safety_params').select('key, value');
    if (error || !data) return DEFAULT_SAFETY_PARAMS;
    const params = mergeParams(data);
    cache = { params, at: Date.now() };
    return params;
  } catch {
    return DEFAULT_SAFETY_PARAMS;
  }
}

/** Solo para tests. */
export function __clearSafetyParamsCache(): void {
  cache = null;
}
