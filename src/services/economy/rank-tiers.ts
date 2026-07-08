/**
 * Rangos v2 (#100, marathon F4) — nombres confirmados por Enrique.
 * Capa de NOMBRES sobre lifetime electrons. La curva numérica 1-99
 * (rank.ts / RPC economy_rank_from_lifetime en 093) NO se toca: el
 * tier v2 se calcula client-side desde lifetime_electrons → sin migración.
 *
 * Easter eggs: 'Brian Johnson' (10K+) visible solo al llegar a Inmortal;
 * 'God' (25K+) secreto — jamás se anuncia como "siguiente".
 */

export interface RankTier {
  key: string;
  name: string;
  emoji: string;
  /** lifetime electrons mínimo para el tier */
  min: number;
  /** easter egg: no aparece en listas normales, sí como "siguiente" del tier previo */
  easterEgg?: boolean;
  /** secreto: NUNCA se muestra hasta alcanzarlo */
  secret?: boolean;
}

export const RANK_TIERS_V2: RankTier[] = [
  { key: 'explorer', name: 'Explorer', emoji: '🧭', min: 0 },
  { key: 'biohacker', name: 'Biohacker', emoji: '🧬', min: 50 },
  { key: 'optimizer', name: 'Optimizer', emoji: '⚙️', min: 200 },
  { key: 'longevo', name: 'Longevo', emoji: '🌳', min: 500 },
  { key: 'master', name: 'Master', emoji: '🥇', min: 1000 },
  { key: 'legend', name: 'Legend', emoji: '🏛️', min: 2500 },
  { key: 'inmortal', name: 'Inmortal', emoji: '♾️', min: 5000 },
  { key: 'brian_johnson', name: 'Brian Johnson', emoji: '🫀', min: 10000, easterEgg: true },
  { key: 'god', name: 'God', emoji: '⚡', min: 25000, secret: true },
];

/** Tier actual según electrones ganados históricamente. */
export function tierFromLifetime(lifetimeElectrons: number): RankTier {
  const lt = Math.max(0, Math.floor(lifetimeElectrons || 0));
  let current = RANK_TIERS_V2[0];
  for (const tier of RANK_TIERS_V2) {
    if (lt >= tier.min) current = tier;
  }
  return current;
}

export interface NextTierInfo {
  /** null = no hay siguiente mostrable (techo o secreto) */
  next: RankTier | null;
  remaining: number;
}

/**
 * Siguiente tier MOSTRABLE. Los secretos (God) nunca se anuncian;
 * el easter egg (Brian Johnson) solo se revela como meta desde Inmortal.
 */
export function nextTierInfo(lifetimeElectrons: number): NextTierInfo {
  const lt = Math.max(0, Math.floor(lifetimeElectrons || 0));
  const current = tierFromLifetime(lt);
  const idx = RANK_TIERS_V2.findIndex((t) => t.key === current.key);
  for (let i = idx + 1; i < RANK_TIERS_V2.length; i++) {
    const candidate = RANK_TIERS_V2[i];
    if (candidate.secret) return { next: null, remaining: 0 };
    if (candidate.easterEgg && current.key !== 'inmortal') return { next: null, remaining: 0 };
    return { next: candidate, remaining: candidate.min - lt };
  }
  return { next: null, remaining: 0 };
}

/**
 * "Eres Longevo · faltan 234 E- para Master" — comparación del wallet.
 * En Brian Johnson tease sin revelar God; en God, el trono.
 */
export function tierComparisonLabel(lifetimeElectrons: number): string {
  const current = tierFromLifetime(lifetimeElectrons);
  if (current.key === 'god') return 'Eres God. No hay más techo.';
  if (current.key === 'brian_johnson') return 'Eres Brian Johnson. ¿Techo? Quién sabe…';
  const { next, remaining } = nextTierInfo(lifetimeElectrons);
  if (!next) return `Eres ${current.name}.`;
  return `Eres ${current.name} · faltan ${remaining} E- para ${next.name}`;
}

/** Índice del tier (para detectar subida vs AsyncStorage). */
export function tierIndex(key: string): number {
  return RANK_TIERS_V2.findIndex((t) => t.key === key);
}
