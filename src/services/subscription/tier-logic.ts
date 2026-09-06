/**
 * Lógica pura de la membresía — sin imports de RN/Supabase para
 * que sea testeable en vitest (environment: node).
 *
 * PREMIUM (16-ago-2026): ATP dejó de tener planes. Hay UNA membresía y punto.
 * Ya no existe "Base", ni "Pro", ni "Clínico" como niveles de acceso: solo
 * `free` (todavía no paga) y `premium` (paga). Ninguna función se desbloquea
 * por plan, porque ya no hay plan que elegir.
 * ATP 3.0 (5-sep-2026): se suma `elite` como tercer peldaño (ver el tipo Tier).
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

/**
 * ATP 3.0 (5-sep-2026, pivote 2.3): tres peldaños. `premium` es la membresía
 * de tienda (Pro); `elite` es suma sobre premium, nunca recorte: lo tiene
 * quien contrató la evaluación con Enrique y canjeó su código Elite. Elite
 * no se vende en tiendas, así que RevenueCat nunca lo produce.
 */
export type Tier = 'free' | 'premium' | 'elite';

/** Orden de los peldaños: free < premium < elite. */
const RANGO: Record<Tier, number> = { free: 0, premium: 1, elite: 2 };

/**
 * Valores de `profiles.tier` que significan "pagó". Incluye los tres tiers
 * históricos porque en la base HAY filas con esos valores y esa gente pagó.
 * No se migran, se reinterpretan.
 */
const VALORES_PAGADOS = new Set(['base', 'pro', 'clinician', 'premium', 'founder', 'elite']);

/**
 * Membresía implicada por los entitlements activos del SDK.
 * Regla antiencierro: cualquier entitlement activo basta.
 */
export function tierFromEntitlements(activeEntitlementIds: string[]): Tier {
  return activeEntitlementIds.length > 0 ? 'premium' : 'free';
}

/**
 * Membresía según profiles.tier, degradada a free si tier_expires_at ya pasó.
 * ATP 3.0: `elite` vigente se lee como elite; todo lo demás pagado y vigente
 * como premium. Un elite vencido cae a free igual que cualquier otro (la
 * evaluación Elite se conserva por existencia, no por tier: ver
 * `tieneEvaluacionElite` en useSubscription).
 */
export function tierFromProfile(
  tier: string | null | undefined,
  tierExpiresAt: string | null | undefined,
  now: Date = new Date(),
): Tier {
  const valor = typeof tier === 'string' ? tier.toLowerCase() : '';
  const pagado = VALORES_PAGADOS.has(valor);
  if (!pagado) return 'free';
  if (tierExpiresAt && new Date(tierExpiresAt).getTime() <= now.getTime()) return 'free';
  return valor === 'elite' ? 'elite' : 'premium';
}

/** La más generosa de dos lecturas (cubre el lag del webhook): free < premium < elite. */
export function highestTier(a: Tier, b: Tier): Tier {
  return RANGO[a] >= RANGO[b] ? a : b;
}

/** ¿Esta persona tiene la membresía activa? Elite incluye premium (suma, nunca recorte). */
export function esMiembro(tier: Tier): boolean {
  return tier === 'premium' || tier === 'elite';
}

/** ¿Tiene el nivel Elite vigente? Solo sirve para que el cliente sepa que además tiene Pro. */
export function esElite(tier: Tier): boolean {
  return tier === 'elite';
}

/** Etiqueta de la membresía para pantallas de cuenta y suscripción. */
export function etiquetaMembresia(tier: Tier): string {
  if (tier === 'elite') return 'ATP Elite';
  return tier === 'premium' ? 'ATP Premium' : 'Sin membresía';
}
