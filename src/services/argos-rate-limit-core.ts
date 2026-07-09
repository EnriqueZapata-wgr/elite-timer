/**
 * Rate limit ARGOS — lógica pura del cliente (T5 MAGIA ARGOS 2.0).
 *
 * El proxy marca `_rate_limited: true` y (desde MAGIA 2.0) adjunta un objeto
 * `rate_limit` con tier, uso, reset y boost_option. Aquí se parsea de forma
 * defensiva (payloads viejos sin `rate_limit` siguen produciendo info útil)
 * y se derivan los textos del RateLimitCard.
 */

export interface RateLimitBoostOption {
  costHPlus: number;
  durationHours: number;
}

export interface RateLimitInfo {
  tier: string;
  limitDaily: number;
  usedToday: number;
  /** ISO — momento del reset (medianoche UTC). null si el server no lo mandó. */
  resetsAt: string | null;
  /** null cuando el tier no puede boostear (pro/clinician). */
  boostOption: RateLimitBoostOption | null;
}

/**
 * Extrae la info de rate limit de la respuesta del proxy.
 * Devuelve null si la respuesta NO es un rate limit.
 */
export function parseRateLimitInfo(data: unknown): RateLimitInfo | null {
  const d = data as Record<string, any> | null | undefined;
  if (!d || d._rate_limited !== true) return null;

  const rl = (d.rate_limit ?? {}) as Record<string, any>;
  const tier = typeof rl.tier === 'string' ? rl.tier : (typeof d._tier === 'string' ? d._tier : 'free');
  const limitDaily = Number.isFinite(rl.limit_daily) ? rl.limit_daily : (Number.isFinite(d._limit) ? d._limit : 0);
  const usedToday = Number.isFinite(rl.used_today) ? rl.used_today : limitDaily;

  let boostOption: RateLimitBoostOption | null = null;
  const bo = rl.boost_option;
  if (bo && Number.isFinite(bo.cost_h_plus) && Number.isFinite(bo.duration_hours)) {
    boostOption = { costHPlus: bo.cost_h_plus, durationHours: bo.duration_hours };
  }

  return {
    tier,
    limitDaily,
    usedToday,
    resetsAt: typeof rl.resets_at === 'string' ? rl.resets_at : null,
    boostOption,
  };
}

/** Horas (ceil, mínimo 0) hasta el reset. null si no hay resetsAt válido. */
export function hoursUntilReset(resetsAt: string | null, now: Date = new Date()): number | null {
  if (!resetsAt) return null;
  const t = new Date(resetsAt).getTime();
  if (!Number.isFinite(t)) return null;
  const ms = t - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 3_600_000);
}

/** Texto humano de la espera: "menos de 1 h" / "~N h" / "" si no hay dato. */
export function formatResetWait(resetsAt: string | null, now: Date = new Date()): string {
  const h = hoursUntilReset(resetsAt, now);
  if (h === null) return '';
  if (h <= 1) return 'menos de 1 h';
  return `~${h} h`;
}

/** ¿Se ofrece el boost H+ en la card? */
export function canOfferBoost(info: RateLimitInfo): boolean {
  return info.boostOption !== null;
}
