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
import { dosisDesdeScan, normalizeForm } from './supplements/adherencia-core';

export interface ScanFicha {
  name: string;
  dosage?: string | null;
  form?: string | null;
  brand?: string | null;
  /** 312 (10.2): porcion que declara la etiqueta ("1 capsula"). */
  scanServing?: string | null;
  /** 312 (10.2): activos por porcion leidos de la etiqueta [{name, amount}]. */
  scanActives?: { name: string; amount?: string | null }[] | null;
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

    // 312 (10.2): lo que la etiqueta dijo por porcion viaja a la ficha tal
    // cual. Solo con UN activo legible se llena la dosis por unidad; con
    // varios se guarda la lista y la persona decide (nada se inventa).
    const actives = Array.isArray(ficha.scanActives)
      ? ficha.scanActives
        .filter((a) => a && typeof a.name === 'string' && a.name.trim())
        .map((a) => ({ name: a.name.trim().slice(0, 80), amount: a.amount ? String(a.amount).trim().slice(0, 40) : null }))
        .slice(0, 30)
      : [];
    // G1 (revision 4EP): `amount` del escaneo es POR PORCION. Solo pasa a
    // amount_per_unit si la porcion es exactamente 1 unidad; con "2 capsulas"
    // la ficha pintaria el doble del frasco. Si no, solo la linea "Etiqueta".
    const scanServing = ficha.scanServing?.trim().slice(0, 60) || null;
    const dosisUnidad = dosisDesdeScan(actives, scanServing);
    const base = {
      user_id: userId,
      name: ficha.name.trim().slice(0, 120),
      dosage: (ficha.dosage?.trim() || 'Según etiqueta').slice(0, 120),
      // 312: "cápsula" del escaneo se guarda como 'capsula' (id de FORM_OPTIONS);
      // una presentacion desconocida conserva su texto.
      form: ficha.form ? (normalizeForm(ficha.form) ?? String(ficha.form).slice(0, 40)) : null,
      brand: ficha.brand?.trim() || null,
      timing: 'morning',
      source: 'scan',
      ...(score && !score.illegible
        ? { functional_score: score.score, bha_scan_summary: buildScoreSummaryText(score) }
        : {}),
    };
    const extra312 = {
      scan_serving: scanServing,
      scan_actives: actives.length ? actives : null,
      ...(dosisUnidad ? { amount_per_unit: dosisUnidad.amount, amount_unit: dosisUnidad.unit } : {}),
    };
    let { data: inserted, error: insErr } = await supabase
      .from('user_supplements')
      .insert({ ...base, ...extra312 })
      .select('id')
      .single();
    // 312: cliente que corre antes del db push (PGRST204, columna desconocida):
    // se reintenta sin los campos nuevos antes que dejar la ficha sin crear.
    if (insErr && /PGRST204|schema cache/i.test(insErr.message)) {
      ({ data: inserted, error: insErr } = await supabase
        .from('user_supplements')
        .insert(base)
        .select('id')
        .single());
    }
    if (insErr) return { status: 'error', message: insErr.message };
    return { status: 'created', id: (inserted as { id: string }).id };
  } catch (e: any) {
    return { status: 'error', message: String(e?.message ?? e) };
  }
}
