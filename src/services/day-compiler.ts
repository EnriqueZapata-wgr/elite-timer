/**
 * Day Compiler — Cerebro de la pantalla HOY.
 *
 * compileDay() recopila todos los datos del día (protocolos, electrones,
 * nutrición, ayuno, etc.) y devuelve un objeto unificado listo para renderizar.
 */
import { supabase } from '@/src/lib/supabase';
import { getLocalToday, getLocalHour } from '@/src/utils/date-helpers';
import { ELECTRON_WEIGHTS, type ElectronSource } from '@/src/constants/electrons';
import { generateDailyPlan } from '@/src/services/protocol-builder-service';

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
}

// ═══ DEFAULTS ═══

const DEFAULT_BOOLEANS = ['sunlight', 'meditation', 'supplements', 'cold_shower', 'grounding', 'no_alcohol'];
const DEFAULT_QUANTS = ['protein', 'water'];

const QUANT_CONFIG: Record<string, { target: number; unit: string }> = {
  protein: { target: 150, unit: 'g' },
  steps:   { target: 10000, unit: 'pasos' },
  water:   { target: 3000, unit: 'ml' },
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

export async function compileDay(userId: string): Promise<CompiledDay> {
  const today = getLocalToday();
  const hour = getLocalHour();

  // Parallelizar queries
  const [prefsRes, dailyERes, userRes, protRes, foodRes, hydRes, fastRes] = await Promise.all([
    supabase.from('user_day_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('daily_electrons').select('electrons').eq('user_id', userId).eq('date', today).maybeSingle(),
    supabase.auth.getUser(),
    supabase.from('user_protocols').select('*, template:protocol_templates(name, duration_weeks)').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1),
    supabase.from('food_logs').select('protein_g').eq('user_id', userId).eq('date', today),
    supabase.from('hydration_logs').select('total_ml').eq('user_id', userId).eq('date', today).maybeSingle(),
    supabase.from('fasting_logs').select('fast_start, target_hours').eq('user_id', userId).eq('status', 'active').limit(1),
  ]);

  const prefs = prefsRes.data;
  const boolStates = (dailyERes.data?.electrons as Record<string, boolean>) ?? {};
  const userName = userRes.data.user?.user_metadata?.full_name?.split(' ')[0]?.toUpperCase() ?? 'ATLETA';

  const activeBoolKeys: string[] = prefs?.active_boolean_electrons ?? DEFAULT_BOOLEANS;
  const activeQuantKeys: string[] = (prefs?.active_quantitative_electrons ?? DEFAULT_QUANTS)
    .filter((k: string) => k !== 'steps' && k !== 'sleep'); // Sin fuente hasta wearables

  // Protocol
  let protocol: CompiledDay['protocol'] = null;
  const prot = protRes.data?.[0];
  if (prot) {
    const startDate = new Date(prot.started_at ?? prot.created_at);
    const dayNum = Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / 86400000) + 1);
    const totalDays = (prot.template?.duration_weeks ?? 12) * 7;
    protocol = { name: prot.name ?? prot.template?.name ?? 'Protocolo', dayNumber: dayNum, totalDays };
  }

  // Boolean electrons
  const booleanElectrons: BoolElectronState[] = activeBoolKeys
    .filter(k => (ELECTRON_WEIGHTS as any)[k])
    .map(k => {
      const cfg = (ELECTRON_WEIGHTS as any)[k];
      return {
        source: k,
        name: cfg.name,
        icon: cfg.icon,
        color: cfg.color,
        weight: cfg.weight,
        completed: boolStates[k] === true,
        description: ELECTRON_DESCRIPTIONS[k] ?? '',
        pillarRoute: ELECTRON_ROUTES[k] ?? '/kit',
      };
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

  // Suggestion
  const suggestion = buildSuggestion(quantitativeElectrons, fastRes.data?.[0], hour);

  // Agenda
  const agendaItems = await buildAgenda(userId, today, hour, protocol, fastRes.data?.[0]);

  // Greeting
  const greeting = hour < 12 ? 'Buenos días,' : hour < 18 ? 'Buenas tardes,' : 'Buenas noches,';
  const date = formatDisplayDate(today);

  return {
    greeting, date, userName, protocol,
    electronProgress: { earned, possible, percentage },
    nextElectron, booleanElectrons, quantitativeElectrons,
    suggestion, agendaItems,
  };
}

// ═══ HELPERS ═══

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

function buildSuggestion(quants: QuantElectronState[], activeFast: any, hour: number): Suggestion | null {
  const protein = quants.find(q => q.source === 'protein');
  if (protein && protein.current < protein.target * 0.5 && hour > 12) {
    return { text: `Te faltan ${Math.round(protein.target - protein.current)}g de proteína.`, action: 'Registrar comida', route: '/food-register' };
  }
  const water = quants.find(q => q.source === 'water');
  if (water && water.current < water.target * 0.3 && hour > 10) {
    return { text: `Llevas ${water.displayCurrent} de agua. Hidratación afecta energía.`, action: 'Ir a Nutrición', route: '/nutrition' };
  }
  if (activeFast) {
    const elapsed = (Date.now() - new Date(activeFast.fast_start).getTime()) / 3600000;
    if (elapsed >= (activeFast.target_hours ?? 16)) {
      return { text: `¡Ayuno completado! Ya puedes romper el ayuno.`, action: 'Ir a Ayuno', route: '/fasting' };
    }
  }
  return null;
}

async function buildAgenda(userId: string, today: string, hour: number, protocol: CompiledDay['protocol'], activeFast: any): Promise<AgendaItem[]> {
  const items: AgendaItem[] = [];

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
      const actionTime = a.scheduled_time || a.default_time || a.time;
      if (!actionTime) continue;
      items.push({
        id: a.id ?? `p-${actionTime}`,
        time: formatTime(actionTime),
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
    const bToday = breakTime.toISOString().split('T')[0];
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

  // === DEDUPLICATE + SORT + MARK NEXT ===
  const seen = new Set<string>();
  const deduped = items.filter(i => { const k = `${i.time}-${i.name}`.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });

  deduped.sort((a, b) => parseMinutes(a.time) - parseMinutes(b.time));

  const nowMin = hour * 60 + new Date().getMinutes();
  let foundNext = false;
  for (const i of deduped) {
    if (!i.completed && !foundNext && parseMinutes(i.time) >= nowMin - 30) {
      i.isNext = true;
      foundNext = true;
    }
  }

  return deduped;
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
  const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
  const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}
