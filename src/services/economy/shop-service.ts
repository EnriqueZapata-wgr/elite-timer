/**
 * shop-service — catálogo de paquetes H+ + compra (stub IAP).
 *
 * ⚠️ IAP REAL no incluido (sprint dedicado): mockPurchase intenta acreditar vía award_protons
 * (el path que usará el webhook 'purchase-completed' server-side). Desde el cliente esa RPC
 * está revocada (anti-minteo) → devuelve error: es ESPERADO. La compra real credita por
 * webhook con service_role. Ver COWORK_REPORT (flag IAP).
 */
import { supabase } from '@/src/lib/supabase';
import { awardProtons } from './proton-service';

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

/** STUB de compra (dev). El crédito real lo hace el webhook IAP server-side. */
export async function mockPurchase(
  userId: string,
  pkg: ProtonPackage,
): Promise<{ success: boolean; error?: string }> {
  return awardProtons(userId, pkg.protons, 'package_purchase', undefined, { sku: pkg.sku, mock: true });
}
