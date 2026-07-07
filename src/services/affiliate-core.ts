/**
 * Sistema Afiliados (#47 fase 1) — núcleo PURO, testeable sin Supabase.
 * El I/O vive en affiliate-service.ts. Schema: migración 101 de Cowork
 * (affiliates / affiliate_codes / affiliate_referred_users /
 * affiliate_earnings / affiliate_wallets).
 */

export type AffiliateVertical =
  | 'clinico_fx' | 'centro_deportivo' | 'coach' | 'influencer' | 'retiro' | 'educador' | 'otro';

export const VERTICAL_OPTIONS: { value: AffiliateVertical; label: string; icon: string }[] = [
  { value: 'clinico_fx', label: 'Clínico Fx', icon: 'medkit-outline' },
  { value: 'centro_deportivo', label: 'Centro deportivo', icon: 'barbell-outline' },
  { value: 'coach', label: 'Coach', icon: 'fitness-outline' },
  { value: 'influencer', label: 'Influencer', icon: 'megaphone-outline' },
  { value: 'retiro', label: 'Retiros', icon: 'leaf-outline' },
  { value: 'educador', label: 'Educador', icon: 'school-outline' },
];

export const VERTICAL_LABELS: Record<AffiliateVertical, string> = {
  clinico_fx: 'Clínico Fx',
  centro_deportivo: 'Centro deportivo',
  coach: 'Coach',
  influencer: 'Influencer',
  retiro: 'Retiros',
  educador: 'Educador',
  otro: 'Otro',
};

export const AFFILIATE_STATUS_LABELS: Record<string, string> = {
  pending: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
};

/** Formato MXN sin depender de Intl completo en Hermes. */
export function formatMXN(amount: number): string {
  const fixed = (Math.round(amount * 100) / 100).toFixed(2);
  const [intPart, dec] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${withCommas}.${dec} MXN`;
}

/** Cédula profesional obligatoria solo para clínicos (validación del form). */
export function requiresCedula(vertical: AffiliateVertical | null): boolean {
  return vertical === 'clinico_fx';
}

export interface ReferredUserLite {
  joined_at: string; // ISO
  active: boolean;
}

/**
 * Serie de referidos por mes (últimos `months`, terminando en el mes de
 * `todayISO`). Para la gráfica del dashboard. Bucket por YYYY-MM.
 */
export function referralsByMonth(
  referred: ReferredUserLite[],
  todayISO: string,
  months = 6,
): { month: string; count: number }[] {
  const [ty, tm] = todayISO.split('-').map(n => parseInt(n, 10));
  const buckets: { month: string; count: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    let y = ty;
    let m = tm - i;
    while (m <= 0) { m += 12; y -= 1; }
    buckets.push({ month: `${y}-${String(m).padStart(2, '0')}`, count: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.month, i]));
  for (const r of referred) {
    const key = r.joined_at.slice(0, 7);
    const i = index.get(key);
    if (i != null) buckets[i].count += 1;
  }
  return buckets;
}

/** Cuántos referidos se unieron en los últimos `days` días. */
export function referralsInLastDays(referred: ReferredUserLite[], todayISO: string, days = 30): number {
  const cutoff = Date.parse(todayISO + 'T00:00:00') - days * 86_400_000;
  return referred.filter(r => Date.parse(r.joined_at) >= cutoff).length;
}

export interface ConversionFunnel {
  clicks: number;
  signups: number;
  paying: number;
  /** clicks → signups, 0-100 (0 si no hay clicks) */
  signupRate: number;
  /** signups → paying, 0-100 (0 si no hay signups) */
  payRate: number;
}

/** Funnel de conversión del código: clicks → signups → paying. */
export function conversionFunnel(clicks: number, signups: number, paying: number): ConversionFunnel {
  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
  return {
    clicks,
    signups,
    paying,
    signupRate: pct(signups, clicks),
    payRate: pct(paying, signups),
  };
}

export interface EarningLite {
  month_start: string; // YYYY-MM-DD
  commission_mxn: number;
  status: string;
}

/** Comisiones del mes en curso + acumulado del año (todas menos held). */
export function earningsSummary(earnings: EarningLite[], todayISO: string): { thisMonth: number; ytd: number } {
  const ym = todayISO.slice(0, 7);
  const year = todayISO.slice(0, 4);
  let thisMonth = 0;
  let ytd = 0;
  for (const e of earnings) {
    if (e.status === 'held') continue;
    if (e.month_start.slice(0, 4) === year) ytd += Number(e.commission_mxn);
    if (e.month_start.slice(0, 7) === ym) thisMonth += Number(e.commission_mxn);
  }
  return { thisMonth: Math.round(thisMonth * 100) / 100, ytd: Math.round(ytd * 100) / 100 };
}
