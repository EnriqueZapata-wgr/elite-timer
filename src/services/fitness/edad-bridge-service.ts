/**
 * Puente Fitness → Edad ATP — capa de integración (MB-3 Track C).
 *
 * Escribe las entradas Tier A en `edad_atp_functional_tests` vía el MISMO
 * capture-service que ya usa el pilar Edad ATP (el motor las lee en el
 * siguiente recálculo vía loadAllParamValues — cero cambios al motor).
 * Tier B se calcula como proyección acotada para el cierre de sesión.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { saveFunctionalTests } from '@/src/services/edad-atp/capture-service';
import {
  tierAFunctionalEntries,
  computeTierBProjection,
  type SessionSetLike,
  type Sexo,
  type TierBProjection,
} from './edad-bridge-core';

export interface EdadSignal {
  /** Etiquetas Tier A que alimentaron el score (verdad medida). */
  alimentado: string[];
  /** Proyección Tier B acotada (o null sin benchmarks secundarios en la sesión). */
  proyeccion: TierBProjection | null;
  avisos: string[];
}

/** Sexo del perfil ('male' | 'female'); null si no está declarado. */
async function getSexo(userId: string): Promise<Sexo | null> {
  // biological_sex vive en client_profiles, no en profiles (fantasma MB-6:
  // el 400 silencioso dejaba el sexo siempre null → benchmarks sin sexo).
  const { data, error } = await supabase
    .from('client_profiles')
    .select('biological_sex')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { logWarn('[edad-bridge] getSexo failed:', error.message); return null; }
  const s = (data as { biological_sex?: string } | null)?.biological_sex;
  return s === 'male' || s === 'female' ? s : null;
}

/** Peso corporal más reciente (health_measurements, coalesce simple). */
async function getBodyweightKg(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('health_measurements')
    .select('weight_kg, date')
    .eq('user_id', userId)
    .not('weight_kg', 'is', null)
    .order('date', { ascending: false })
    .limit(1);
  if (error) { logWarn('[edad-bridge] getBodyweightKg failed:', error.message); return null; }
  const w = (data ?? [])[0]?.weight_kg;
  return typeof w === 'number' && Number.isFinite(w) && w > 0 ? w : null;
}

/**
 * Estatura (MB-3.6 Bloque 5 — broad jump es distancia ×estatura):
 * health_measurements más reciente, con client_profiles como fallback.
 */
async function getEstaturaCm(userId: string): Promise<number | null> {
  try {
    const { data } = await supabase
      .from('health_measurements')
      .select('height_cm, date')
      .eq('user_id', userId)
      .not('height_cm', 'is', null)
      .order('date', { ascending: false })
      .limit(1);
    const h = (data ?? [])[0]?.height_cm;
    if (typeof h === 'number' && Number.isFinite(h) && h > 0) return h;
  } catch { /* sigue el fallback */ }
  try {
    const { data } = await supabase
      .from('client_profiles')
      .select('height_cm')
      .eq('user_id', userId)
      .maybeSingle();
    const h = (data as { height_cm?: number } | null)?.height_cm;
    if (typeof h === 'number' && Number.isFinite(h) && h > 0) return h;
  } catch { /* sin estatura */ }
  return null;
}

/**
 * Procesa la señal Edad ATP de una sesión de fuerza terminada:
 * Tier A → edad_atp_functional_tests (fail-soft: la sesión ya está guardada);
 * Tier B → proyección acotada para el cierre. Sin sexo declarado, push-ups
 * no se alimenta (la norma es por sexo) pero plank sí.
 */
export async function processEdadSignal(userId: string, sets: SessionSetLike[]): Promise<EdadSignal> {
  try {
    const [sexo, bw, estatura] = await Promise.all([
      getSexo(userId),
      getBodyweightKg(userId),
      getEstaturaCm(userId),
    ]);
    // Sin sexo declarado tratamos push-ups como no-aplicable (norma por sexo):
    // 'female' toma el camino conservador de omitir. plank es unisex y sí entra.
    const tierA = tierAFunctionalEntries(sets, sexo ?? 'female');
    if (tierA.entries.length > 0) {
      const res = await saveFunctionalTests(userId, tierA.entries);
      if (!res.ok) {
        logWarn('[edad-bridge] saveFunctionalTests failed:', res.error);
        tierA.alimentado.length = 0;
        tierA.avisos.push('No se pudo registrar el benchmark en tu Edad ATP — se reintenta en tu próxima sesión.');
      }
    }
    const proyeccion = computeTierBProjection(sets, bw, sexo ?? 'male', estatura);
    return {
      alimentado: tierA.alimentado,
      proyeccion: proyeccion.detalle.length > 0 ? proyeccion : null,
      avisos: tierA.avisos,
    };
  } catch (err) {
    logWarn('[edad-bridge] processEdadSignal failed:', err);
    return { alimentado: [], proyeccion: null, avisos: [] };
  }
}
