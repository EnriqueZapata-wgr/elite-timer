/**
 * Day Compiler — Cerebro de la pantalla HOY.
 *
 * compileDay() recopila todos los datos del día (protocolos, electrones,
 * nutrición, ayuno, etc.) y devuelve un objeto unificado listo para renderizar.
 */
import { supabase } from '@/src/lib/supabase';
import { getLocalToday, getLocalHour, toLocalDateString } from '@/src/utils/date-helpers';
import { ELECTRON_WEIGHTS, type ElectronSource } from '@/src/constants/electrons';
import { generateDailyPlan } from '@/src/services/protocol-builder-service';
import { getUserWaterGoal, HYDRATION_DEFAULTS } from '@/src/services/hydration-service';
import { getMealTimes } from '@/src/services/meal-times-service';
import { mealAgendaItems, sleepAgendaItem } from '@/src/utils/agenda-extras';
import { getCycleInfo } from '@/src/services/cycle-service';
import { awardBooleanElectron, revokeBooleanElectron } from '@/src/services/electron-service';
import { warn as logWarn } from '@/src/lib/logger';

/**
 * Electrones cuya `completed` se deriva de actividad real (no del blob).
 * Tap en HOY sobre uno NO los prende — lleva a la pantalla de actividad.
 * El compilador los enciende solos cuando hay un registro real ese día.
 *
 * `period_log` solo se ofrece a usuarias con `biological_sex === 'female'`.
 */
export const VERIFIED_ELECTRON_KEYS = ['meditation', 'breathwork', 'strength', 'supplements', 'period_log', 'checkin'] as const;
export type VerifiedElectronKey = typeof VERIFIED_ELECTRON_KEYS[number];

/** Ruta de la pantalla de actividad para cada electrón verificado. */
export const VERIFIED_ELECTRON_ROUTES: Record<VerifiedElectronKey, string> = {
  meditation: '/meditation',
  breathwork: '/breathing',
  strength: '/log-exercise',
  supplements: '/supplements',
  period_log: '/cycle',
  checkin: '/checkin', // H1: tap del hábito Check-in emocional → /checkin (no togglea)
};

/** Electrones que solo se ofrecen a un subconjunto de usuarios. */
export const FEMALE_ONLY_ELECTRONS = new Set<string>(['period_log']);

// ═══ TIPOS ═══

export interface CompiledDay {
  greeting: string;
  date: string;
  userName: string;
  protocol: { name: string; dayNumber: number; totalDays: number } | null;
  electronProgress: { earned: number; possible: number; percentage: number };
  nextElectron: NextElectron | null;
  booleanElectrons: BoolElectronState[];
  quantitativeElectrons: QuantElectronState[];
  suggestion: Suggestion | null;
  agendaItems: AgendaItem[];
}

export interface BoolElectronState {
  source: string;
  name: string;
  icon: string;
  color: string;
  weight: number;
  completed: boolean;
  description: string;
  pillarRoute: string;
}

export interface QuantElectronState {
  source: string;
  name: string;
  icon: string;
  color: string;
  weight: number;
  current: number;
  target: number;
  unit: string;
  displayCurrent: string;
  displayTarget: string;
}

export interface NextElectron {
  source: string;
  name: string;
  description: string;
  weight: number;
  icon: string;
  color: string;
}

export interface Suggestion {
  text: string;
  action: string;
  route: string;
}

export interface AgendaItem {
  id: string;
  time: string;
  name: string;
  subtitle?: string;
  category: string;
  completed: boolean;
  isNext: boolean;
  isSmart: boolean;
  route?: string;
  /** Item informativo (comida/sueño): se muestra en la línea de tiempo pero no es toggleable. */
  informational?: boolean;
}

/**
 * Señales cross-pillar resumidas, derivadas de mood/glucosa/ciclo.
 * Cualquier campo puede ser null si no hay data — los consumidores deben gateaer.
 */
interface CrossPillar {
  mood: { pleasantness: number; quadrant: string; isLow: boolean } | null;
  lastGlucose: { value: number; context: string | null; isHigh: boolean } | null;
  cyclePhase: { phase: string; cycleDay: number } | null;
}

// ═══ DEFAULTS ═══

