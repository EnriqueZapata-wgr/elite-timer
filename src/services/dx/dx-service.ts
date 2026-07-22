/**
 * dx-service — lecturas de "Mi Diagnóstico Funcional" para la UI (Card A).
 * Sólo I/O de lectura + quote de precio H+ (patrón getBravermanPremiumQuote).
 */
import { supabase } from '@/src/lib/supabase';
import { getActionCost, getProtonBalance } from '@/src/services/economy/proton-service';
import { DX_GENERATION_ACTION_KEY } from './dx-engine';
import { applyFirstFreeQuote, type DxRoot } from './dx-engine-core';

export interface FunctionalDxRow {
  id: string;
  version: number;
  quality_level: number;
  roots_detected: DxRoot[];
  summary_text: string | null;
  sources_snapshot: Record<string, unknown>;
  generated_by: string;
  model: string | null;
  is_current: boolean;
  created_at: string;
}

/** Versión vigente del DX (null si el usuario nunca ha generado uno). */
export async function getCurrentDX(userId: string): Promise<FunctionalDxRow | null> {
  const { data } = await supabase
    .from('functional_dx')
    .select('id, version, quality_level, roots_detected, summary_text, sources_snapshot, generated_by, model, is_current, created_at')
    .eq('user_id', userId)
    .eq('is_current', true)
    .maybeSingle();
  return (data as FunctionalDxRow) ?? null;
}

/** Timeline de versiones (más reciente primero). */
export async function getDXHistory(userId: string, limit = 20): Promise<FunctionalDxRow[]> {
  const { data } = await supabase
    .from('functional_dx')
    .select('id, version, quality_level, roots_detected, summary_text, sources_snapshot, generated_by, model, is_current, created_at')
    .eq('user_id', userId)
    .order('version', { ascending: false })
    .limit(limit);
  return (data as FunctionalDxRow[]) ?? [];
}

export interface DxQuote {
  cost: number;
  /** null = balance aún no disponible (cold start). */
  balance: number | null;
  hasCurrentDX: boolean;
  /**
   * DX F4: el user nunca ha generado un functional_dx → su primera generación
   * es GRATIS (la UI muestra "Tu primer mapa funcional es un regalo").
   */
  isFirstFree: boolean;
}

/** Precio H+ + balance para el botón "Actualizar mi Mapa Funcional" (usuarios Base). */
export async function getDXQuote(userId: string): Promise<DxQuote> {
  const [cost, balanceRow, current, history] = await Promise.all([
    getActionCost(DX_GENERATION_ACTION_KEY),
    getProtonBalance(userId).catch(() => null),
    getCurrentDX(userId),
    // Append-only: cualquier fila (vigente o no) = ya generó alguna vez.
    getDXHistory(userId, 1).catch(() => []),
  ]);
  const firstFree = applyFirstFreeQuote(cost, history.length > 0);
  return {
    cost: firstFree.cost,
    balance: balanceRow ? balanceRow.current_protons : null,
    hasCurrentDX: current !== null,
    isFirstFree: firstFree.isFirstFree,
  };
}
