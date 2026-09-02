/**
 * Cycle Service — Tracking de ciclo menstrual, fases, predicción, ajustes.
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { supabase } from '@/src/lib/supabase';
import { canAccessCycle } from '@/src/services/cycle/cycle-access-core';
import { resolverCiclo, largoDeCiclo, predecirProximo } from '@/src/services/cycle/cycle-phase-core';

// MB-27 P3 + audit B1: la función de fase Y la resolución {inicio, largo,
// periodo} viven en cycle-phase-core (ÚNICAS, con test de mutación). Se
// re-exportan para los importadores de siempre.
export { getPhase, resolverCiclo } from '@/src/services/cycle/cycle-phase-core';
export type { CyclePhase } from '@/src/services/cycle/cycle-phase-core';

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

// 31-ago-2026 (17.2): dayRange describe un ciclo de 28 con periodo de 5 y
// sale de getPhase (cycle-phase-core): ovulatoria = banda alta de
// ventanaOvulatoria (12-14) y lutea = los 14 de convencion (15-28). Antes decia
// 6-13 / 14-16 / 17-28, de los umbrales 0.46/0.57 que murieron. Hoy ningun
// consumidor pinta dayRange; se corrige para que no mienta cuando alguien lo use.
// MB-7: copy BIDIRECCIONAL (doctrina). Folicular + ovulatoria = INTENSIFICAR
// (la app empuja: PRs, bloques duros, aprovechar la ventana). Lútea + menstrual
// = ESCUCHAR (ajustar y afinar, NUNCA prohibir ni "descansar"). Una mujer lo
// lee y se siente PODEROSA — su fisiología tiene ventanas que un hombre no tiene.
export const PHASES: Record<string, PhaseInfo> = {
  menstrual: {
    phase: 'menstrual', label: 'Menstrual', dayRange: 'Días 1-5', color: '#E24B4A', icon: 'water-outline',
    description: 'Empieza un ciclo nuevo. Tu cuerpo te habla más claro que nunca: es la fase para afinar y escuchar señales.',
    energy: 'Sensibilidad alta. Muévete con lo que tienes hoy: hay días fuertes y días de calibrar.',
    exercise: 'Fuerza técnica, movilidad, zona 2. Si tu energía está, entrena. Solo baja el ego, no la ambición.',
    nutrition: ['Hierro: carne roja, espinacas, lentejas', 'Magnesio: chocolate negro 85%+', 'Omega 3 anti-inflamatorio', 'Cafeína con criterio'],
    supplements: ['Hierro bisglicinato 25mg', 'Magnesio glicinato 400mg', 'Omega 3 2g', 'Vitamina C 500mg'],
    labsBest: ['Química sanguínea general', 'Perfil lipídico', 'FSH/LH/estradiol (día 2-4, valores basales)'],
    labsAvoid: ['Progesterona (será baja, normal aquí)'],
  },
  follicular: {
    phase: 'follicular', label: 'Folicular', dayRange: 'Días 6-11', color: '#a8e02a', icon: 'leaf-outline',
    description: 'Estrógenos en ascenso: tu ventana de construir. Es cuando el cuerpo responde mejor al estímulo. Aprovéchala.',
    energy: 'Alta y en subida. Métele a los bloques duros y a lo nuevo.',
    exercise: 'Fuerza pesada. HIIT. Cardio intenso. Full power: busca progresión.',
    nutrition: ['Carbos complejos para energía', 'Proteína alta para músculo', 'Crucíferas: brócoli, coliflor, kale'],
    supplements: ['Creatina 5g', 'Vitamina D 5000IU', 'DIM 200mg', 'Proteína whey post-entreno'],
    labsBest: ['Biometría hemática', 'Tiroides', 'FSH/LH día 3'],
    labsAvoid: ['Progesterona (será baja, normal)'],
  },
  ovulation: {
    phase: 'ovulation', label: 'Ovulación', dayRange: 'Días 12-14', color: '#EF9F27', icon: 'sunny-outline',
    description: 'Tu pico. Fuerza, potencia y confianza al máximo: es LA ventana para ir por un récord.',
    energy: 'Máxima. Ve por tus PRs.',
    exercise: 'Tu mejor momento para PRs y competir. No lo desperdicies.',
    nutrition: ['Antioxidantes: berries, vegetales coloridos', 'Zinc para ovulación', 'Hidratación extra'],
    supplements: ['Zinc 30mg', 'Vitamina E 400IU', 'NAC 600mg', 'Selenio 200mcg'],
    labsBest: ['Test de ovulación (pico LH)'],
    labsAvoid: ['Progesterona (aún no sube)', 'Labs generales (mejor folicular)'],
  },
  luteal: {
    phase: 'luteal', label: 'Lútea', dayRange: 'Días 15-28', color: '#7F77DD', icon: 'moon-outline',
    description: 'Progesterona al mando: fase de sostener y consolidar. Menos picos, más constancia. Sigues fuerte, con otra marcha.',
    energy: 'Alta al inicio, más pareja al final. Ajusta el volumen, no la intención.',
    exercise: 'Fuerza sólida, tempo, resistencia. Si un día pide bajar intensidad, baja volumen, no pares.',
    nutrition: ['Carbos complejos sostienen energía', 'Magnesio extra', 'Calcio reduce PMS', 'Chocolate negro 85%+ válido'],
    supplements: ['Magnesio glicinato 600mg', 'Calcio 500mg', 'Vitamina B6 50mg', 'Vitex 400mg'],
    labsBest: ['Progesterona día 19-22', 'Ratio estrógeno/progesterona'],
    labsAvoid: ['Peso (retención líquidos)', 'FSH/LH (no representativo)'],
  },
};

// ═══ CÁLCULOS ═══

// Audit B1: getCycleDay murió — era una resolución paralela del día del
// ciclo (Date.now contra parseLocalDate) sin guarda de frescura. El día
// canónico sale de resolverCiclo, siempre.
//
// Ciclo-1: predictNext murió por la misma razón. Promediaba periods[]
// por su cuenta y publicaba una fecha distinta a la de la tarjeta (hasta
// 5 días de diferencia, misma usuaria, misma pantalla). La predicción
// canónica es predecirProximo() en cycle/cycle-phase-core.ts, que parte
// de resolverCiclo. Una sola fecha viva a la vez.

// ═══ CRUD ═══

export async function getCycleInfo(userId: string) {
  // MB-7 — AUTO-GATE por biological_sex. El bug "estás embarazada a un hombre"
  // nació de una fuente de datos de ciclo que NO se auto-protegía y confiaba
  // en que cada caller gateara. Aquí se cierra en la raíz: sin 'female' → null,
  // pase lo que pase aguas arriba. (Los callers gateados no pagan la query.)
  //
  // MB-22 Pieza 4 — el gate se extiende con el MODO: en 'acompanante' el
  // calendario es de OTRA persona y NUNCA sale de la app de Ciclo. Todos los
  // consumidores de salud (ARGOS, day-compiler, recetas, prescripción,
  // emociones) pasan por aquí, así que este null los cierra todos. Las
  // pantallas de Ciclo NO usan esta función: leen sus tablas directo.
  const [{ data: prof }, mode] = await Promise.all([
    supabase.from('client_profiles').select('biological_sex').eq('user_id', userId).maybeSingle(),
    import('@/src/services/app-mode-service').then((m) => m.getCycleAppMode(userId)),
  ]);
  if (!canAccessCycle((prof as any)?.biological_sex, mode)) return null;

  const [periodsRes, settingsRes] = await Promise.all([
    supabase.from('cycle_periods').select('*').eq('user_id', userId).order('start_date', { ascending: false }).limit(6),
    supabase.from('cycle_settings').select('*').eq('user_id', userId).single(),
  ]);
  const periods = periodsRes.data ?? [];
  if (!periods.length) return null;
  const settings = settingsRes.data;

  // Audit B1: LA resolución (cycle-phase-core) — largo observado sobre
  // ajuste manual y guarda de frescura ADENTRO. Una usuaria que dejó de
  // registrar no ve "fase lútea, día 187" en Entrenar: ve nada, igual que
  // en /cycle. Misma entrada, misma fase, en todas las superficies.
  const res = resolverCiclo({
    periods,
    avgCycleLength: settings?.avg_cycle_length,
    avgPeriodLength: settings?.avg_period_length,
    hoy: getLocalToday(),
  });
  if (!res) return null;

  const pred = predecirProximo(res);
  return {
    currentDay: res.day, currentPhase: res.phase, phaseInfo: PHASES[res.phase],
    prediction: pred, periods, cycleLen: res.cycleLen, periodLen: res.periodLen,
    // Audit V2 B1: de dónde salió el largo — regla de la casa: quien pinte
    // el número LO DICE (Entrenar incluido, no solo /cycle).
    largoFuente: res.largoFuente, cyclesUsed: res.cyclesUsed,
    isOnPeriod: !periods[0].end_date,
  };
}

/**
 * Audit V2 B1 — los datos CRUDOS del ciclo con el gate incluido, SIN la
 * guarda de frescura de HOY. Para consumidores HISTÓRICOS
 * (emotion-history): la frescura protege la afirmación "hoy estás en fase
 * X", no el mapeo de fechas pasadas — una usuaria con último inicio hace
 * 46 días conserva el overlay de los días que SÍ se resuelven; su guarda
 * por fecha (day > cycleLen → sin fase) vive en el consumidor.
 * null = gate cerrado o sin datos, igual que getCycleInfo.
 */
export async function getCycleBasics(userId: string): Promise<
  { periods: { start_date: string; end_date: string | null }[]; cycleLen: number; periodLen: number } | null
> {
  const [{ data: prof }, mode] = await Promise.all([
    supabase.from('client_profiles').select('biological_sex').eq('user_id', userId).maybeSingle(),
    import('@/src/services/app-mode-service').then((m) => m.getCycleAppMode(userId)),
  ]);
  if (!canAccessCycle((prof as any)?.biological_sex, mode)) return null;

  const [periodsRes, settingsRes] = await Promise.all([
    supabase.from('cycle_periods').select('*').eq('user_id', userId).order('start_date', { ascending: false }).limit(6),
    supabase.from('cycle_settings').select('*').eq('user_id', userId).single(),
  ]);
  const periods = periodsRes.data ?? [];
  if (!periods.length) return null;
  const { cycleLen } = largoDeCiclo(periods, settingsRes.data?.avg_cycle_length);
  return { periods, cycleLen, periodLen: settingsRes.data?.avg_period_length ?? 5 };
}

// F6 (#26): startPeriod/endPeriod/logSymptoms/getTodaySymptoms eliminados —
// exports sin importadores; cycle.tsx escribe periodos/sintomas por sus propios paths.
