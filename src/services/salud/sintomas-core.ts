/**
 * sintomas-core — lógica PURA de síntomas aislados (SALUD F5).
 * Sin react-native/supabase → testeable con Vitest node-only.
 *
 * Aquí vive lo determinístico: validación/normalización del input del quick-tap
 * y la agrupación por día local del timeline. El I/O vive en sintomas-service.ts.
 *
 * Shape real: clinical_symptoms_aislados (migración 174) —
 *   id · user_id · tag TEXT NOT NULL · severity SMALLINT 1-5 (opcional) ·
 *   note TEXT · logged_at TIMESTAMPTZ.
 */
import { SINTOMA_TAG_MAX_LEN, SINTOMA_NOTE_MAX_LEN } from '@/src/constants/sintomas-catalog';

export interface SintomaAisladoRow {
  id: string;
  user_id: string;
  tag: string;
  severity: number | null;
  note: string | null;
  logged_at: string; // TIMESTAMPTZ ISO
}

// ── Validación / normalización del input ─────────────────────────────────────

/** Trim + colapsa espacios internos. Devuelve '' si no queda nada. */
export function normalizeTag(raw: string): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, SINTOMA_TAG_MAX_LEN);
}

/** Nota opcional: trim; null si queda vacía. */
export function normalizeNote(raw: string | null | undefined): string | null {
  const t = (raw ?? '').trim().slice(0, SINTOMA_NOTE_MAX_LEN);
  return t.length > 0 ? t : null;
}

/** Severidad OPCIONAL (CHECK 1-5 en la tabla): null pasa, fuera de rango no. */
export function isValidSeverity(sev: number | null | undefined): boolean {
  if (sev == null) return true;
  return Number.isInteger(sev) && sev >= 1 && sev <= 5;
}

export interface SintomaInput {
  tag: string;
  severity: number | null;
  note: string | null;
}

/**
 * Valida y normaliza el input del quick-tap. Devuelve el input listo para
 * insertar o un error legible (copy es-MX para la UI).
 */
export function validateSintomaInput(
  rawTag: string,
  severity: number | null | undefined,
  rawNote?: string | null,
): { ok: true; value: SintomaInput } | { ok: false; error: string } {
  const tag = normalizeTag(rawTag);
  if (!tag) return { ok: false, error: 'Escribe o elige un síntoma.' };
  if (!isValidSeverity(severity)) return { ok: false, error: 'La severidad debe ser de 1 a 5.' };
  return {
    ok: true,
    value: { tag, severity: severity ?? null, note: normalizeNote(rawNote) },
  };
}

// ── Timeline: agrupación por día local ───────────────────────────────────────

export interface SintomasDayGroup {
  /** YYYY-MM-DD en zona LOCAL del dispositivo. */
  day: string;
  items: SintomaAisladoRow[];
}

/** YYYY-MM-DD local para un timestamp ISO (espeja toLocalDateString). */
export function localDayOf(loggedAt: string): string {
  const d = new Date(loggedAt);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Agrupa el timeline por día local: días más recientes primero, y dentro de
 * cada día los registros más recientes arriba. Tolerante a input desordenado.
 */
export function groupSintomasByDay(rows: SintomaAisladoRow[]): SintomasDayGroup[] {
  const byDay = new Map<string, SintomaAisladoRow[]>();
  for (const row of rows) {
    const day = localDayOf(row.logged_at);
    const list = byDay.get(day);
    if (list) list.push(row);
    else byDay.set(day, [row]);
  }
  const groups: SintomasDayGroup[] = [...byDay.entries()].map(([day, items]) => ({
    day,
    items: [...items].sort((a, b) => b.logged_at.localeCompare(a.logged_at)),
  }));
  groups.sort((a, b) => b.day.localeCompare(a.day));
  return groups;
}

/**
 * Etiqueta del header de día: "Hoy" / "Ayer" / fecha. `today` y `yesterday`
 * se inyectan (YYYY-MM-DD locales) para mantener la función pura y testeable.
 */
export function dayLabel(day: string, today: string, yesterday: string): 'hoy' | 'ayer' | 'fecha' {
  if (day === today) return 'hoy';
  if (day === yesterday) return 'ayer';
  return 'fecha';
}
