/**
 * Cycle Service — Tracking de ciclo menstrual, fases, predicción, ajustes.
 */
import { supabase } from '@/src/lib/supabase';

// ═══ FASES ═══

export interface PhaseInfo {
  phase: string;
  label: string;
  dayRange: string;
  color: string;
  icon: string;
  description: string;
  energy: string;
  exercise: string;
  nutrition: string[];
  supplements: string[];
  labsBest: string[];
  labsAvoid: string[];
}

export const PHASES: Record<string, PhaseInfo> = {
  menstrual: {
    phase: 'menstrual', label: 'Menstrual', dayRange: 'Días 1-5', color: '#E24B4A', icon: 'water-outline',
    description: 'Tu cuerpo se renueva. Es normal sentir menos energía.',
    energy: 'Baja — no fuerces entrenamientos intensos.',
    exercise: 'Yoga suave, caminata, stretching. Reduce intensidad 40%.',
    nutrition: ['Hierro: carne roja, espinacas, lentejas', 'Magnesio: chocolate negro 85%+', 'Omega 3 anti-inflamatorio', 'Reduce cafeína'],
    supplements: ['Hierro bisglicinato 25mg', 'Magnesio glicinato 400mg', 'Omega 3 2g', 'Vitamina C 500mg'],
    labsBest: ['Química sanguínea general', 'Perfil lipídico'],
    labsAvoid: ['Estradiol', 'Progesterona', 'LH (excepto día 3)'],
  },
  follicular: {
    phase: 'follicular', label: 'Folicular', dayRange: 'Días 6-13', color: '#a8e02a', icon: 'leaf-outline',
    description: 'Energía en ascenso. Tu momento para brillar.',
    energy: 'Alta. Mejor momento para entrenar fuerte.',
    exercise: 'Fuerza pesada. HIIT. Cardio intenso. Full power.',
    nutrition: ['Carbos complejos para energía', 'Proteína alta para músculo', 'Crucíferas: brócoli, coliflor, kale'],
    supplements: ['Creatina 5g', 'Vitamina D 5000IU', 'DIM 200mg', 'Proteína whey post-entreno'],
    labsBest: ['Biometría hemática', 'Tiroides', 'FSH/LH día 3'],
    labsAvoid: ['Progesterona (será baja, normal)'],
  },
  ovulation: {
    phase: 'ovulation', label: 'Ovulación', dayRange: 'Días 14-16', color: '#EF9F27', icon: 'sunny-outline',
    description: 'Pico de energía y confianza. Máximo rendimiento.',
    energy: 'Máxima. Intenta PRs.',
    exercise: 'Tu mejor momento para PRs y competir.',
    nutrition: ['Antioxidantes: berries, vegetales coloridos', 'Zinc para ovulación', 'Hidratación extra'],
    supplements: ['Zinc 30mg', 'Vitamina E 400IU', 'NAC 600mg', 'Selenio 200mcg'],
    labsBest: ['Test de ovulación (pico LH)'],
    labsAvoid: ['Progesterona (aún no sube)', 'Labs generales (mejor folicular)'],
  },
  luteal: {
    phase: 'luteal', label: 'Lútea', dayRange: 'Días 17-28', color: '#7F77DD', icon: 'moon-outline',
    description: 'Tu cuerpo se prepara. Los antojos son hormonales, no de carácter.',
    energy: 'Variable, tiende a bajar. Antojos normales.',
    exercise: 'Fuerza moderada, yoga, pilates. -25% volumen.',
    nutrition: ['Carbos complejos calman antojos', 'Magnesio extra', 'Calcio reduce PMS', 'Chocolate negro 85%+ válido'],
    supplements: ['Magnesio glicinato 600mg', 'Calcio 500mg', 'Vitamina B6 50mg', 'Vitex 400mg'],
    labsBest: ['Progesterona día 19-22', 'Ratio estrógeno/progesterona'],
    labsAvoid: ['Peso (retención líquidos)', 'FSH/LH (no representativo)'],
  },
};

// ═══ CÁLCULOS ═══

export function getCycleDay(lastPeriodStart: string): number {
  return Math.floor((Date.now() - new Date(lastPeriodStart).getTime()) / 86400000) + 1;
}

export function getPhase(day: number, cycleLen = 28, periodLen = 5): string {
  if (day <= periodLen) return 'menstrual';
  if (day <= Math.round(cycleLen * 0.46)) return 'follicular';
  if (day <= Math.round(cycleLen * 0.57)) return 'ovulation';
  return 'luteal';
}

export function predictNext(periods: { start_date: string }[]): { date: Date; daysUntil: number; confidence: string } {
  if (!periods.length) return { date: new Date(), daysUntil: 0, confidence: 'sin datos' };
  const lengths: number[] = [];
  for (let i = 1; i < Math.min(periods.length, 6); i++) {
    const d = Math.floor((new Date(periods[i - 1].start_date).getTime() - new Date(periods[i].start_date).getTime()) / 86400000);
    if (d > 20 && d < 45) lengths.push(d);
  }
  const avg = lengths.length > 0 ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 28;
  const next = new Date(periods[0].start_date);
  next.setDate(next.getDate() + avg);
  const daysUntil = Math.max(0, Math.ceil((next.getTime() - Date.now()) / 86400000));
  const confidence = lengths.length >= 3 ? 'alta' : lengths.length >= 2 ? 'media' : 'baja';
  return { date: next, daysUntil, confidence };
}

// ═══ CRUD ═══

export async function getCycleInfo(userId: string) {
  const [periodsRes, settingsRes] = await Promise.all([
    supabase.from('cycle_periods').select('*').eq('user_id', userId).order('start_date', { ascending: false }).limit(6),
    supabase.from('cycle_settings').select('*').eq('user_id', userId).single(),
  ]);
  const periods = periodsRes.data ?? [];
  if (!periods.length) return null;
  const settings = settingsRes.data;
  const cycleLen = settings?.avg_cycle_length ?? 28;
  const periodLen = settings?.avg_period_length ?? 5;
  const day = getCycleDay(periods[0].start_date);
  const phase = getPhase(day, cycleLen, periodLen);
  const pred = predictNext(periods);
  return {
    currentDay: day, currentPhase: phase, phaseInfo: PHASES[phase],
    prediction: pred, periods, cycleLen, periodLen,
    isOnPeriod: !periods[0].end_date,
  };
}

export async function startPeriod(userId: string) {
  return supabase.from('cycle_periods').insert({ user_id: userId, start_date: new Date().toISOString().split('T')[0] });
}

export async function endPeriod(userId: string) {
  const { data } = await supabase.from('cycle_periods').select('id').eq('user_id', userId).is('end_date', null).order('start_date', { ascending: false }).limit(1);
  if (data?.[0]) await supabase.from('cycle_periods').update({ end_date: new Date().toISOString().split('T')[0] }).eq('id', data[0].id);
}

export async function logSymptoms(userId: string, symptoms: Record<string, any>) {
  const info = await getCycleInfo(userId);
  return supabase.from('cycle_symptoms').upsert({
    user_id: userId, date: new Date().toISOString().split('T')[0],
    cycle_day: info?.currentDay ?? null, phase: info?.currentPhase ?? null,
    ...symptoms,
  }, { onConflict: 'user_id,date' });
}

export async function getTodaySymptoms(userId: string) {
  const { data } = await supabase.from('cycle_symptoms').select('*').eq('user_id', userId).eq('date', new Date().toISOString().split('T')[0]).single();
  return data;
}
