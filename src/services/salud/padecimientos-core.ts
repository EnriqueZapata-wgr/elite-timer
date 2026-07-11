/**
 * padecimientos-core — lógica PURA de padecimientos + episodios (SALUD F5).
 * Sin react-native/supabase → testeable con Vitest node-only.
 *
 * Modela el shape real de la migración 173 (2 tablas normalizadas para
 * RECURRENCIA): padecimientos = definición de la condición;
 * padecimiento_episodios = cada ocurrencia (started_on / resolved_on DATE,
 * resolved_on NULL = en curso; duration_days es columna GENERADA en Postgres —
 * NUNCA se inserta desde el cliente).
 *
 * El I/O vive en padecimientos-service.ts.
 */

// ── Shapes (migración 173) ───────────────────────────────────────────────────

export const PADECIMIENTO_CATEGORIES = [
  'infeccioso', 'autoinmune', 'metabolico', 'cardiovascular', 'respiratorio',
  'digestivo', 'hormonal', 'oncologico', 'neurologico', 'musculoesqueletico',
  'dermatologico', 'mental', 'otro',
] as const;

export type PadecimientoCategory = (typeof PADECIMIENTO_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<PadecimientoCategory, string> = {
  infeccioso: 'Infeccioso',
  autoinmune: 'Autoinmune',
  metabolico: 'Metabólico',
  cardiovascular: 'Cardiovascular',
  respiratorio: 'Respiratorio',
  digestivo: 'Digestivo',
  hormonal: 'Hormonal',
  oncologico: 'Oncológico',
  neurologico: 'Neurológico',
  musculoesqueletico: 'Musculoesquelético',
  dermatologico: 'Dermatológico',
  mental: 'Salud mental',
  otro: 'Otro',
};

export interface PadecimientoRow {
  id: string;
  user_id: string;
  name: string;
  category: PadecimientoCategory;
  is_chronic: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EpisodioRow {
  id: string;
  padecimiento_id: string;
  user_id: string;
  started_on: string;          // DATE YYYY-MM-DD
  resolved_on: string | null;  // NULL = en curso
  duration_days: number | null; // GENERADA en Postgres (solo lectura)
  severity: number | null;
  treatment: string | null;
  notes: string | null;
  created_at: string;
}

// ── Validación del formulario ligero ─────────────────────────────────────────

export const PADECIMIENTO_NAME_MAX_LEN = 80;
export const PADECIMIENTO_NOTES_MAX_LEN = 500;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD bien formado y calendario-válido (rechaza 2026-02-31). */
export function isValidDateStr(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export interface PadecimientoInput {
  name: string;
  category: PadecimientoCategory;
  isChronic: boolean;
  startedOn: string;
  /** null = sigue activo (episodio en curso). */
  resolvedOn: string | null;
  notes: string | null;
}

/**
 * Valida el formulario ligero. `today` (getLocalToday) se inyecta para
 * mantener la función pura. Reglas espejo de los CHECK de la migración 173:
 * fechas no futuras y resolved_on >= started_on (episodio_dates_ordered).
 */
export function validatePadecimientoInput(
  raw: {
    name: string;
    category: string;
    isChronic: boolean;
    startedOn: string;
    isResolved: boolean;
    resolvedOn?: string | null;
    notes?: string | null;
  },
  today: string,
): { ok: true; value: PadecimientoInput } | { ok: false; error: string } {
  const name = (raw.name ?? '').replace(/\s+/g, ' ').trim().slice(0, PADECIMIENTO_NAME_MAX_LEN);
  if (!name) return { ok: false, error: 'Ponle nombre al padecimiento (ej. gripe, gastritis).' };

  if (!(PADECIMIENTO_CATEGORIES as readonly string[]).includes(raw.category)) {
    return { ok: false, error: 'Elige una categoría válida.' };
  }

  const startedOn = (raw.startedOn ?? '').trim();
  if (!isValidDateStr(startedOn)) {
    return { ok: false, error: 'La fecha de inicio debe ser AAAA-MM-DD (ej. 2026-05-14).' };
  }
  if (startedOn > today) return { ok: false, error: 'La fecha de inicio no puede ser futura.' };

  let resolvedOn: string | null = null;
  if (raw.isResolved) {
    resolvedOn = (raw.resolvedOn ?? '').trim() || today;
    if (!isValidDateStr(resolvedOn)) {
      return { ok: false, error: 'La fecha de resolución debe ser AAAA-MM-DD.' };
    }
    if (resolvedOn > today) return { ok: false, error: 'La fecha de resolución no puede ser futura.' };
    if (resolvedOn < startedOn) {
      return { ok: false, error: 'La resolución no puede ser antes del inicio.' };
    }
  }

  const notes = (raw.notes ?? '').trim().slice(0, PADECIMIENTO_NOTES_MAX_LEN) || null;

  return {
    ok: true,
    value: {
      name,
      category: raw.category as PadecimientoCategory,
      isChronic: raw.isChronic,
      startedOn,
      resolvedOn,
      notes,
    },
  };
}

// ── Vista: padecimiento + episodios ──────────────────────────────────────────

export interface PadecimientoView {
  padecimiento: PadecimientoRow;
  /** Episodios más recientes primero (por started_on desc). */
  episodios: EpisodioRow[];
  /** true si algún episodio sigue en curso (resolved_on NULL). */
  isActive: boolean;
  /** started_on del episodio más reciente (null si no hay episodios). */
  lastStartedOn: string | null;
}

/**
 * Une padecimientos con sus episodios y ordena para la UI:
 * activos primero, luego por episodio más reciente (desc), luego por nombre.
 */
export function buildPadecimientoViews(
  padecimientos: PadecimientoRow[],
  episodios: EpisodioRow[],
): PadecimientoView[] {
  const byPed = new Map<string, EpisodioRow[]>();
  for (const ep of episodios) {
    const list = byPed.get(ep.padecimiento_id);
    if (list) list.push(ep);
    else byPed.set(ep.padecimiento_id, [ep]);
  }

  const views: PadecimientoView[] = padecimientos.map((p) => {
    const eps = [...(byPed.get(p.id) ?? [])].sort((a, b) => b.started_on.localeCompare(a.started_on));
    return {
      padecimiento: p,
      episodios: eps,
      isActive: eps.some((e) => e.resolved_on === null),
      lastStartedOn: eps[0]?.started_on ?? null,
    };
  });

  views.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const dateCmp = (b.lastStartedOn ?? '').localeCompare(a.lastStartedOn ?? '');
    if (dateCmp !== 0) return dateCmp;
    return a.padecimiento.name.localeCompare(b.padecimiento.name, 'es');
  });
  return views;
}

/** Copy corto del estado de un episodio para la UI. */
export function episodioStatusLabel(ep: Pick<EpisodioRow, 'resolved_on' | 'duration_days'>): string {
  if (ep.resolved_on === null) return 'En curso';
  if (ep.duration_days == null) return 'Resuelto';
  if (ep.duration_days <= 0) return 'Resuelto · mismo día';
  return `Resuelto · ${ep.duration_days} ${ep.duration_days === 1 ? 'día' : 'días'}`;
}
