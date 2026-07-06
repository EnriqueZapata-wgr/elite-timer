/**
 * Electron Service — Otorgar, revocar y consultar electrones.
 *
 * Los electrones booleanos de HOY se persisten en daily_electrons (JSONB).
 * El acumulado detallado va en electron_logs (para rangos).
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { supabase } from '@/src/lib/supabase';
import { ELECTRON_WEIGHTS, type ElectronSource, getRank, getNextRank } from '@/src/constants/electrons';

/**
 * Otorga un electrón booleano del día. Retorna true si el electrón quedó otorgado (nuevo o ya
 * presente). #v13i C: idempotente vía UNIQUE index (migración 101) — dos taps en carrera colisionan
 * en la misma `idempotency_key` determinística (user:source:día) → una sola fila, sin doble-conteo.
 */
export async function awardBooleanElectron(
  userId: string,
  source: ElectronSource,
  opts?: { idempotencyKey?: string },
): Promise<boolean> {
  const today = getLocalToday();
  const cfg = ELECTRON_WEIGHTS[source];
  if (!cfg) return false;

  // Key determinística por (user, source, día). Un idempotencyKey explícito (mismo tap reintentado)
  // también dedupica. Ambos casos colapsan al mismo row vía el UNIQUE index parcial.
  const idemKey = opts?.idempotencyKey ?? `${userId}:${source}:${today}`;

  const { error } = await supabase.from('electron_logs').insert({
    user_id: userId,
    date: today,
    source,
    category: 'boolean_daily',
    electrons: cfg.weight,
    idempotency_key: idemKey,
  });

  if (!error) return true;
  if (error.code === '23505') return true; // ya otorgado hoy → retry idempotente (no error)

  // Fallback defensivo: la columna idempotency_key aún no existe (migración 101 pendiente) →
  // ruta legacy check-then-insert para no romper el award mientras se aplica la migración.
  if (/idempotency_key/i.test(error.message ?? '')) {
    return awardBooleanElectronLegacy(userId, source, cfg.weight, today);
  }
  return false;
}

/** Ruta legacy (pre-migración 101): dedup por (user, source, día) sin idempotency_key. */
async function awardBooleanElectronLegacy(userId: string, source: string, weight: number, today: string): Promise<boolean> {
  const { count } = await supabase
    .from('electron_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('source', source).eq('date', today);
  if ((count ?? 0) > 0) return false;
  const { error } = await supabase.from('electron_logs').insert({
    user_id: userId, date: today, source, category: 'boolean_daily', electrons: weight,
  });
  return !error;
}

/** Revoca un electrón booleano del día (cuando se des-togglea). */
export async function revokeBooleanElectron(userId: string, source: ElectronSource): Promise<void> {
  const today = getLocalToday();
  await supabase
    .from('electron_logs')
    .delete()
    .eq('user_id', userId)
    .eq('source', source)
    .eq('date', today);
}

/** Obtiene el total acumulado de electrones del usuario. */
export async function getTotalElectrons(userId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('electron_logs')
      .select('electrons')
      .eq('user_id', userId);

    return (data ?? []).reduce((sum, row) => sum + Number(row.electrons), 0);
  } catch {
    return 0;
  }
}

/** Electrones ganados hoy. */
export async function getTodayElectronsTotal(userId: string): Promise<number> {
  try {
    const today = getLocalToday();
    const { data } = await supabase
      .from('electron_logs')
      .select('electrons')
      .eq('user_id', userId)
      .eq('date', today);

    return (data ?? []).reduce((sum, row) => sum + Number(row.electrons), 0);
  } catch {
    return 0;
  }
}

/** Info completa de rango para mostrar en UI. */
export async function getUserRankInfo(userId: string) {
  const total = await getTotalElectrons(userId);
  const rank = getRank(total);
  const next = getNextRank(total);
  return {
    total: Math.floor(total),
    rank,
    nextRank: next,
    electronsToNext: next ? next.min - Math.floor(total) : 0,
  };
}
