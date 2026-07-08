/**
 * Lógica pura de tiers y boosts — sin imports de RN/Supabase para
 * que sea testeable en vitest (environment: node).
 *
 * Fuentes de verdad del tier:
 *  - profiles.tier (Supabase, lo escribe el webhook RevenueCat de Cowork)
 *  - entitlements activos del SDK RevenueCat (tiempo real en el device)
 * Se toma el MAYOR de ambos para cubrir lag del webhook en ambas direcciones.
 */

export type Tier = 'free' | 'base' | 'pro' | 'clinician';

export interface BoostStatus {
  active: boolean;
  expiresAt: Date | null;
}

/** Entitlement ids configurados en el dashboard RevenueCat */
export const ENTITLEMENT_TIER_MAP: Record<string, Tier> = {
  atp_base: 'base',
  atp_pro: 'pro',
  atp_clinician: 'clinician',
};

const TIER_RANK: Record<Tier, number> = { free: 0, base: 1, pro: 2, clinician: 3 };

/** Tier más alto implicado por los entitlements activos del SDK. */
export function tierFromEntitlements(activeEntitlementIds: string[]): Tier {
  let best: Tier = 'free';
  for (const id of activeEntitlementIds) {
    const tier = ENTITLEMENT_TIER_MAP[id];
    if (tier && TIER_RANK[tier] > TIER_RANK[best]) best = tier;
  }
  return best;
}

/** Tier según profiles.tier, degradado a free si tier_expires_at ya pasó. */
export function tierFromProfile(
  tier: string | null | undefined,
  tierExpiresAt: string | null | undefined,
  now: Date = new Date(),
): Tier {
  const valid: Tier[] = ['free', 'base', 'pro', 'clinician'];
  const t = valid.includes(tier as Tier) ? (tier as Tier) : 'free';
  if (t !== 'free' && tierExpiresAt && new Date(tierExpiresAt).getTime() <= now.getTime()) {
    return 'free';
  }
  return t;
}

export function highestTier(a: Tier, b: Tier): Tier {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

/** El boost H+ eleva a 'pro' cualquier tier inferior mientras está activo. */
export function resolveEffectiveTier(tier: Tier, boostActive: boolean): Tier {
  if (boostActive && TIER_RANK[tier] < TIER_RANK.pro) return 'pro';
  return tier;
}

/** Semántica "al menos": isTierAtLeast('clinician', 'pro') === true */
export function isTierAtLeast(tier: Tier, min: Tier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[min];
}

/** Row de pro_boosts (o null) → BoostStatus. */
export function boostStatusFromRow(
  row: { expires_at: string } | null | undefined,
  now: Date = new Date(),
): BoostStatus {
  if (!row?.expires_at) return { active: false, expiresAt: null };
  const expiresAt = new Date(row.expires_at);
  if (expiresAt.getTime() <= now.getTime()) return { active: false, expiresAt: null };
  return { active: true, expiresAt };
}

/** "23h 15m" / "45m" / "<1m" — countdown editorial del boost. */
export function formatBoostRemaining(expiresAt: Date, now: Date = new Date()): string {
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return '<1m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
