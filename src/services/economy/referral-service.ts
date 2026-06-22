/**
 * referral-service — código de referido + tracking.
 *
 * Client-callable: generateReferralCode (crea/lee el código propio), getMyReferrals.
 * ⚠️ SERVER-SIDE (service_role / edge fn): recordReferralSignup, markReferralPaid →
 * tocan filas de OTRO usuario (RLS las bloquea desde el cliente) y la recompensa es un
 * CRÉDITO (award_protons, service_role). Se implementan aquí pero deben invocarse en
 * contexto server. Ver COWORK_REPORT (flag referrals).
 */
import { supabase } from '@/src/lib/supabase';
import type { Referral } from './economy-types';
import { awardProtons } from './proton-service';
import { REFERRAL_REWARD_PROTONS, REFERRED_BONUS_PROTONS } from './economy-config';

export { REFERRAL_REWARD_PROTONS } from './economy-config';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O/0/I/1 ambiguos

function randomCode(len = 6): string {
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `ATP${out}`;
}

/** Devuelve el código del usuario; lo crea si no existe (retry ante colisión UNIQUE). */
export async function generateReferralCode(userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('referrals')
    .select('referral_code')
    .eq('referrer_id', userId)
    .limit(1)
    .maybeSingle();
  if (existing?.referral_code) return existing.referral_code as string;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { error } = await supabase
      .from('referrals')
      .insert({ referrer_id: userId, referral_code: code, status: 'pending' });
    if (!error) return code;
    // 23505 = unique_violation → reintenta con otro código.
    if ((error as any).code !== '23505') break;
  }
  throw new Error('No se pudo generar código de referido');
}

export async function getMyReferrals(userId: string): Promise<Referral[]> {
  const { data } = await supabase
    .from('referrals')
    .select('id, referrer_id, referred_id, referral_code, status, reward_protons, created_at')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as Referral[];
}

/** SERVER-SIDE. Marca el referido como registrado al crear cuenta con un código. */
export async function recordReferralSignup(referralCode: string, newUserId: string): Promise<void> {
  await supabase
    .from('referrals')
    .update({ referred_id: newUserId, status: 'signed_up', signed_up_at: new Date().toISOString() })
    .eq('referral_code', referralCode)
    .eq('status', 'pending');
}

/** SERVER-SIDE. Dispara la recompensa al referrer cuando el referido paga. */
export async function markReferralPaid(newUserId: string): Promise<void> {
  const { data } = await supabase
    .from('referrals')
    .select('id, referrer_id, status')
    .eq('referred_id', newUserId)
    .in('status', ['signed_up', 'paid'])
    .maybeSingle();
  if (!data || (data as any).status === 'rewarded') return;

  const referrerId = (data as any).referrer_id as string;
  // Doc: +200,000 H+ al referrer, +50,000 H+ al referido (ambos al pagar 1ra sub).
  await awardProtons(referrerId, REFERRAL_REWARD_PROTONS, 'referral_bonus', undefined, { referred_id: newUserId });
  await awardProtons(newUserId, REFERRED_BONUS_PROTONS, 'referral_bonus', undefined, { role: 'referred', referrer_id: referrerId });
  await supabase
    .from('referrals')
    .update({ status: 'rewarded', paid_at: new Date().toISOString(), rewarded_at: new Date().toISOString(), reward_protons: REFERRAL_REWARD_PROTONS })
    .eq('id', (data as any).id);
}
