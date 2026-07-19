/**
 * Cycle Service — Tracking de ciclo menstrual, fases, predicción, ajustes.
 */
import { parseLocalDate } from '@/src/utils/date-helpers';
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

// MB-7: copy BIDIRECCIONAL (doctrina). Folicular + ovulatoria = INTENSIFICAR
// (la app empuja: PRs, bloques duros, aprovechar la ventana). Lútea + menstrual
// = ESCUCHAR (ajustar y afinar, NUNCA prohibir ni "descansar"). Una mujer lo
// lee y se siente PODEROSA — su fisiología tiene ventanas que un hombre no tiene.
export const PHASES: Record<string, PhaseInfo> = {
  menstrual: {
    phase: 'menstrual', label: 'Menstrual', dayRange: 'Días 1-5', color: '#E24B4A', icon: 'water-outline',
    description: 'Empieza un ciclo nuevo. Tu cuerpo te habla más claro que nunca — es la fase para afinar y escuchar señales.',
    energy: 'Sensibilidad alta. Muévete con lo que tienes hoy: hay días fuertes y días de calibrar.',
    exercise: 'Fuerza técnica, movilidad, zona 2. Si tu energía está, entrena — solo baja el ego, no la ambición.',
    nutrition: ['Hierro: carne roja, espinacas, lentejas', 'Magnesio: chocolate negro 85%+', 'Omega 3 anti-inflamatorio', 'Cafeína con criterio'],
    supplements: ['Hierro bisglicinato 25mg', 'Magnesio glicinato 400mg', 'Omega 3 2g', 'Vitamina C 500mg'],
    labsBest: ['Química sanguínea general', 'Perfil lipídico', 'FSH/LH/estradiol (día 2-4, valores basales)'],
    labsAvoid: ['Progesterona (será baja — normal aquí)'],
  },
  follicular: {
    phase: 'follicular', label: 'Folicular', dayRange: 'Días 6-13', color: '#a8e02a', icon: 'leaf-outline',
    description: 'Estrógenos en ascenso: tu ventana de construir. Es cuando el cuerpo responde mejor al estímulo — aprovéchala.',
    energy: 'Alta y en subida. Métele a los bloques duros y a lo nuevo.',
    exercise: 'Fuerza pesada. HIIT. Cardio intenso. Full power — busca progresión.',
    nutrition: ['Carbos complejos para energía', 'Proteína alta para músculo', 'Crucíferas: brócoli, coliflor, kale'],
    supplements: ['Creatina 5g', 'Vitamina D 5000IU', 'DIM 200mg', 'Proteína whey post-entreno'],
    labsBest: ['Biometría hemática', 'Tiroides', 'FSH/LH día 3'],
    labsAvoid: ['Progesterona (será baja, normal)'],
  },
  ovulation: {
    phase: 'ovulation', label: 'Ovulación', dayRange: 'Días 14-16', color: '#EF9F27', icon: 'sunny-outline',
    description: 'Tu pico. Fuerza, potencia y confianza al máximo — es LA ventana para ir por un récord.',
    energy: 'Máxima. Ve por tus PRs.',
    exercise: 'Tu mejor momento para PRs y competir. No lo desperdicies.',
    nutrition: ['Antioxidantes: berries, vegetales coloridos', 'Zinc para ovulación', 'Hidratación extra'],
    supplements: ['Zinc 30mg', 'Vitamina E 400IU', 'NAC 600mg', 'Selenio 200mcg'],
    labsBest: ['Test de ovulación (pico LH)'],
    labsAvoid: ['Progesterona (aún no sube)', 'Labs generales (mejor folicular)'],
  },
  luteal: {
    phase: 'luteal', label: 'Lútea', dayRange: 'Días 17-28', color: '#7F77DD', icon: 'moon-outline',
    description: 'Progesterona al mando: fase de sostener y consolidar. Menos picos, más constancia — sigues fuerte, con otra marcha.',
    energy: 'Alta al inicio, más pareja al final. Ajusta el volumen, no la intención.',
    exercise: 'Fuerza sólida, tempo, resistencia. Si un día pide bajar intensidad, baja volumen — no pares.',
    nutrition: ['Carbos complejos sostienen energía', 'Magnesio extra', 'Calcio reduce PMS', 'Chocolate negro 85%+ válido'],
    supplements: ['Magnesio glicinato 600mg', 'Calcio 500mg', 'Vitamina B6 50mg', 'Vitex 400mg'],
    labsBest: ['Progesterona día 19-22', 'Ratio estrógeno/progesterona'],
    labsAvoid: ['Peso (retención líquidos)', 'FSH/LH (no representativo)'],
  },
};

// ═══ CÁLCULOS ═══

export function getCycleDay(lastPeriodStart: string): number {
  return Math.floor((Date.now() - parseLocalDate(lastPeriodStart).getTime()) / 86400000) + 1;
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
    const d = Math.floor((parseLocalDate(periods[i - 1].start_date).getTime() - parseLocalDate(periods[i].start_date).getTime()) / 86400000);
    if (d > 20 && d < 45) lengths.push(d);
  }
  const avg = lengths.length > 0 ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 28;
  const next = parseLocalDate(periods[0].start_date);
  next.setDate(next.getDate() + avg);
  const daysUntil = Math.max(0, Math.ceil((next.getTime() - Date.now()) / 86400000));
  const confidence = lengths.length >= 3 ? 'alta' : lengths.length >= 2 ? 'media' : 'baja';
  return { date: next, daysUntil, confidence };
}

// ═══ CRUD ═══

export async function getCycleInfo(userId: string) {
  // MB-7 — AUTO-GATE por biological_sex. El bug "estás embarazada a un hombre"
  // nació de una fuente de datos de ciclo que NO se auto-protegía y confiaba
  // en que cada caller gateara. Aquí se cierra en la raíz: sin 'female' → null,
  // pase lo que pase aguas arriba. (Los callers gateados no pagan la query.)
  const { data: prof } = await supabase
    .from('client_profiles').select('biological_sex').eq('user_id', userId).maybeSingle();
  if ((prof as any)?.biological_sex !== 'female') return null;

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

// F6 (#26): startPeriod/endPeriod/logSymptoms/getTodaySymptoms eliminados —
// exports sin importadores; cycle.tsx escribe periodos/sintomas por sus propios paths.
