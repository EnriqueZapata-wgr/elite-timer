/**
 * MENTE streaks + medallas — lógica pura (T5 Sprint MENTE Ecosystem).
 *
 * La racha por categoría se calcula con computeJournalStreak (journal-logic,
 * genérica sobre fechas YYYY-MM-DD, ancla hoy/ayer). Aquí vive el mapeo
 * racha → medallas y el copy editorial.
 */

export type MenteCategory = 'journal' | 'breathing' | 'meditation' | 'checkin';
export type MedalTier = '7d' | '30d' | '90d' | '365d';

export const MENTE_CATEGORIES: readonly MenteCategory[] = [
  'journal', 'breathing', 'meditation', 'checkin',
] as const;

export const MEDAL_TIERS: readonly { tier: MedalTier; days: number; label: string }[] = [
  { tier: '7d', days: 7, label: '1 semana' },
  { tier: '30d', days: 30, label: '1 mes' },
  { tier: '90d', days: 90, label: '3 meses' },
  { tier: '365d', days: 365, label: '1 año' },
] as const;

export const CATEGORY_COPY: Record<MenteCategory, { label: string; icon: string; motivation: string }> = {
  journal: {
    label: 'Journal', icon: 'journal-outline',
    motivation: 'Lo que se escribe, se entiende.',
  },
  breathing: {
    label: 'Respiración', icon: 'leaf-outline',
    motivation: 'Tu sistema nervioso se entrena una respiración a la vez.',
  },
  meditation: {
    label: 'Meditación', icon: 'sparkles-outline',
    motivation: 'Parar también es entrenar.',
  },
  checkin: {
    label: 'Check-in', icon: 'heart-outline',
    motivation: 'Escucharte a diario es el hábito raíz.',
  },
};

/** Medallas que corresponden a una racha (todas las alcanzadas). */
export function medalTiersForStreak(streakDays: number): MedalTier[] {
  return MEDAL_TIERS.filter((m) => streakDays >= m.days).map((m) => m.tier);
}

/** Próxima medalla a alcanzar (null si ya tiene la de 365d). */
export function nextMedalTarget(streakDays: number): { tier: MedalTier; days: number; remaining: number } | null {
  const next = MEDAL_TIERS.find((m) => streakDays < m.days);
  if (!next) return null;
  return { tier: next.tier, days: next.days, remaining: next.days - streakDays };
}

/**
 * Diferencia entre lo que la racha justifica y lo ya persistido — lo que hay
 * que insertar en mente_medals. Determinista y puro (el service hace el I/O).
 */
export function medalsToAward(
  category: MenteCategory,
  streakDays: number,
  alreadyAwarded: MedalTier[],
): { category: MenteCategory; tier: MedalTier }[] {
  const owned = new Set(alreadyAwarded);
  return medalTiersForStreak(streakDays)
    .filter((tier) => !owned.has(tier))
    .map((tier) => ({ category, tier }));
}

/** Copy del contador de racha (editorial, sin cursilería). */
export function streakCopy(streakDays: number): string {
  if (streakDays <= 0) return 'Empieza hoy';
  if (streakDays === 1) return '1 día — el primero cuenta doble';
  return `${streakDays} días seguidos`;
}
