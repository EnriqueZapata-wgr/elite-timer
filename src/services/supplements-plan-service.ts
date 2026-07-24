/**
 * Plan de suplementos — I/O (MB-2: unificación de las 2 puertas de scan).
 *
 * `addSupplementToPlan` es la ÚNICA vía de alta desde un scan (BhaScanSheet
 * standalone y food-scan modo suplemento): dedupea por nombre normalizado
 * contra las fichas activas y, si viene score, lo persiste en la ficha nueva
 * de una (evalúa + agrega en un solo flujo — costura #1 del brief MB-2).
 *
 * Doctrina intacta: registro, no recomendación — esto solo registra lo que el
 * usuario ya escaneó; no sugiere nada.
 */
import { supabase } from '@/src/lib/supabase';
import { buildScoreSummaryText, type FunctionalScoreResult } from './bha-core';
import { findSupplementByName } from './supplements-plan-core';

export interface ScanFicha {
  name: string;
  dosage?: string | null;
  form?: string | null;
  brand?: string | null;
}

export type AddToPlanOutcome =
  | { status: 'created'; id: string }
  | { status: 'duplicate'; existingId: string; existingName: string }
  | { status: 'error'; message?: string };

/**
 * Crea la ficha en user_supplements desde un scan, con dedupe por nombre.
 * No sobreescribe la ficha existente — el caller decide qué ofrecer
 * (p.ej. actualizar el score del duplicado vía persistFunctionalScore).
 */
export async function addSupplementToPlan(
  userId: string,
  ficha: ScanFicha,
  score?: FunctionalScoreResult | null,
): Promise<AddToPlanOutcome> {
  try {
    const { data: existing, error: selErr } = await supabase
      .from('user_supplements')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (selErr) return { status: 'error', message: selErr.message };

    const dupe = findSupplementByName(ficha.name, (existing ?? []) as { id: string; name: string }[]);
    if (dupe) return { status: 'duplicate', existingId: dupe.id, existingName: dupe.name };

    const { data: inserted, error: insErr } = await supabase
      .from('user_supplements')
      .insert({
        user_id: userId,
        name: ficha.name.trim().slice(0, 120),
        dosage: (ficha.dosage?.trim() || 'Según etiqueta').slice(0, 120),
        form: ficha.form ? String(ficha.form).slice(0, 40) : null,
        brand: ficha.brand?.trim() || null,
        timing: 'morning',
        source: 'scan',
        ...(score && !score.illegible
          ? { functional_score: score.score, bha_scan_summary: buildScoreSummaryText(score) }
          : {}),
      })
      .select('id')
      .single();
    if (insErr) return { status: 'error', message: insErr.message };
    return { status: 'created', id: (inserted as { id: string }).id };
  } catch (e: any) {
    return { status: 'error', message: String(e?.message ?? e) };
  }
}