const DEFAULT_BOOLEANS = ['sunlight', 'meditation', 'supplements', 'cold_shower', 'grounding', 'no_alcohol'];
const DEFAULT_QUANTS = ['protein', 'water'];

const DEFAULT_QUANT_CONFIG: Record<string, { target: number; unit: string }> = {
  protein: { target: 150, unit: 'g' },
  steps:   { target: 10000, unit: 'pasos' },
  water:   { target: HYDRATION_DEFAULTS.waterGoalMl, unit: 'ml' },
  sleep:   { target: 8, unit: 'h' },
};

const ELECTRON_DESCRIPTIONS: Record<string, string> = {
  sunlight: 'Exponerte a luz solar mejora ritmo circadiano y vitamina D.',
  meditation: 'Reduce cortisol, mejora enfoque y regula sistema nervioso.',
  supplements: 'Asegura micronutrientes que la dieta no cubre.',
  cold_shower: 'Activa grasa parda, aumenta norepinefrina y fortalece inmunidad.',
  grounding: 'Contacto con la tierra reduce inflamación.',
  no_alcohol: 'Mejora sueño, recuperación hepática y claridad mental.',
  strength: 'Aumenta masa muscular, metabolismo y densidad ósea.',
  breathwork: 'Activa el nervio vago y regula el sistema nervioso.',
  red_glasses: 'Bloquear luz azul mejora producción de melatonina.',
  period_log: 'Registrar tu ciclo ayuda a entender patrones.',
};

const ELECTRON_ROUTES: Record<string, string> = {
  sunlight: '/my-health', meditation: '/mind-hub', supplements: '/my-health',
  cold_shower: '/my-health', grounding: '/my-health', no_alcohol: '/nutrition',
  strength: '/fitness-hub', breathwork: '/mind-hub', red_glasses: '/my-health',
  period_log: '/cycle',
};

const TIME_WINDOWS: Record<string, [number, number]> = {
  sunlight: [6, 10], meditation: [6, 9], supplements: [7, 9],
  strength: [8, 18], breathwork: [6, 22], cold_shower: [6, 12],
  grounding: [8, 18], red_glasses: [20, 23], no_alcohol: [0, 23],
};

const ELECTRON_KW = [
  'pasos', 'steps', 'proteína', 'protein', 'agua', 'water', 'hidratación',
  'dormir', 'sleep', 'sueño', 'alcohol', 'suplementos', 'supplements',
  'grounding', 'meditación', 'meditation', 'baño frío', 'cold', 'lentes',
  'breathwork', 'respiración', 'luz solar', 'sunlight',
];

// ═══ MAIN ═══

/** Callback de progreso del compile (0-100, label en español). Opcional → no rompe callers. */
export type CompileProgress = (pct: number, label: string) => void;

