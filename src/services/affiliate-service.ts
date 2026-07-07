/**
 * Sistema Afiliados (#47 fase 1) — I/O contra el backend de Cowork
 * (migración 101: affiliates / affiliate_codes / affiliate_referred_users /
 * affiliate_earnings / affiliate_wallets, ya aplicada en remoto).
 * Lógica pura en affiliate-core.ts.
 */
import { supabase } from '@/src/lib/supabase';
import type { AffiliateVertical } from './affiliate-core';

export interface Affiliate {
  id: string;
  user_id: string;
  vertical: AffiliateVertical;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  cedula_profesional: string | null;
  rfc: string | null;
  business_name: string | null;
  short_bio: string | null;
  website_url: string | null;
  social_links: Record<string, string>;
  contract_signed_at: string | null;
  reject_reason: string | null;
  created_at: string;
}

export interface AffiliateWallet {
  balance_mxn: number;
  lifetime_earned_mxn: number;
  lifetime_paid_mxn: number;
  last_payout_at: string | null;
}

export interface AffiliateCode {
  id: string;
  code: string;
  campaign_tag: string | null;
  active: boolean;
  clicks_count: number;
  signups_count: number;
}

export interface ReferredUser {
  joined_at: string;
  active: boolean;
  first_paid_at: string | null;
  ltv_generated_mxn: number;
}

export interface Earning {
  month_start: string;
  commission_mxn: number;
  source_type: string;
  status: string;
  paid_at: string | null;
  active_referrals_count: number;
}

/** Perfil de afiliado del usuario (null si nunca aplicó). */
export async function getAffiliate(userId: string): Promise<Affiliate | null> {
  const { data, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[affiliate] getAffiliate:', error.message);
    return null;
  }
  return (data as Affiliate) ?? null;
}

export interface AffiliateApplication {
  vertical: AffiliateVertical;
  fullName: string;
  email: string;
  phone: string;
  specialty: string;
  cedulaProfesional?: string;
  rfc?: string;
  shortBio: string;
  socialOrWebsite?: string;
}

/**
 * Aplicación de afiliado = INSERT en affiliates con status='pending'
 * (el backend de Cowork no tiene tabla applications separada — decisión
 * alineada a su schema). Contacto/especialidad van en social_links JSONB.
 */
export async function applyAsAffiliate(userId: string, app: AffiliateApplication): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('affiliates').insert({
    user_id: userId,
    vertical: app.vertical,
    status: 'pending',
    business_name: app.fullName.trim(),
    short_bio: app.shortBio.trim(),
    cedula_profesional: app.cedulaProfesional?.trim() || null,
    rfc: app.rfc?.trim() || null,
    website_url: app.socialOrWebsite?.trim() || null,
    social_links: {
      email: app.email.trim(),
      phone: app.phone.trim(),
      specialty: app.specialty.trim(),
    },
    contract_signed_at: new Date().toISOString(),
    contract_version: '1.0',
  });
  if (error) {
    console.warn('[affiliate] apply:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Datos completos del dashboard en paralelo. */
export async function loadAffiliateDashboard(affiliateId: string): Promise<{
  wallet: AffiliateWallet | null;
  codes: AffiliateCode[];
  referred: ReferredUser[];
  earnings: Earning[];
}> {
  const [walletRes, codesRes, referredRes, earningsRes] = await Promise.all([
    supabase.from('affiliate_wallets').select('balance_mxn, lifetime_earned_mxn, lifetime_paid_mxn, last_payout_at').eq('affiliate_id', affiliateId).maybeSingle(),
    supabase.from('affiliate_codes').select('id, code, campaign_tag, active, clicks_count, signups_count').eq('affiliate_id', affiliateId).order('created_at', { ascending: true }),
    supabase.from('affiliate_referred_users').select('joined_at, active, first_paid_at, ltv_generated_mxn').eq('affiliate_id', affiliateId),
    supabase.from('affiliate_earnings').select('month_start, commission_mxn, source_type, status, paid_at, active_referrals_count').eq('affiliate_id', affiliateId).order('month_start', { ascending: false }).limit(24),
  ]);
  return {
    wallet: (walletRes.data as AffiliateWallet) ?? null,
    codes: (codesRes.data as AffiliateCode[]) ?? [],
    referred: (referredRes.data as ReferredUser[]) ?? [],
    earnings: (earningsRes.data as Earning[]) ?? [],
  };
}

/**
 * Garantiza que el afiliado (aprobado) tenga al menos un código activo.
 * Usa la función SQL generate_affiliate_code() del backend de Cowork.
 */
export async function ensurePrimaryCode(affiliateId: string): Promise<AffiliateCode | null> {
  const { data: existing } = await supabase
    .from('affiliate_codes')
    .select('id, code, campaign_tag, active, clicks_count, signups_count')
    .eq('affiliate_id', affiliateId)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return existing as AffiliateCode;

  const { data: gen, error: genError } = await supabase.rpc('generate_affiliate_code');
  if (genError || !gen) {
    console.warn('[affiliate] generate_affiliate_code:', genError?.message);
    return null;
  }
  const { data: inserted, error } = await supabase
    .from('affiliate_codes')
    .insert({ affiliate_id: affiliateId, code: gen as string })
    .select('id, code, campaign_tag, active, clicks_count, signups_count')
    .single();
  if (error) {
    console.warn('[affiliate] ensurePrimaryCode insert:', error.message);
    return null;
  }
  return inserted as AffiliateCode;
}
