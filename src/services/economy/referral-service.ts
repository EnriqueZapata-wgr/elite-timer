/**
 * referral-service — código de referido + tracking.
 *
 * PREMIUM (16-ago-2026): EL PROGRAMA DE REFERIDOS QUEDA APAGADO.
 *
 * No por falta de ganas, sino porque su única recompensa eran protones H+
 * (+200,000 al que invita, +50,000 al invitado) y esa moneda dejó de existir.
 * Premiar con "más acceso" tampoco aplica: con una sola membresía, el acceso
 * ya es total. Falta decidir con qué se premia ahora (¿meses de regalo?), y
 * mientras eso no se decida el flujo no puede pagar nada.
 *
 * Qué se conserva y por qué:
 *  - Las tablas `referrals` y sus filas NO se tocan. Hay códigos ya repartidos
 *    y gente ya registrada bajo ellos; ese dato es suyo.
 *  - generateReferralCode / getMyReferrals / recordReferralSignup siguen
 *    funcionando: solo emiten y rastrean el código, nunca pagaron nada.
 *  - markReferralPaid es la única pieza que se apaga, porque era la que
 *    acreditaba H+.
 *
 * Nada de esto está cableado a una pantalla hoy. Ver COWORK_REPORT (flag referrals).
 *
 * ⚠️ SERVER-SIDE (service_role / edge fn): recordReferralSignup toca filas de
 * OTRO usuario (RLS las bloquea desde el cliente).
 */
import { supabase } from '@/src/lib/supabase';
import type { Referral } from './economy-types';

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
    .select('id, referrer_id, referred_id, referral_code, status, created_at')
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

/**
 * SERVER-SIDE. APAGADO.
 *
 * PREMIUM (16-ago-2026): esta función acreditaba H+ a las dos partes cuando el
 * referido pagaba su primera suscripción. Sin protones no tiene con qué pagar,
 * y marcar el referido como 'rewarded' sin haber entregado nada dejaría una
 * mentira en la base imposible de reclamar después.
 *
 * Por eso solo se marca 'paid': queda constancia de que ese referido sí compró,
 * y el día que se defina la nueva recompensa se puede liquidar hacia atrás sin
 * haber perdido a nadie.
 */
export async function markReferralPaid(newUserId: string): Promise<void> {
  await supabase
    .from('referrals')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('referred_id', newUserId)
    .eq('status', 'signed_up');
}
