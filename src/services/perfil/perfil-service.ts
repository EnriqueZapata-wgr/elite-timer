/**
 * perfil-service (8-oct-2026 (v4)). El IO del PERFIL de la v4: lo que el
 * Perfil necesita del plan de la persona para decir "Lo mueve en tu plan".
 * La regla vive en perfil-core.ts (vincularMarcadorPlan), con test.
 *
 * Dos lecturas, cada una con su propio desenlace (regla de la casa: una
 * lectura fallida nunca se ve vacia, y una parte que falla no apaga a la
 * otra):
 *  - Suplementos activos (`user_supplements`): nombre y `reason` (el porque
 *    que escribio quien firma, igual a `suplementos[].por_que`).
 *  - Practicas activas (`user_interventions`, por getMyProtocol, la misma
 *    lectura de siempre, que ya cae bien cuando falta una columna), resueltas
 *    contra el catalogo: raices y biomarcadores (marcadoresDeCatalogo, el
 *    mismo puente que usa "Que hacer hoy").
 * `null` en una parte = no se pudo leer (distinto de "no tiene").
 *
 * El documento NO se lee aqui: el Perfil usa la lectura compartida de HOY
 * (leerEvaluacionEliteVigente, con su cache de 60 s).
 *
 * Cache: el resultado vive 60 s por usuario y la promesa en vuelo se
 * comparte, asi que abrir y cerrar marcadores no viaja a la base. Un fallo
 * no se cachea. `forzar` (Reintentar) salta todo.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { INTERVENTION_BY_KEY } from '@/src/constants/interventions-catalog';
import { getMyProtocol } from '@/src/services/interventions/intervention-service';
import { marcadoresDeCatalogo } from '@/src/services/hoy/que-hacer-hoy-service';
import type { PracticaParaVinculo, SuplementoParaVinculo } from './perfil-core';

export interface PlanParaPerfil {
  suplementos: SuplementoParaVinculo[] | null;
  practicas: PracticaParaVinculo[] | null;
}

const TTL_MS = 60_000;
const cache = new Map<string, { promesa: Promise<PlanParaPerfil>; en: number }>();

/** Al cerrar sesion o cambiar el plan desde fuera: nada de una cuenta queda para la siguiente. */
export function invalidarPlanParaPerfil(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}

async function leerSuplementos(userId: string): Promise<SuplementoParaVinculo[] | null> {
  try {
    const { data, error } = await supabase
      .from('user_supplements')
      // select('*') como mi-plan y la agenda: no rompe en un remoto sin alguna columna.
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (error) {
      logWarn('[perfil] suplementos no se pudieron leer', error);
      return null;
    }
    const out: SuplementoParaVinculo[] = [];
    for (const r of (data ?? []) as Record<string, unknown>[]) {
      if (typeof r.name !== 'string' || !r.name.trim()) continue;
      out.push({
        id: String(r.id),
        nombre: r.name.trim(),
        razon: typeof r.reason === 'string' ? r.reason : null,
      });
    }
    return out;
  } catch (e) {
    logWarn('[perfil] suplementos no se pudieron leer', e);
    return null;
  }
}

async function leerPracticas(userId: string): Promise<PracticaParaVinculo[] | null> {
  try {
    const filas = await getMyProtocol(userId);
    return filas.map((f) => ({
      key: f.def.key,
      nombre: f.def.name,
      raices: f.def.roots,
      marcadores: f.def.isCustom ? [] : marcadoresDeCatalogo(INTERVENTION_BY_KEY[f.def.key]),
    }));
  } catch (e) {
    logWarn('[perfil] practicas no se pudieron leer', e);
    return null;
  }
}

/** Suplementos y practicas activos para los vinculos del Perfil. Nunca rechaza. */
export function leerPlanParaPerfil(userId: string, opts?: { forzar?: boolean }): Promise<PlanParaPerfil> {
  const hit = cache.get(userId);
  if (hit && !opts?.forzar && Date.now() - hit.en < TTL_MS) return hit.promesa;
  const promesa = Promise.all([leerSuplementos(userId), leerPracticas(userId)])
    .then(([suplementos, practicas]) => ({ suplementos, practicas }));
  const entrada = { promesa, en: Date.now() };
  cache.set(userId, entrada);
  promesa.then((r) => {
    // Un fallo no se cachea: el siguiente intento va a la base.
    if ((r.suplementos === null || r.practicas === null) && cache.get(userId) === entrada) cache.delete(userId);
  });
  return promesa;
}