export async function compileDay(userId: string, onProgress?: CompileProgress): Promise<CompiledDay> {
  const today = getLocalToday();
  const hour = getLocalHour();
  onProgress?.(10, 'Cargando tu perfil');

  // Parallelizar queries (incluye verificación de actividad real para los
  // electrones verificados — ver VERIFIED_ELECTRON_KEYS).
  const [
    prefsRes, dailyERes, userRes, protRes, foodRes, hydRes, fastRes, moodRes, glucoseRes, clientProfileRes,
    meditationCountRes, breathingCountRes, exerciseCountRes, supplementCountRes, cycleLogCountRes,
  ] = await Promise.all([
    supabase.from('user_day_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('daily_electrons').select('electrons').eq('user_id', userId).eq('date', today).maybeSingle(),
    supabase.auth.getUser(),
    supabase.from('user_protocols').select('*, template:protocol_templates(name, duration_weeks)').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1),
    supabase.from('food_logs').select('protein_g').eq('user_id', userId).eq('date', today),
    supabase.from('hydration_logs').select('total_ml').eq('user_id', userId).eq('date', today).maybeSingle(),
    supabase.from('fasting_logs').select('fast_start, target_hours').eq('user_id', userId).eq('status', 'active').limit(1),
    supabase.from('emotional_checkins').select('pleasantness, quadrant, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('glucose_logs').select('value_mg_dl, context, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('client_profiles').select('biological_sex').eq('user_id', userId).maybeSingle(),
    // Conteo de actividad real del día para los electrones verificados:
    supabase.from('mind_sessions').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('date', today).eq('type', 'meditation'),
    supabase.from('mind_sessions').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('date', today).eq('type', 'breathing'),
    supabase.from('exercise_logs').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('date', today),
    supabase.from('supplement_logs').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('date', today).eq('taken', true),
    supabase.from('cycle_daily_logs').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('date', today),
  ]);

  onProgress?.(45, 'Cargando métricas');

  // Para los verificados: derivar `completed` de actividad real, NO del blob.
  // checkin: el último emotional_checkin (moodRes) es de HOY (no requiere query extra).
  const lastCheckinDate = (moodRes.data as any)?.created_at
    ? toLocalDateString(new Date((moodRes.data as any).created_at))
    : null;
  const verifiedCompleted: Record<string, boolean> = {
    meditation: (meditationCountRes.count ?? 0) >= 1,
    breathwork: (breathingCountRes.count ?? 0) >= 1,
    strength: (exerciseCountRes.count ?? 0) >= 1,
    supplements: (supplementCountRes.count ?? 0) >= 1,
    period_log: (cycleLogCountRes.count ?? 0) >= 1,
    checkin: lastCheckinDate === today,
  };

  const biologicalSex = (clientProfileRes.data as any)?.biological_sex ?? null;
  const crossPillar = await deriveCrossPillar(userId, moodRes.data, glucoseRes.data, biologicalSex);
  onProgress?.(65, 'Analizando señales');

  const prefs = prefsRes.data;
  // HOY-1: la columna JSONB `electrons` puede venir explícitamente como `null`
  // (usuarios nuevos sin upsert). `?? {}` solo cubre undefined; usar `|| {}`
  // para que también cubra el caso null y evitar crash en boolStates[k].
  const boolStates = (dailyERes.data?.electrons as Record<string, boolean> | null) || {};
  // Nombre: user_metadata → profiles.full_name → fallback
  let userName = userRes.data.user?.user_metadata?.full_name?.split(' ')[0]?.toUpperCase() || '';
  if (!userName) {
    const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle();
    userName = prof?.full_name?.split(' ')[0]?.toUpperCase() || '';
  }
  if (!userName) {
    userName = userRes.data.user?.email?.split('@')[0]?.toUpperCase() || '';
  }

  const activeBoolKeys: string[] = prefs?.active_boolean_electrons ?? DEFAULT_BOOLEANS;
  const activeQuantKeys: string[] = (prefs?.active_quantitative_electrons ?? DEFAULT_QUANTS)
    .filter((k: string) => k !== 'steps' && k !== 'sleep'); // Sin fuente hasta wearables

  // Metas personalizadas del usuario (si guardó en protocol-config)
  const userGoals = (prefs?.goals as any) || {};
  const waterGoalMl = await getUserWaterGoal(userId);
  const QUANT_CONFIG: Record<string, { target: number; unit: string }> = {
    protein: { target: userGoals.protein_goal_g || DEFAULT_QUANT_CONFIG.protein.target, unit: 'g' },
    steps:   { target: DEFAULT_QUANT_CONFIG.steps.target, unit: 'pasos' },
    water:   { target: waterGoalMl, unit: 'ml' },
    sleep:   { target: DEFAULT_QUANT_CONFIG.sleep.target, unit: 'h' },
  };

  // F03.7: wake_time de `user_day_preferences.goals.wake_time` cuando el
  // usuario lo edita en protocol-config (escribe ahí). Fallback a
  // `user_chronotype.schedule.wake_time` (escrito en onboarding). Antes,
  // `buildAgenda` solo leía del cronotipo → cambios en config no afectaban
  // la agenda.
  const wakeFromPrefs: string | undefined =
    typeof userGoals.wake_time === 'string' && /^\d{1,2}:\d{2}$/.test(userGoals.wake_time)
      ? userGoals.wake_time
      : undefined;

  // Protocol
  let protocol: CompiledDay['protocol'] = null;
  const prot = protRes.data?.[0];
  if (prot) {
    // HOY-2: validar la fecha de arranque. Si está corrupta, usar hoy como
    // fallback para que `dayNum` no sea NaN (→ ring crashea con NaN en SVG)
    // ni exceda el total del protocolo.
    const startRaw = prot.started_at ?? prot.created_at;
    const parsed = startRaw ? new Date(startRaw) : null;
    const startDate = parsed && !isNaN(parsed.getTime()) ? parsed : new Date();
    // HOY-11: guard de finitud + cap sobre totalDays. Si duration_weeks
    // viene corrupto (string, NaN, negativo, absurdo), fallback a 12 sem.
    // Cap superior 365 días para que ni totalDays ni dayNumber crezcan
    // sin tope si la fecha base viene del futuro o el template inflado.
    const rawWeeks = Number(prot.template?.duration_weeks);
    const safeWeeks = Number.isFinite(rawWeeks) && rawWeeks > 0 ? rawWeeks : 12;
    const totalDays = Math.min(safeWeeks * 7, 365);
    const rawDayNum = Math.ceil((Date.now() - startDate.getTime()) / 86400000) + 1;
    const dayNum = Math.min(totalDays, Math.max(1, isFinite(rawDayNum) ? rawDayNum : 1));
    protocol = { name: prot.name ?? prot.template?.name ?? 'Protocolo', dayNumber: dayNum, totalDays };
  }

  // Boolean electrons
  const booleanElectrons: BoolElectronState[] = activeBoolKeys
    .filter(k => (ELECTRON_WEIGHTS as any)[k])
    // Gate de género: period_log solo para usuarias que menstrúan.
    .filter(k => !FEMALE_ONLY_ELECTRONS.has(k) || biologicalSex === 'female')
    .map(k => {
      const cfg = (ELECTRON_WEIGHTS as any)[k];
      // Para los 4 verificados, `completed` viene de actividad real (no del blob).
      // El blob para estos keys queda vestigial — se ignora aquí.
      const completed = k in verifiedCompleted ? verifiedCompleted[k] : boolStates[k] === true;
      return {
        source: k,
        name: cfg.name,
        icon: cfg.icon,
        color: cfg.color,
        weight: cfg.weight,
        completed,
        description: ELECTRON_DESCRIPTIONS[k] ?? '',
        pillarRoute: ELECTRON_ROUTES[k] ?? '/kit',
      };
    });

  // Reconciliar electron_logs para los verificados: si hay drift entre lo
  // derivado y el ledger (raro), corregirlo idempotentemente. Esto mantiene
  // honestos tanto el score del día como el rank acumulado.
  // Fire-and-forget: no bloquea el compile si la reconciliación falla.
  reconcileVerifiedLedger(userId, today, verifiedCompleted).catch(e => {
    logWarn('[compileDay] reconcileVerifiedLedger failed', e);
  });

  // Quantitative electrons
  const proteinTotal = (foodRes.data ?? []).reduce((s: number, r: any) => s + (Number(r.protein_g) || 0), 0);
  const waterTotal = Number(hydRes.data?.total_ml) || 0;

  const quantitativeElectrons: QuantElectronState[] = activeQuantKeys
    .filter(k => (ELECTRON_WEIGHTS as any)[k] && QUANT_CONFIG[k])
    .map(k => {
      const cfg = (ELECTRON_WEIGHTS as any)[k];
      const qc = QUANT_CONFIG[k];
      let current = 0;
      if (k === 'protein') current = proteinTotal;
      else if (k === 'water') current = waterTotal;
      return {
        source: k, name: cfg.name, icon: cfg.icon, color: cfg.color, weight: cfg.weight,
        current, target: qc.target, unit: qc.unit,
        displayCurrent: fmtQuant(k, current),
        displayTarget: fmtQuant(k, qc.target),
      };
    });

  // Progress
  let earned = 0, possible = 0;
  for (const e of booleanElectrons) { possible += e.weight; if (e.completed) earned += e.weight; }
  for (const e of quantitativeElectrons) { possible += e.weight; earned += e.weight * Math.min(1, e.target > 0 ? e.current / e.target : 0); }
  earned = Math.round(earned * 10) / 10;
  possible = Math.round(possible * 10) / 10;
  const percentage = possible > 0 ? Math.round((earned / possible) * 100) : 0;

  // Next electron
  const nextElectron = pickNextElectron(booleanElectrons, quantitativeElectrons, hour);
  onProgress?.(80, 'Compilando energía');

  // Suggestion
  const suggestion = buildSuggestion(quantitativeElectrons, fastRes.data?.[0], hour, crossPillar);

  // Agenda
  const agendaItems = await buildAgenda(userId, today, hour, protocol, fastRes.data?.[0], crossPillar, wakeFromPrefs);
  onProgress?.(95, 'Generando agenda');

  // Greeting
  const greeting = hour < 12 ? 'Buenos días,' : hour < 18 ? 'Buenas tardes,' : 'Buenas noches,';
  const date = formatDisplayDate(today);

  onProgress?.(100, 'Listo');
  return {
    greeting, date, userName, protocol,
    electronProgress: { earned, possible, percentage },
    nextElectron, booleanElectrons, quantitativeElectrons,
    suggestion, agendaItems,
  };
}

// ═══ HELPERS ═══

/**
 * Para los electrones verificados, alinea `electron_logs` con la actividad
 * real del día. Solo escribe cuando hay desajuste (raro): si el usuario
 * completó la actividad pero no hay log → award; si el log existe pero la
 * actividad fue borrada → revoke. Ambos helpers son idempotentes.
 */
async function reconcileVerifiedLedger(
  userId: string,
  date: string,
  desired: Record<string, boolean>,
): Promise<void> {
  const keys = Object.keys(desired);
  if (keys.length === 0) return;
  const { data, error } = await supabase
    .from('electron_logs')
    .select('source')
    .eq('user_id', userId)
    .eq('date', date)
    .in('source', keys);
  if (error) {
    logWarn('[compileDay] reconcile select failed', error);
    return;
  }
  const awarded = new Set((data ?? []).map((r: any) => r.source as string));
  for (const [src, completed] of Object.entries(desired)) {
    if (completed && !awarded.has(src)) {
      await awardBooleanElectron(userId, src as ElectronSource);
    } else if (!completed && awarded.has(src)) {
      await revokeBooleanElectron(userId, src as ElectronSource);
    }
  }
}

function fmtQuant(key: string, v: number): string {
  if (key === 'protein') return `${Math.round(v)}g`;
  if (key === 'water') return v >= 1000 ? `${(v / 1000).toFixed(1)}L` : `${v}ml`;
  if (key === 'steps') return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`;
  if (key === 'sleep') return `${Math.floor(v)}h`;
  return `${v}`;
}

function pickNextElectron(bools: BoolElectronState[], quants: QuantElectronState[], hour: number): NextElectron | null {
  const pending = bools.filter(e => !e.completed).map(e => {
    const w = TIME_WINDOWS[e.source] ?? [0, 23];
    const inWindow = hour >= w[0] && hour <= w[1];
    return { ...e, score: (inWindow ? 1000 : 0) + e.weight };
  }).sort((a, b) => b.score - a.score);

  if (pending.length > 0) {
    const n = pending[0];
    return { source: n.source, name: n.name, description: n.description, weight: n.weight, icon: n.icon, color: n.color };
  }

  const pq = quants.filter(e => e.current < e.target).sort((a, b) => (a.current / a.target) - (b.current / b.target));
  if (pq.length > 0) {
    const n = pq[0];
    return { source: n.source, name: n.name, description: `Te faltan ${fmtQuant(n.source, n.target - n.current)} para tu meta`, weight: n.weight, icon: n.icon, color: n.color };
  }

  return null;
}

/**
 * Devuelve UNA sugerencia. Orden de prioridad (de más a menos urgente):
 *   1. Glucosa elevada reciente  → caminata post-comida (señal de salud)
 *   2. Mood bajo reciente         → respiración/meditación regenerativa
 *   3. Ayuno completado           → recordatorio de romper ayuno
 *   4. Fase lútea/menstrual       → ajuste energético (solo si no hay urgencias)
 *   5. Proteína <50% tras mediodía → meta cuantitativa
 *   6. Agua <30% tras 10am         → meta cuantitativa
 */
function buildSuggestion(
  quants: QuantElectronState[],
  activeFast: any,
  hour: number,
  cross: CrossPillar,
): Suggestion | null {
  // 1. Glucosa elevada (señal de salud — pesa más que metas)
  if (cross.lastGlucose?.isHigh) {
    return {
      text: `Glucosa elevada (${cross.lastGlucose.value} mg/dL). Caminar 10 min ayuda a metabolizarla.`,
      action: 'Ver salud',
      route: '/my-health',
    };
  }

  // 2. Mood bajo (regenerativo, no exigir)
  if (cross.mood?.isLow) {
    return {
      text: 'Notamos un check-in con energía baja. Una respiración guiada puede ayudar.',
      action: 'Respiración 5 min',
      route: '/mind-hub',
    };
  }

  // 3. Ayuno completado
  if (activeFast) {
    const elapsed = (Date.now() - new Date(activeFast.fast_start).getTime()) / 3600000;
    if (elapsed >= (activeFast.target_hours ?? 16)) {
      return { text: `¡Ayuno completado! Ya puedes romper el ayuno.`, action: 'Ir a Ayuno', route: '/fasting' };
    }
  }

  // 4. Fase lútea/menstrual — recordatorio de ajuste energético
  if (cross.cyclePhase?.phase === 'luteal' || cross.cyclePhase?.phase === 'menstrual') {
    const phaseLabel = cross.cyclePhase.phase === 'luteal' ? 'lútea' : 'menstrual';
    return {
      text: `Estás en fase ${phaseLabel} (día ${cross.cyclePhase.cycleDay}). Reduce intensidad del ejercicio y prioriza descanso.`,
      action: 'Ver ciclo',
      route: '/cycle',
    };
  }

  // 5. Proteína baja
  const protein = quants.find(q => q.source === 'protein');
  if (protein && protein.current < protein.target * 0.5 && hour > 12) {
    return { text: `Te faltan ${Math.round(protein.target - protein.current)}g de proteína.`, action: 'Registrar comida', route: '/food-register' };
  }
  // 6. Agua baja
  const water = quants.find(q => q.source === 'water');
  if (water && water.current < water.target * 0.3 && hour > 10) {
    return { text: `Llevas ${water.displayCurrent} de agua. Hidratación afecta energía.`, action: 'Ir a Nutrición', route: '/nutrition' };
  }

  return null;
}

/**
 * Carga señales cross-pillar resumidas. Cualquier campo puede ser null
 * si no hay data o el usuario no trackea la fuente. Todo silencioso —
 * no rompe HOY si falla.
 *
 * Criterios de "señal":
 *  - mood bajo: pleasantness <= 4 (escala 1-10) o quadrant 'low_unpleasant',
 *    y el check-in es de las últimas 24h (si no, ya no es señal accionable).
 *  - glucosa alta: depende del contexto del registro:
 *      'fasting' o 'pre_meal' → > 110 mg/dL
 *      'post_meal' (2h)       → > 160 mg/dL
 *      'random' / sin contexto → > 140 mg/dL
 *    Solo si el registro es de las últimas 6h.
 */
async function deriveCrossPillar(
  userId: string,
  moodRow: any,
  glucoseRow: any,
  biologicalSex: string | null,
): Promise<CrossPillar> {
  const cross: CrossPillar = { mood: null, lastGlucose: null, cyclePhase: null };

  // Mood: válido si es de las últimas 24h
  if (moodRow?.created_at) {
    const ageHours = (Date.now() - new Date(moodRow.created_at).getTime()) / 3600000;
    if (ageHours <= 24) {
      const pleasantness = Number(moodRow.pleasantness) || 0;
      const quadrant = String(moodRow.quadrant || '');
      const isLow = pleasantness > 0 && pleasantness <= 4 || quadrant === 'low_unpleasant';
      cross.mood = { pleasantness, quadrant, isLow };
    }
  }

  // Glucosa: válida si es de las últimas 6h
  if (glucoseRow?.value_mg_dl != null && glucoseRow?.created_at) {
    const ageHours = (Date.now() - new Date(glucoseRow.created_at).getTime()) / 3600000;
    if (ageHours <= 6) {
      const value = Number(glucoseRow.value_mg_dl);
      const ctx = (glucoseRow.context as string | null) ?? null;
      let threshold = 140; // random / sin contexto
      if (ctx === 'fasting' || ctx === 'pre_meal') threshold = 110;
      else if (ctx === 'post_meal') threshold = 160;
      cross.lastGlucose = { value, context: ctx, isHigh: value > threshold };
    }
  }

  // Ciclo: gate por sexo biológico — solo derivar para usuarias femeninas.
  // Para male/null/undefined no se consulta ni anota nada de ciclo.
  if (biologicalSex === 'female') {
    try {
      const info = await getCycleInfo(userId);
      if (info) cross.cyclePhase = { phase: info.currentPhase, cycleDay: info.currentDay };
    } catch { /* opcional */ }
  }

  return cross;
}

async function buildAgenda(
  userId: string,
  today: string,
  hour: number,
  protocol: CompiledDay['protocol'],
  activeFast: any,
  cross: CrossPillar,
  /** F03.7: wake_time editado desde protocol-config (vive en user_day_preferences.goals). */
  wakeFromPrefs?: string,
): Promise<AgendaItem[]> {
  const items: AgendaItem[] = [];

  // F03.7: prioridad de wake_time:
  //   1. user_day_preferences.goals.wake_time (lo que el usuario edita en
  //      protocol-config — fuente más reciente).
  //   2. user_chronotype.schedule.wake_time (set en onboarding).
  //   3. fallback '07:00'.
  let wakeTime = '07:00';
  if (wakeFromPrefs) {
    wakeTime = wakeFromPrefs;
  } else {
    try {
      const { data: chrono } = await supabase
        .from('user_chronotype').select('schedule')
        .eq('user_id', userId).maybeSingle();
      if (chrono?.schedule?.wake_time) wakeTime = chrono.schedule.wake_time;
    } catch { /* default 07:00 */ }
  }

  // === PROTOCOLO → cargar plan del día (o generarlo si no existe) ===
  try {
    let planActions: any[] = [];

    // Paso 1: ¿ya hay un plan generado para hoy en daily_plans?
    const { data } = await supabase
      .from('daily_plans').select('actions')
      .eq('user_id', userId).eq('date', today).maybeSingle();

    if (data?.actions && Array.isArray(data.actions) && data.actions.length > 0) {
      planActions = data.actions;
    } else if (protocol) {
      // Paso 2: no hay plan → generar desde protocolos activos via generateDailyPlan
      // Esto lee user_protocols → protocol_templates.default_actions → compila timeline → guarda en daily_plans
      try {
        const generated = await generateDailyPlan(userId, today);
        if (generated?.actions && Array.isArray(generated.actions)) {
          planActions = generated.actions;
        }
      } catch (e) {
        console.warn('buildAgenda: generateDailyPlan error (no fatal)', e);
      }
    }

    // Paso 3: convertir acciones del plan a agenda items
    for (const a of planActions) {
      if (isElectronAction(a)) continue;
      // PlanAction usa scheduled_time; fallback a default_time y time por compatibilidad
      let actionTime = a.scheduled_time || a.default_time || a.time;
      if (!actionTime) continue;

      // Ajustar horas de acciones de tipo "luz solar" al wake_time del usuario
      const nameLow = (a.name ?? '').toLowerCase();
      if (nameLow.includes('luz solar') || nameLow.includes('sunlight')) {
        actionTime = wakeTime;
      }

      items.push({
        id: a.id ?? `p-${actionTime}`,
        time: actionTime,
        name: a.name ?? '',
        subtitle: a.protocol_name || protocol?.name,
        category: a.category ?? 'custom',
        completed: a.completed ?? false,
        isNext: false, isSmart: false,
      });
    }
  } catch (e) {
    console.warn('buildAgenda: daily_plans error', e);
  }

  // === SMART: romper ayuno ===
  if (activeFast) {
    const start = new Date(activeFast.fast_start);
    const target = activeFast.target_hours ?? 16;
    const breakTime = new Date(start.getTime() + target * 3600000);
    const bToday = toLocalDateString(breakTime);
    if (bToday <= today) {
      const hasBreak = items.some(i => (i.name || '').toLowerCase().includes('romper ayuno'));
      if (!hasBreak) {
        items.push({
          id: 'smart-fast-break',
          time: `${breakTime.getHours()}:${String(breakTime.getMinutes()).padStart(2, '0')}`,
          name: 'Romper ayuno',
          subtitle: `Ayuno ${target}h`,
          category: 'nutrition',
          completed: false, isNext: false, isSmart: true,
          route: '/fasting',
        });
      }
    }
  }

  // === CUSTOM actions from user preferences ===
  try {
    const { data: prefs } = await supabase.from('user_day_preferences').select('custom_agenda_actions').eq('user_id', userId).maybeSingle();
    const customs = (prefs?.custom_agenda_actions as any[]) ?? [];
    for (const c of customs) {
      if (c.name && c.time) {
        items.push({ id: c.id ?? `c-${c.time}`, time: c.time, name: c.name, category: 'custom', completed: false, isNext: false, isSmart: false });
      }
    }
  } catch { /* skip */ }

  // === COMIDAS (de meal_times configurado; informativas) ===
  try {
    const { mealTimes } = await getMealTimes(userId);
    items.push(...mealAgendaItems(mealTimes));
  } catch { /* sin meal_times → defaults ya los trae el servicio */ }

  // === SUEÑO objetivo (cronotipo; informativo) ===
  try {
    const { data: chrono } = await supabase
      .from('user_chronotype').select('schedule, sleep_time')
      .eq('user_id', userId).maybeSingle();
    const sleepRaw = (chrono as any)?.schedule?.sleep_time ?? (chrono as any)?.sleep_time;
    const sleepItem = sleepAgendaItem(sleepRaw);
    if (sleepItem) items.push(sleepItem);
  } catch { /* sin cronotipo → sin item de sueño */ }

  // === DEDUPLICATE + SORT + MARK NEXT ===
  const seen = new Set<string>();
  const deduped = items.filter(i => { const k = `${i.time}-${i.name}`.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });

  deduped.sort((a, b) => parseMinutes(a.time) - parseMinutes(b.time));

  const nowMin = hour * 60 + new Date().getMinutes();
  let foundNext = false;
  for (const i of deduped) {
    if (!i.completed && !i.informational && !foundNext && parseMinutes(i.time) >= nowMin - 30) {
      i.isNext = true;
      foundNext = true;
    }
  }

  // === ENRIQUECER subtitles con señales cross-pillar ===
  // No agrega ni quita items — solo anota items de ejercicio cuando hay
  // señal relevante (fase del ciclo lútea/menstrual o mood reciente bajo).
  for (const i of deduped) {
    const note = crossPillarNoteForItem(i, cross);
    if (note) {
      i.subtitle = i.subtitle ? `${i.subtitle} · ${note}` : note;
    }
  }

  return deduped;
}

const INTENSE_EXERCISE_KW = [
  'strength', 'fuerza', 'hiit', 'cardio intenso', 'sprint', 'powerlifting',
  'crossfit', 'pesas', 'pesado',
];

function crossPillarNoteForItem(item: AgendaItem, cross: CrossPillar): string | null {
  const nameLow = (item.name || '').toLowerCase();
  const isIntense = INTENSE_EXERCISE_KW.some(kw => nameLow.includes(kw));
  if (!isIntense) return null;

  // Mood bajo → escuchar al cuerpo
  if (cross.mood?.isLow) {
    return 'Mood bajo hoy — escucha al cuerpo, ajusta intensidad';
  }
  // Fase lútea/menstrual → moderar
  if (cross.cyclePhase?.phase === 'luteal') {
    return 'Fase lútea — reduce volumen ~25%';
  }
  if (cross.cyclePhase?.phase === 'menstrual') {
    return 'Fase menstrual — intensidad suave (~40% menos)';
  }
  return null;
}

function isElectronAction(a: any): boolean {
  // Solo filtrar acciones que son goals de todo el día SIN hora.
  // Si tiene scheduled_time, SIEMPRE va en agenda aunque mencione una keyword.
  if (a.scheduled_time) return false;
  const name = (a.name ?? '').toLowerCase();
  const PURE_GOAL_KW = ['pasos', 'steps', 'proteína', 'protein', 'agua', 'water', 'hidratación', 'dormir', 'sleep', 'sueño'];
  return PURE_GOAL_KW.some(kw => name.includes(kw));
}

function parseMinutes(time: string): number {
  const [h, m] = time.replace(/[^0-9:]/g, '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatTime(t: string): string {
  const parts = t.split(':');
  let h = parseInt(parts[0] ?? '0', 10);
  const m = parts[1] ?? '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return '--';
  const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
  const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}
