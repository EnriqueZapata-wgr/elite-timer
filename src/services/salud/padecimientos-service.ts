/**
 * padecimientos-service — I/O de padecimientos + episodios (SALUD F5).
 *
 * Tablas: padecimientos + padecimiento_episodios (migración 173, normalizadas
 * para RECURRENCIA; RLS dueño full + coach lectura). Peso ALTO en el DX: el
 * harvest de dx-engine.ts ya lee name/category/is_chronic/updated_at + conteo
 * de episodios — registrar aquí sube la calidad del DX sin tocar el harvest.
 * CERO fuga clínica: nada de esto toca superficies de comunidad.
 *
 * La lógica pura (validación + vista + orden) vive en padecimientos-core.ts.
 * duration_days es columna GENERADA en Postgres — nunca se escribe.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import {
  buildPadecimientoViews,
  type EpisodioRow,
  type PadecimientoInput,
  type PadecimientoRow,
  type PadecimientoView,
} from './padecimientos-core';

export const PADECIMIENTOS_CHANGED_EVENT = 'padecimientos_changed';

function emitChanged() {
  DeviceEventEmitter.emit(PADECIMIENTOS_CHANGED_EVENT);
}

// ═══ LECTURA ═══

/** Padecimientos del user con episodios, ordenados para la UI (activos primero). */
export async function loadPadecimientos(userId: string): Promise<PadecimientoView[]> {
  const [peds, eps] = await Promise.all([
    supabase
      .from('padecimientos')
      .select('id, user_id, name, category, is_chronic, notes, created_at, updated_at')
      .eq('user_id', userId),
    supabase
      .from('padecimiento_episodios')
      .select('id, padecimiento_id, user_id, started_on, resolved_on, duration_days, severity, treatment, notes, created_at')
      .eq('user_id', userId),
  ]);
  if (peds.error) {
    console.warn('[padecimientos] loadPadecimientos:', peds.error.message);
    return [];
  }
  if (eps.error) console.warn('[padecimientos] loadEpisodios:', eps.error.message);
  return buildPadecimientoViews(
    (peds.data ?? []) as PadecimientoRow[],
    (eps.error ? [] : (eps.data ?? [])) as EpisodioRow[],
  );
}

// ═══ ESCRITURA ═══

/**
 * Registra un padecimiento + su primer episodio (input YA validado por
 * validatePadecimientoInput). resolvedOn null = episodio en curso (activo).
 */
export async function addPadecimiento(
  userId: string,
  input: PadecimientoInput,
): Promise<PadecimientoRow | null> {
  const { data, error } = await supabase
    .from('padecimientos')
    .insert({
      user_id: userId,
      name: input.name,
      category: input.category,
      is_chronic: input.isChronic,
      notes: input.notes,
    })
    .select('id, user_id, name, category, is_chronic, notes, created_at, updated_at')
    .single();
  if (error) {
    console.warn('[padecimientos] addPadecimiento:', error.message);
    return null;
  }
  const ped = data as PadecimientoRow;

  const { error: epErr } = await supabase.from('padecimiento_episodios').insert({
    padecimiento_id: ped.id,
    user_id: userId,
    started_on: input.startedOn,
    resolved_on: input.resolvedOn,
  });
  if (epErr) console.warn('[padecimientos] addPrimerEpisodio:', epErr.message);

  emitChanged();
  return ped;
}

/** Registra una nueva ocurrencia (recurrencia) — inicia hoy, en curso. */
export async function addEpisodio(
  userId: string,
  padecimientoId: string,
  startedOn?: string,
): Promise<boolean> {
  const { error } = await supabase.from('padecimiento_episodios').insert({
    padecimiento_id: padecimientoId,
    user_id: userId,
    started_on: startedOn ?? getLocalToday(),
    resolved_on: null,
  });
  if (error) {
    console.warn('[padecimientos] addEpisodio:', error.message);
    return false;
  }
  // touch updated_at del padre para que el DX detecte cosecha nueva
  await supabase
    .from('padecimientos')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', padecimientoId)
    .eq('user_id', userId);
  emitChanged();
  return true;
}

/** Marca un episodio en curso como resuelto hoy (duration_days lo calcula Postgres). */
export async function resolveEpisodio(userId: string, episodioId: string): Promise<boolean> {
  const { error } = await supabase
    .from('padecimiento_episodios')
    .update({ resolved_on: getLocalToday() })
    .eq('id', episodioId)
    .eq('user_id', userId)
    .is('resolved_on', null);
  if (error) {
    console.warn('[padecimientos] resolveEpisodio:', error.message);
    return false;
  }
  emitChanged();
  return true;
}

/** Borra un padecimiento completo (episodios caen por ON DELETE CASCADE). */
export async function deletePadecimiento(userId: string, padecimientoId: string): Promise<boolean> {
  const { error } = await supabase
    .from('padecimientos')
    .delete()
    .eq('id', padecimientoId)
    .eq('user_id', userId);
  if (error) {
    console.warn('[padecimientos] deletePadecimiento:', error.message);
    return false;
  }
  emitChanged();
  return true;
}
