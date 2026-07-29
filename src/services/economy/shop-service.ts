/**
 * shop-service — catálogo de paquetes H+.
 *
 * MB-13 · Pieza 6: la compra real vive en iap-service (consumibles vía
 * RevenueCat; el product id de tienda ES el sku por convención) y el
 * crédito lo hace el webhook server-side, idempotente por transaction_id.
 * El price_mxn del catálogo es referencia interna: la UI muestra SIEMPRE
 * el priceString del producto real de la tienda.
 */
import { supabase } from '@/src/lib/supabase';

export interface ProtonPackage {
  sku: string;
  name: string;
  protons: number;
  price_mxn: number;
  price_usd?: number | null;
  bonus_percent: number;
  display_order: number;
}

export async function getProtonPackages(): Promise<ProtonPackage[]> {
  const { data } = await supabase
    .from('proton_packages')
    .select('sku, name, protons, price_mxn, price_usd, bonus_percent, display_order')
    .eq('enabled', true)
    .order('display_order', { ascending: true });
  return (data ?? []) as ProtonPackage[];
}

