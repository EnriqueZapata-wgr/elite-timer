/**
 * dx-service — lecturas de "Mi Mapa Funcional" para la UI (Card A).
 *
 * PREMIUM (16-ago-2026): se fue el precio en H+. Generar el mapa venía
 * costando 1,000 H+ y el primero era "de regalo"; con membresía única no hay
 * nada que regalar porque no hay nada que cobrar. Solo quedan lecturas.
 */
import { supabase } from '@/src/lib/supabase';
import type { DxRoot } from './dx-engine-core';

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
  hasCurrentDX: boolean;
}

/** Estado para el botón "Actualizar mi Mapa Funcional". Sin precio: va incluido. */
export async function getDXQuote(userId: string): Promise<DxQuote> {
  const current = await getCurrentDX(userId);
  return { hasCurrentDX: current !== null };
}
