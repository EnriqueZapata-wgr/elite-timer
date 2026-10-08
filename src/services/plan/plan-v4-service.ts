/**
 * plan-v4-service (8-oct-2026 (v4), Fase A). El IO de PLAN v4 y de la hilera
 * "Recomendadas por tu plan". No lee nada nuevo: usa leerMiPlan (una lectura
 * por parte, cada una con su propio desenlace, nunca rechaza).
 *
 * Por que hay una cache aqui: PLAN y la sala de Apps piden la misma semana.
 * Una sola lectura en vuelo se comparte, y una lectura COMPLETA y sin fallos
 * vive 30 s; asi brincar entre pestañas no vuelve a pedir todo a la base. Una
 * lectura con alguna parte caida no se guarda: el siguiente foco reintenta.
 * `forzar` (jalar hacia abajo, Reintentar) salta la cache y la renueva.
 */
import { leerMiPlan } from '@/src/services/plan/mi-plan-service';
import {
  fusionarInsumos, PARTES_TODAS, type InsumosPlan, type ParteKey,
} from '@/src/services/plan/mi-plan-core';

const TTL_MS = 30_000;

interface Entrada {
  promesa: Promise<InsumosPlan>;
  /** null mientras esta en vuelo. */
  resueltaEn: number | null;
}

const cache = new Map<string, Entrada>();

/** Ninguna parte pedida llego como fallo. */
function completa(ins: InsumosPlan): boolean {
  return PARTES_TODAS.every((k) => ins[k] === undefined || ins[k]!.ok);
}

/** Para el cierre de sesion o una escritura que cambia el plan. */
export function invalidarPlanV4(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}

/**
 * La semana completa (todas las partes). Comparte la lectura en vuelo y sirve
 * la ultima buena de hace menos de 30 s. Nunca rechaza (leerMiPlan tampoco).
 */
export function leerPlanSemana(userId: string, opts: { forzar?: boolean } = {}): Promise<InsumosPlan> {
  const hit = cache.get(userId);
  if (hit && !opts.forzar && (hit.resueltaEn === null || Date.now() - hit.resueltaEn < TTL_MS)) return hit.promesa;
  const entrada: Entrada = { promesa: leerMiPlan(userId, { forzar: opts.forzar }), resueltaEn: null };
  cache.set(userId, entrada);
  entrada.promesa.then((ins) => {
    if (cache.get(userId) !== entrada) return;
    if (completa(ins)) entrada.resueltaEn = Date.now();
    else cache.delete(userId);
  }, () => { if (cache.get(userId) === entrada) cache.delete(userId); });
  return entrada.promesa;
}

/**
 * Relee solo `partes` (Reintentar de un pilar, una practica que se pauso) y
 * deja la cache al dia con lo nuevo encima de lo que ya habia.
 */
export async function releerPartes(userId: string, partes: readonly ParteKey[]): Promise<InsumosPlan> {
  const leido = await leerMiPlan(userId, { partes, forzar: true });
  const hit = cache.get(userId);
  if (hit && hit.resueltaEn !== null) {
    const previa = await hit.promesa;
    const junta = fusionarInsumos(previa, leido);
    if (cache.get(userId) === hit) {
      if (completa(junta)) cache.set(userId, { promesa: Promise.resolve(junta), resueltaEn: hit.resueltaEn });
      else cache.delete(userId);
    }
  }
  return leido;
}
