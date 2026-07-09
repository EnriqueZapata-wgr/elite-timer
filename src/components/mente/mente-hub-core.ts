/**
 * MENTE hub — lógica pura (T1 Sprint MENTE Ecosystem).
 *
 * Merge/formateo de la actividad reciente cross-MENTE (mind_sessions +
 * journal + check-ins) para el timeline "Últimas sesiones". Sin imports de
 * RN/supabase — testeable en el harness node.
 */

export type MenteActivityKind = 'breathing' | 'meditation' | 'checkin' | 'journal';

export interface MenteActivity {
  kind: MenteActivityKind;
  /** Nombre a mostrar (template o tipo). */
  label: string;
  /** ISO timestamp del evento. */
  at: string;
  durationSeconds?: number;
}

export const ACTIVITY_META: Record<MenteActivityKind, { label: string; icon: string }> = {
  breathing: { label: 'Respiración', icon: 'leaf-outline' },
  meditation: { label: 'Meditación', icon: 'sparkles-outline' },
  checkin: { label: 'Check-in', icon: 'heart-outline' },
  journal: { label: 'Journal', icon: 'journal-outline' },
};

/** Mezcla fuentes de actividad y devuelve las `limit` más recientes. */
export function mergeRecentActivity(items: MenteActivity[], limit = 10): MenteActivity[] {
  return [...items]
    .filter((i) => Number.isFinite(new Date(i.at).getTime()))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

/** "Hace 2h" / "Ayer" / "Hace 5 días" / fecha corta. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diffH = Math.floor((now.getTime() - t) / 3_600_000);
  if (diffH < 1) return 'Hace poco';
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Ayer';
  if (diffD < 7) return `Hace ${diffD} días`;
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

/** "12 min" / "45 s" / '' sin dato. */
export function formatDuration(seconds?: number): string {
  if (!Number.isFinite(seconds) || seconds == null || seconds <= 0) return '';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  return `${Math.round(seconds / 60)} min`;
}

/**
 * Subtítulo dinámico de una card del hub: "última sesión hace X" o el
 * fallback editorial si nunca ha habido actividad.
 */
export function lastActivitySubtitle(prefix: string, lastAt: string | null, now: Date = new Date()): string {
  if (!lastAt) return prefix;
  return `${prefix} · ${formatRelativeTime(lastAt, now).toLowerCase()}`;
}
