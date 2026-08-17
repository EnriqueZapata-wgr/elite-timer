/**
 * Lógica pura de la membresía — sin imports de RN/Supabase para
 * que sea testeable en vitest (environment: node).
 *
 * PREMIUM (16-ago-2026): ATP dejó de tener planes. Hay UNA membresía y punto.
 * Ya no existe "Base", ni "Pro", ni "Clínico" como niveles de acceso: solo
 * `free` (todavía no paga) y `premium` (paga). Ninguna función se desbloquea
 * por plan, porque ya no hay plan que elegir.
 *
 * Fuentes de verdad de la membresía:
 *  - profiles.tier (Supabase, lo escribe el webhook RevenueCat)
 *  - entitlements activos del SDK RevenueCat (tiempo real en el device)
 * Se toma la MÁS generosa de ambas para cubrir lag del webhook en ambas
 * direcciones.
 *
 * ⚠️ REGLA ANTIENCIERRO — la razón de fondo de todo este cambio.
 * Hubo un incidente real: alguien pagó y la app lo dejó fuera de una función.
 * Por eso aquí:
 *  1. CUALQUIER entitlement activo cuenta como membresía, se llame como se
 *     llame. No hay lista blanca de ids. Si RevenueCat dice que esta persona
 *     tiene algo vigente, tiene acceso. Un id nuevo en el dashboard no puede
 *     volver a dejar a nadie afuera.
 *  2. CUALQUIER valor pagado histórico de profiles.tier ('base', 'pro',
 *     'clinician', 'premium') se lee como membresía. Los datos viejos siguen
 *     en la base intactos; lo único que cambia es cómo se interpretan.
 * En caso de duda, se concede el acceso. Cobrar de más y dar de menos es el
 * único error que no se puede deshacer con una disculpa.
 */

/** Solo dos estados posibles: o eres miembro o todavía no. */
export type Tier = 'free' | 'premium';

/**
 * Valores de `profiles.tier` que significan "pagó". Incluye los tres tiers
 * históricos porque en la base HAY filas con esos valores y esa gente pagó.
 * No se migran, se reinterpretan.
 */
const VALORES_PAGADOS = new Set(['base', 'pro', 'clinician', 'premium', 'founder']);

/**
 * Membresía implicada por los entitlements activos del SDK.
 * Regla antiencierro: cualquier entitlement activo basta.
 */
export function tierFromEntitlements(activeEntitlementIds: string[]): Tier {
  return activeEntitlementIds.length > 0 ? 'premium' : 'free';
}

/** Membresía según profiles.tier, degradada a free si tier_expires_at ya pasó. */
export function tierFromProfile(
  tier: string | null | undefined,
  tierExpiresAt: string | null | undefined,
  now: Date = new Date(),
): Tier {
  const pagado = typeof tier === 'string' && VALORES_PAGADOS.has(tier.toLowerCase());
  if (!pagado) return 'free';
  if (tierExpiresAt && new Date(tierExpiresAt).getTime() <= now.getTime()) return 'free';
  return 'premium';
}

/** La más generosa de dos lecturas (cubre el lag del webhook). */
export function highestTier(a: Tier, b: Tier): Tier {
  return a === 'premium' || b === 'premium' ? 'premium' : 'free';
}

/** ¿Esta persona tiene la membresía activa? Único gate que queda en la app. */
export function esMiembro(tier: Tier): boolean {
  return tier === 'premium';
}

/** Etiqueta de la membresía para pantallas de cuenta y suscripción. */
export function etiquetaMembresia(tier: Tier): string {
  return tier === 'premium' ? 'ATP Premium' : 'Sin membresía';
}
