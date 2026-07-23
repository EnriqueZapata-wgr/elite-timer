/**
 * Electron Service — Otorgar, revocar y consultar electrones.
 *
 * Los electrones booleanos de HOY se persisten en daily_electrons (JSONB).
 * El acumulado detallado va en electron_logs (para rangos).
 */
import { DeviceEventEmitter } from 'react-native';
import { getLocalToday } from '@/src/utils/date-helpers';
import { supabase } from '@/src/lib/supabase';
import { generateUUID } from '@/src/utils/uuid';
import { ELECTRON_WEIGHTS, type ElectronSource, getRank, getNextRank } from '@/src/constants/electrons';
import {
  classifyPracticeAwardError,
  extraPracticeIdempotencyKey,
  type PracticeElectronSource,
} from '@/src/services/practice-electron-core';

/**
 * hotfix-ux FIX 4: tras un award EXITOSO (insert nuevo, NO retry idempotente ni revoke) se emite
 * 'electron_awarded' con { source, electrons } para el toast de atribución ARGOS
 * (src/components/economy/ArgosReactionToast.tsx). Aditivo: no cambia firma ni flujo de retorno,
 * y es independiente del 'electrons_changed' que cada caller ya emite (regla #5 CLAUDE.md).
 */
export const ELECTRON_AWARDED_EVENT = 'electron_awarded';

function emitAwarded(source: string, electrons: number): void {
  try {
    DeviceEventEmitter.emit(ELECTRON_AWARDED_EVENT, { source, electrons });
  } catch {
    // fail-soft: el toast es cosmético, jamás debe romper el award
  }
}

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

  if (!error) {
    emitAwarded(source, cfg.weight); // FIX 4: solo en insert NUEVO (el retry 23505 no toastea)
    return true;
  }
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
  if (!error) emitAwarded(source, weight); // FIX 4: mismo toast en la ruta legacy
  return !error;
}

// ── Prácticas (meditación/respiración): hasta 3 e-/día con espaciado 3h ─────

export type PracticeAwardStatus = 'awarded_first' | 'awarded_extra' | 'cap_reached' | 'spacing' | 'error';

/**
 * Delta economía 2026-07-23: meditación y breathwork dejan la regla once/día y
 * pasan a cap 3/día + ≥3h entre awards, ENFORCEADO server-side por el trigger
 * de la migración 213 (el cliente solo clasifica el rechazo y falla-suave).
 *
 * El 1º award del día usa la key determinística `user:source:día` — es el que
 * marca la card de HOY / racha / atribución ARGOS (idéntico a antes). Los
 * awards 2º/3º entran por la misma vía con key+nonce sin re-marcar el hábito
 * (la card ya deriva su `completed` de la existencia del 1º log).
 */
export async function awardPracticeElectron(
  userId: string,
  source: PracticeElectronSource,
): Promise<PracticeAwardStatus> {
  const today = getLocalToday();
  const cfg = ELECTRON_WEIGHTS[source];
  if (!cfg) return 'error';

  const insertRow = (idemKey: string) =>
    supabase.from('electron_logs').insert({
      user_id: userId,
      date: today,
      source,
      category: 'boolean_daily',
      electrons: cfg.weight,
      idempotency_key: idemKey,
    });

  // 1º intento: key determinística del día (misma fila que marca HOY).
  const first = await insertRow(`${userId}:${source}:${today}`);
  if (!first.error) {
    emitAwarded(source, cfg.weight);
    return 'awarded_first';
  }
  const firstRejection = classifyPracticeAwardError(first.error.message);
  if (firstRejection) return firstRejection;
  if (/idempotency_key/i.test(first.error.message ?? '')) {
    // Columna aún sin migración 101 → ruta legacy once/día (sin extras).
    const ok = await awardBooleanElectronLegacy(userId, source, cfg.weight, today);
    return ok ? 'awarded_first' : 'error';
  }
  if (first.error.code !== '23505') return 'error';

  // Ya existe el award del día → intentar 2º/3º con nonce. El doble-tap no
  // necesita idempotencia propia: el espaciado de 3h del trigger lo dedupica.
  const extra = await insertRow(extraPracticeIdempotencyKey(userId, source, today, generateUUID().slice(0, 8)));
  if (!extra.error) {
    emitAwarded(source, cfg.weight);
    return 'awarded_extra';
  }
  return classifyPracticeAwardError(extra.error.message) ?? 'error';
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
