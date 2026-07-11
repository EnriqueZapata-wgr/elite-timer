/**
 * Protocol Builder Service — Generador de plan diario, toggle, compliance.
 *
 * Flujo: user_protocols activos → acciones ajustadas por cronotipo → daily_plan.
 * Compatible con sistema legacy (003_daily_protocols RPCs) como fallback.
 */
import { getLocalToday, parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';
import { supabase } from '@/src/lib/supabase';
import { computeStreak, computeAvgCompliance } from '@/src/services/adherence-service';
import { emitDayComplete } from '@/src/services/community/feed-service';
import { isDayComplete } from '@/src/services/community/feed-core';
import { warn as logWarn } from '@/src/lib/logger';

// === TYPES ===

export interface DailyPlan {
  id: string;
  user_id: string;
  date: string;
  source_protocols: string[];
  chronotype: string | null;
  actions: PlanAction[];
  total_actions: number;
  completed_actions: number;
  compliance_pct: number;
  generated_at: string;
  /** #v13i — prohibiciones del día (action_type='restriction'); NO van al timeline, alimentan el banner. */
  restrictions?: any[];
}

export interface PlanAction {
  id: string;
  name: string;
  category: string;
  scheduled_time: string;
  duration_min: number;
  instructions: string;
  link_type: string | null;
  protocol_name: string;
  protocol_id?: string;
  completed: boolean;
  completed_at: string | null;
  skipped: boolean;
  order: number;
  /** #v13i — minutos de aviso antes del evento (default por categoría en el compiler). */
  notify_minutes_before?: number;
}

export interface UserProtocol {
  id: string;
  user_id: string;
  template_id: string | null;
  assigned_by: string | null;
  name: string;
  status: string;
  current_phase: number;
  custom_actions: any[] | null;
  started_at: string;
  source: string;
  template?: any;
}

export interface ComplianceStats {
  daily: { date: string; compliance: number; completed: number; total: number }[];
  mostCompleted: { name: string; pct: number } | null;
  leastCompleted: { name: string; pct: number } | null;
  streak: number;
  avgCompliance: number;
}

// === GENERAR PLAN DIARIO ===

export async function generateDailyPlan(userId: string, date?: string, force = false): Promise<DailyPlan | null> {
  const targetDate = date || getLocalToday();

  // Verificar si ya existe (si force=true, borrar el existente para regenerar limpio)
  if (!force) {
    const { data: existing } = await supabase
      .from('daily_plans').select('*')
      .eq('user_id', userId).eq('date', targetDate).single();
    if (existing) return existing as DailyPlan;
  } else {
    // Limpiar plan viejo antes de regenerar
    await supabase.from('daily_plans').delete()
      .eq('user_id', userId).eq('date', targetDate);
  }

  // Obtener SOLO el protocolo activo más reciente (evitar empalme de protocolos)
  const { data: activeProtocols } = await supabase
    .from('user_protocols').select('*, template:protocol_templates(*)')
    .eq('user_id', userId).eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!activeProtocols?.length) return null;

  // Obtener cronotipo
  const { data: chrono } = await supabase
    .from('user_chronotype').select('chronotype')
    .eq('user_id', userId).single();
  const chronoType = chrono?.chronotype || 'bear';

  // Recopilar acciones brutas de todos los protocolos
  const rawActions: { action: any; protocolName: string; protocolId: string }[] = [];
  for (const up of activeProtocols) {
    const actions = up.custom_actions || up.template?.default_actions || [];
    const currentPhase = up.current_phase || 1;
    for (const action of actions) {
      if (action.phase && action.phase > currentPhase) continue;
      rawActions.push({ action, protocolName: up.name, protocolId: up.id });
    }
  }

  // Compilar timeline inteligente (async: lee ventana de alimentación de preferencias).
  const { actions: allActions, restrictions } = await compileDailyTimeline(rawActions, chronoType, userId);

  // Guardar (restrictions se persiste aparte: la columna es de la migración 100).
  const plan = {
    user_id: userId,
    date: targetDate,
    source_protocols: activeProtocols.map(p => p.id),
    chronotype: chronoType,
    actions: allActions,
    total_actions: allActions.length,
    completed_actions: 0,
    compliance_pct: 0,
  };

  const { data, error } = await supabase
    .from('daily_plans').upsert(plan, { onConflict: 'user_id,date' })
    .select().single();

  if (error) throw error;

  // Persistir prohibiciones best-effort. Si daily_plans.restrictions aún no existe (migración 100
  // pendiente), no romper: el plan ya se guardó y el banner lee defensivamente.
  if (restrictions.length > 0) {
    const { error: rErr } = await supabase
      .from('daily_plans').update({ restrictions }).eq('id', (data as any).id);
    if (rErr) logWarn('[protocol-builder] restrictions no persistido (migración 100 pendiente)', rErr);
  }

  return { ...(data as DailyPlan), restrictions };
}

// === TOGGLE ACTION ===

export async function toggleAction(userId: string, date: string, actionId: string): Promise<DailyPlan> {
  const { data: plan } = await supabase
    .from('daily_plans').select('*')
    .eq('user_id', userId).eq('date', date).single();
  if (!plan) throw new Error('No hay plan para este día');

  const actions = (plan.actions as PlanAction[]).map(a => {
    if (a.id === actionId) {
      return { ...a, completed: !a.completed, completed_at: !a.completed ? new Date().toISOString() : null, skipped: false };
    }
    return a;
  });

  const completedCount = actions.filter(a => a.completed).length;
  const compliance = Math.round((completedCount / actions.length) * 100);

  const { data } = await supabase
    .from('daily_plans').update({ actions, completed_actions: completedCount, compliance_pct: compliance })
    .eq('id', plan.id).select().single();

  // Comunidad V1.1 §2.4: día completo (100%) → evento day_complete al feed
  // social. Fire-and-forget (emitDayComplete jamás lanza), payload no-clínico
  // (fecha + score) e idempotente por (user, fecha) — UNIQUE parcial de la 193.
  if (isDayComplete(compliance)) {
    void emitDayComplete(userId, date, compliance);
  }

  return data as DailyPlan;
}

// === SKIP ACTION ===

export async function skipAction(userId: string, date: string, actionId: string): Promise<DailyPlan> {
  const { data: plan } = await supabase
    .from('daily_plans').select('*')
    .eq('user_id', userId).eq('date', date).single();
  if (!plan) throw new Error('No hay plan para este día');

  const actions = (plan.actions as PlanAction[]).map(a => {
    if (a.id === actionId) return { ...a, skipped: true, completed: false, completed_at: null };
    return a;
  });

  const { data } = await supabase
    .from('daily_plans').update({ actions }).eq('id', plan.id).select().single();
  return data as DailyPlan;
}

// === ADD ACTION TO PLAN ===

export async function addActionToPlan(userId: string, date: string, action: Partial<PlanAction>): Promise<DailyPlan> {
  const { data: plan } = await supabase
    .from('daily_plans').select('*')
    .eq('user_id', userId).eq('date', date).single();
  if (!plan) throw new Error('No hay plan para este día');

  const newAction: PlanAction = {
    id: generateUUID(),
    name: action.name || 'Nueva acción',
    category: action.category || 'optimization',
    scheduled_time: action.scheduled_time || '12:00',
    duration_min: action.duration_min || 10,
    instructions: action.instructions || '',
    link_type: action.link_type || null,
    protocol_name: 'Manual',
    completed: false,
    completed_at: null,
    skipped: false,
    order: 0,
  };

  const actions = [...(plan.actions as PlanAction[]), newAction]
    .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
    .map((a, i) => ({ ...a, order: i + 1 }));

  const { data } = await supabase
    .from('daily_plans').update({ actions, total_actions: actions.length })
    .eq('id', plan.id).select().single();
  return data as DailyPlan;
}

// === REMOVE ACTION FROM PLAN ===

export async function removeActionFromPlan(userId: string, date: string, actionId: string): Promise<DailyPlan> {
  const { data: plan } = await supabase
    .from('daily_plans').select('*')
    .eq('user_id', userId).eq('date', date).single();
  if (!plan) throw new Error('No hay plan para este día');

  const actions = (plan.actions as PlanAction[])
    .filter(a => a.id !== actionId)
    .map((a, i) => ({ ...a, order: i + 1 }));

  const { data } = await supabase
    .from('daily_plans').update({ actions, total_actions: actions.length })
    .eq('id', plan.id).select().single();
  return data as DailyPlan;
}

// === ASSIGN PROTOCOL ===

export async function assignProtocol(userId: string, templateId: string, assignedBy: string | null, source = 'coach'): Promise<UserProtocol> {
  const { data: template } = await supabase
    .from('protocol_templates').select('name').eq('id', templateId).single();
  if (!template) throw new Error('Template no encontrado');

  // Desactivar cualquier protocolo activo previo (garantiza un solo activo por usuario)
  await supabase
    .from('user_protocols')
    .update({ status: 'abandoned' })
    .eq('user_id', userId)
    .eq('status', 'active');

  const { data, error } = await supabase
    .from('user_protocols').insert({
      user_id: userId, template_id: templateId, assigned_by: assignedBy,
      name: template.name, status: 'active', current_phase: 1, source,
    }).select().single();

  if (error) throw error;
  return data as UserProtocol;
}

// === GET USER PROTOCOLS ===

export async function getUserProtocols(userId: string): Promise<UserProtocol[]> {
  const { data } = await supabase
    .from('user_protocols').select('*, template:protocol_templates(name, tier, category, description, phases, duration_weeks)')
    .eq('user_id', userId).order('created_at', { ascending: false });
  return (data ?? []) as UserProtocol[];
}

// === GET PROTOCOL TEMPLATES ===

export async function getPublicTemplates(): Promise<any[]> {
  const { data } = await supabase
    .from('protocol_templates').select('*')
    .eq('is_public', true).order('tier');
  return data ?? [];
}

// === GET TODAY PLAN (fallback-aware) ===

export async function getTodayPlan(userId: string): Promise<{ source: 'new' | 'legacy' | null; plan: DailyPlan | null; legacyItems?: any[] }> {
  // Intentar sistema nuevo
  try {
    const plan = await generateDailyPlan(userId);
    if (plan && plan.actions.length > 0) return { source: 'new', plan };
  } catch { /* tablas no existen aún */ }

  // Fallback al sistema viejo (RPCs)
  try {
    const { data } = await supabase.rpc('get_today_timeline', { p_user_id: userId });
    if (data && data.length > 0) return { source: 'legacy', plan: null, legacyItems: data };
  } catch { /* RPCs no existen */ }

  return { source: null, plan: null };
}

// === COMPLIANCE STATS ===

export async function getComplianceStats(userId: string, days = 7): Promise<ComplianceStats | null> {
  const startDate = parseLocalDate(getLocalToday());
  startDate.setDate(startDate.getDate() - days);

  const { data: plans } = await supabase
    .from('daily_plans').select('date, compliance_pct, total_actions, completed_actions, actions')
    .eq('user_id', userId).gte('date', toLocalDateString(startDate))
    .order('date');

  if (!plans?.length) return null;

  // Stats por acción
  const actionStats: Record<string, { name: string; completed: number; total: number }> = {};
  for (const plan of plans) {
    for (const action of (plan.actions as PlanAction[] || [])) {
      const key = action.name.toLowerCase().replace(/\d+\s*min/gi, '').trim();
      if (!actionStats[key]) actionStats[key] = { name: action.name, completed: 0, total: 0 };
      actionStats[key].total++;
      if (action.completed) actionStats[key].completed++;
    }
  }

  const sorted = Object.values(actionStats)
    .map(a => ({ ...a, pct: a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);

  return {
    daily: plans.map(p => ({ date: p.date, compliance: p.compliance_pct, completed: p.completed_actions, total: p.total_actions })),
    mostCompleted: sorted[0] ? { name: sorted[0].name, pct: sorted[0].pct } : null,
    leastCompleted: sorted.length > 1 ? { name: sorted[sorted.length - 1].name, pct: sorted[sorted.length - 1].pct } : null,
    streak: computeStreak(plans),
    avgCompliance: computeAvgCompliance(plans),
  };
}

// === RESET DAY ===

export async function resetDay(userId: string, date: string): Promise<DailyPlan | null> {
  await supabase.from('daily_plans').delete().eq('user_id', userId).eq('date', date);
  return generateDailyPlan(userId, date, true);
}

// ═══ COMPILADOR INTELIGENTE DE TIMELINE ═══

async function compileDailyTimeline(
  rawActions: { action: any; protocolName: string; protocolId: string }[],
  chronotype: string,
  userId: string,
): Promise<{ actions: PlanAction[]; restrictions: any[] }> {
  // #v13i B.2 — separar prohibiciones (action_type='restriction'): NO van al timeline, van al banner.
  const restrictions: any[] = [];
  const timelineRaw = rawActions.filter((r) => {
    if (r.action?.action_type === 'restriction') { restrictions.push(r.action); return false; }
    return true;
  });

  // Clasificar cada acción
  const classified = timelineRaw.map(r => ({
    ...r.action,
    protocolName: r.protocolName,
    protocolId: r.protocolId,
    actionType: classifyAction(r.action.name, r.action.category, r.action.default_time),
  }));

  // Separar suplementos del resto
  const suppsAM = classified.filter(a => a.actionType === 'supplement_am');
  const suppsPM = classified.filter(a => a.actionType === 'supplement_pm');
  const rest = classified.filter(a => !a.actionType.startsWith('supplement'));

  // Deduplicar no-suplementos por nombre normalizado
  const deduped = smartDeduplicate(rest);

  // Crear tarjetas fusionadas de suplementos
  let compiled: PlanAction[] = [];
  if (suppsAM.length > 0) compiled.push(mergeSupplements(suppsAM, 'AM'));
  if (suppsPM.length > 0) compiled.push(mergeSupplements(suppsPM, 'PM'));

  // Convertir deduplicados a PlanAction (A.2 — notify default por categoría si el template no trae)
  for (const a of deduped) {
    compiled.push({
      id: generateUUID(),
      name: a.name,
      category: mapCategory(a.category),
      scheduled_time: a.default_time || '08:00',
      duration_min: a.duration_min || 10,
      instructions: a.instructions || '',
      link_type: a.link_type || null,
      protocol_name: a.protocolName,
      protocol_id: a.protocolId,
      completed: false, completed_at: null, skipped: false,
      order: getSortPriority(a.actionType),
      notify_minutes_before: a.notify_minutes_before ?? DEFAULT_NOTIFY_MIN[a.actionType] ?? 0,
    });
  }

  // Detectar ventana de alimentación (A.3 — protocolo → user_day_preferences → default 16:8)
  const feedingWindow = await detectFeedingWindow(classified, userId);

  // Ajustar comidas existentes a la ventana
  if (feedingWindow) {
    for (const action of compiled) {
      if (classifyAction(action.name, action.category, action.scheduled_time) !== 'meal') continue;
      const min = timeToMinutes(action.scheduled_time);
      const start = timeToMinutes(feedingWindow.start);
      const end = timeToMinutes(feedingWindow.end);
      if (min < start) {
        action.scheduled_time = feedingWindow.start;
        if (action.name.toLowerCase().includes('desayuno')) action.name = 'Romper ayuno — comida limpia';
      } else if (min > end) {
        action.scheduled_time = feedingWindow.end;
      }
    }
    // A.4 — asegurar 2ª/3ª comida si la ventana lo permite
    compiled = ensureMeals(compiled, feedingWindow);
  }

  // A.5 — rellenar huecos diurnos >4h con hidratación (opcional, eliminable desde /agenda)
  compiled = fillDaytimeGaps(compiled);

  // Aplicar cronotipo (solo a acciones ajustables — no nocturnas fijas ni auto-generadas)
  const chronoOffset = { lion: -60, bear: 0, wolf: 90, dolphin: 0 }[chronotype] || 0;
  if (chronoOffset !== 0) {
    for (const action of compiled) {
      const type = classifyAction(action.name, action.category, action.scheduled_time);
      if (['sleep', 'sleep_prep'].includes(type)) continue;          // rutina nocturna fija
      if ((action.protocol_name || '').startsWith('Auto')) continue; // comidas/fillers auto = ventana absoluta
      action.scheduled_time = adjustTime(action.scheduled_time, chronoOffset);
    }
  }

  // A.1 — resolver conflictos de horario (misma HH:MM → separar +5min según prioridad)
  resolveTimeConflicts(compiled);

  // Ordenar por hora + prioridad de slot
  compiled.sort((a, b) => {
    const ta = timeToMinutes(a.scheduled_time);
    const tb = timeToMinutes(b.scheduled_time);
    if (ta !== tb) return ta - tb;
    return (a.order || 0) - (b.order || 0);
  });

  // Forzar orden de rutina nocturna (después de 20:00)
  enforceNightOrder(compiled);

  // Forzar dormir como última
  const sleepIdx = compiled.findIndex(a => classifyAction(a.name, a.category, a.scheduled_time) === 'sleep');
  if (sleepIdx !== -1 && sleepIdx < compiled.length - 1) {
    const [sleep] = compiled.splice(sleepIdx, 1);
    compiled.push(sleep);
  }

  // Asignar order final
  compiled.forEach((a, i) => a.order = i + 1);

  // Limitar a 15
  return { actions: compiled.slice(0, 15), restrictions };
}

// #v13i A.2 — defaults de aviso (minutos antes) por tipo de acción clasificado.
const DEFAULT_NOTIFY_MIN: Record<string, number> = {
  meal: 15,
  exercise: 30,
  supplement_am: 5,
  supplement_pm: 5,
  sleep: 30,
  meditation: 5,
  breathing: 5,
  sunlight: 0,
  hydration: 0,
  journaling: 5,
  sleep_prep: 5,
  social: 15,
  other: 0,
};

// #v13i A.1 — prioridad para resolver conflictos de hora (mayor = conserva su slot).
function actionPriority(a: PlanAction): number {
  const t = classifyAction(a.name, a.category, a.scheduled_time);
  const rank: Record<string, number> = {
    other: 100,        // acción nombrada genérica — máxima
    sleep: 95,         // dormir ancla el final
    meal: 70,
    exercise: 60,
    meditation: 58, breathing: 58, journaling: 58,
    supplement_am: 50, supplement_pm: 50,
    social: 45,
    hydration: 40,
    sunlight: 30,
    sleep_prep: 20,
  };
  return rank[t] ?? 80;
}

// #v13i A.1 — separar eventos que caen en la misma HH:MM en +5min escalonado.
function resolveTimeConflicts(actions: PlanAction[]): void {
  const byTime = new Map<string, PlanAction[]>();
  for (const a of actions) {
    const t = a.scheduled_time;
    if (!byTime.has(t)) byTime.set(t, []);
    byTime.get(t)!.push(a);
  }
  for (const [time, group] of byTime) {
    if (group.length <= 1) continue;
    group.sort((a, b) => actionPriority(b) - actionPriority(a)); // mayor prioridad se queda
    let offset = 5;
    for (let i = 1; i < group.length; i++) {
      group[i].scheduled_time = addMinutesToTime(time, offset);
      offset += 5;
    }
  }
}

function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

// #v13i A.4 — si hay ventana de alimentación pero <3 comidas, insertar las que falten.
function ensureMeals(actions: PlanAction[], feedingWindow: { start: string; end: string }): PlanAction[] {
  const meals = actions.filter(a => classifyAction(a.name, a.category, a.scheduled_time) === 'meal');
  if (meals.length >= 3) return actions;

  const startMin = timeToMinutes(feedingWindow.start);
  const endMin = timeToMinutes(feedingWindow.end);
  const windowLen = endMin - startMin;

  const desiredMeals: { name: string; timeMin: number }[] = [];
  if (meals.length === 0) {
    desiredMeals.push({ name: 'Romper ayuno — comida limpia', timeMin: startMin });
    desiredMeals.push({ name: 'Comida principal', timeMin: startMin + Math.floor(windowLen * 0.5) });
    desiredMeals.push({ name: 'Cena ligera', timeMin: endMin - 60 });
  } else if (meals.length === 1) {
    const firstMealMin = timeToMinutes(meals[0].scheduled_time);
    desiredMeals.push({ name: 'Comida principal', timeMin: firstMealMin + Math.max(240, Math.floor(windowLen * 0.4)) });
    desiredMeals.push({ name: 'Cena ligera', timeMin: endMin - 60 });
  } else if (meals.length === 2) {
    const middle = Math.floor((timeToMinutes(meals[0].scheduled_time) + timeToMinutes(meals[1].scheduled_time)) / 2);
    desiredMeals.push({ name: 'Snack proteico', timeMin: middle });
  }

  const newMeals: PlanAction[] = desiredMeals.map(m => ({
    id: generateUUID(),
    name: m.name,
    category: 'nutrition',
    scheduled_time: minutesToTime(m.timeMin),
    duration_min: 15,
    instructions: 'Proteína + grasas + vegetales. Ajustar cantidad al hambre real.',
    link_type: 'food_scan',
    protocol_name: 'Auto (feeding window)',
    completed: false, completed_at: null, skipped: false,
    order: 50,
    notify_minutes_before: 15,
  }));

  return [...actions, ...newMeals];
}

// #v13i A.5 — rellenar huecos diurnos (9-20h) mayores a 4h con un recordatorio de hidratación.
function fillDaytimeGaps(actions: PlanAction[]): PlanAction[] {
  const dayActions = actions
    .filter(a => {
      const t = timeToMinutes(a.scheduled_time);
      return t >= 9 * 60 && t <= 20 * 60;
    })
    .sort((a, b) => timeToMinutes(a.scheduled_time) - timeToMinutes(b.scheduled_time));

  const fillers: PlanAction[] = [];
  for (let i = 0; i < dayActions.length - 1; i++) {
    const gap = timeToMinutes(dayActions[i + 1].scheduled_time) - timeToMinutes(dayActions[i].scheduled_time);
    if (gap < 240) continue; // <4h, sin filler
    const midMin = timeToMinutes(dayActions[i].scheduled_time) + Math.floor(gap / 2);
    fillers.push({
      id: generateUUID(),
      name: 'Hidratación · vaso de agua',
      category: 'nutrition',
      scheduled_time: minutesToTime(midMin),
      duration_min: 2,
      instructions: 'Vaso de agua con pizca de sal. Mantén el metabolismo despierto.',
      link_type: null,
      protocol_name: 'Auto (gap filler)',
      completed: false, completed_at: null, skipped: false,
      order: 55,
      notify_minutes_before: 0,
    });
  }
  return [...actions, ...fillers];
}

// Clasificar acción por nombre
function classifyAction(name: string, category: string, time?: string): string {
  const n = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const hour = parseInt((time || '12:00').split(':')[0]);

  const suppWords = ['suplemento', 'coq10', 'ubiquinol', 'omega', 'magnesio', 'ashwagandha',
    'vitamina', 'zinc', 'berberina', 'creatina', 'teanina', 'glutamina', 'pqq', 'carnitina',
    'colageno', 'lion', 'bacopa', 'rhodiola', 'egcg', 'melatonina', 'probiotico', 'colina',
    'complejo b', 'enzimas', 'butirato', 'glicina', 'inulina', 'psyllium', 'fibra prebiotica',
    'stack hormonal'];
  if (suppWords.some(w => n.includes(w))) return hour < 14 ? 'supplement_am' : 'supplement_pm';
  if (n.includes('luz solar') || n.includes('sunlight')) return 'sunlight';
  if (n.includes('hidratacion') || (n.includes('agua') && !n.includes('fria'))) return 'hydration';
  if (n.includes('dormir') && !n.includes('pantalla')) return 'sleep';
  if (n.includes('pantalla') || n.includes('screen')) return 'sleep_prep';
  if (n.includes('meditacion')) return 'meditation';
  if (n.includes('respiracion') || n.includes('box') || n.includes('4-7-8')) return 'breathing';
  if (n.includes('journal')) return 'journaling';
  if (n.includes('desayuno') || n.includes('comida') || n.includes('cena') || n.includes('ayuno') ||
      n.includes('romper') || n.includes('ventana') || n.includes('caldo') || n.includes('proteina')) return 'meal';
  if (n.includes('entrenamiento') || n.includes('fuerza') || n.includes('hiit') || n.includes('caminata') ||
      n.includes('caminar') || n.includes('ejercicio') || n.includes('movilidad') || n.includes('stretching') ||
      n.includes('frio') || n.includes('fria') || n.includes('cold') || n.includes('foam') || n.includes('grounding')) return 'exercise';
  if (n.includes('conexion social') || n.includes('social')) return 'social';
  return 'other';
}

function getSortPriority(type: string): number {
  return { sunlight: 10, hydration: 20, supplement_am: 30, breathing: 40, meal: 50,
    exercise: 60, social: 70, other: 80, journaling: 140, sleep_prep: 150,
    supplement_pm: 160, meditation: 170, sleep: 200 }[type] || 80;
}

// Fusionar suplementos en una tarjeta
function mergeSupplements(supps: any[], period: 'AM' | 'PM'): PlanAction {
  const hours = supps.map(s => parseInt((s.default_time || '08:00').split(':')[0]));
  const avgH = Math.round(hours.reduce((a: number, b: number) => a + b, 0) / hours.length);
  const time = `${String(avgH).padStart(2, '0')}:${period === 'AM' ? '15' : '30'}`;

  // Construir instrucciones fusionadas con cada suplemento
  let instructions = `Tomar con ${period === 'AM' ? 'el desayuno' : 'la cena'}:\n\n`;
  const seen = new Set<string>();
  for (const s of supps) {
    const key = s.name.toLowerCase().replace(/\d+\s*mg|\d+\s*g/gi, '').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    instructions += `• ${s.name}${s.instructions ? ' — ' + s.instructions.split('.')[0] : ''}\n`;
  }

  const protocols = [...new Set(supps.map((s: any) => s.protocolName))];

  return {
    id: generateUUID(),
    name: `Suplementos ${period}`,
    category: 'optimization',
    scheduled_time: time,
    duration_min: 5,
    instructions: instructions.trim(),
    link_type: null,
    protocol_name: protocols.join(', '),
    completed: false, completed_at: null, skipped: false,
    order: period === 'AM' ? 30 : 160,
    notify_minutes_before: 5,
  };
}

// Deduplicar acciones por nombre normalizado
function smartDeduplicate(actions: any[]): any[] {
  const seen = new Map<string, any>();
  for (const a of actions) {
    const key = (a.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\d+\s*min/gi, '').replace(/\s+/g, ' ').trim();
    if (!seen.has(key)) {
      seen.set(key, a);
    } else {
      // Fusionar: mantener instrucciones más largas y mayor duración
      const existing = seen.get(key)!;
      if ((a.instructions || '').length > (existing.instructions || '').length) {
        existing.instructions = a.instructions;
      }
      if ((a.duration_min || 0) > (existing.duration_min || 0)) {
        existing.duration_min = a.duration_min;
      }
    }
  }
  return Array.from(seen.values());
}

// #v13i A.3 — Ventana de alimentación: protocolo → user_day_preferences → default ATP 16:8.
async function detectFeedingWindow(actions: any[], userId: string): Promise<{ start: string; end: string } | null> {
  // 1) Desde el protocolo (ayuno declarado en una acción).
  const fasting = actions.find((a: any) => {
    const n = (a.name || '').toLowerCase();
    return n.includes('ayuno') && (n.includes('16') || n.includes('18') || n.includes('intermitente'));
  });
  if (fasting) {
    const n = (fasting.name || '').toLowerCase();
    if (n.includes('18')) return { start: '12:00', end: '18:00' };
    return { start: '12:00', end: '20:00' }; // 16:8
  }

  // 2) Fallback: preferencias del usuario (fasting_target_hours).
  try {
    const { data: prefs } = await supabase
      .from('user_day_preferences').select('goals')
      .eq('user_id', userId).maybeSingle();
    const fastingHours = (prefs?.goals as any)?.fasting_target_hours;
    if (typeof fastingHours === 'number' && fastingHours >= 12) {
      if (fastingHours >= 18) return { start: '12:00', end: '18:00' };
      if (fastingHours >= 16) return { start: '12:00', end: '20:00' };
      return { start: '10:00', end: '20:00' }; // 14h
    }
  } catch { /* sin prefs → default */ }

  // 3) Default ATP 16:8.
  return { start: '12:00', end: '20:00' };
}

// Forzar orden lógico en rutina nocturna
function enforceNightOrder(actions: PlanAction[]) {
  const nightStart = 20 * 60;
  const nightActions = actions.filter(a => timeToMinutes(a.scheduled_time) >= nightStart);
  if (nightActions.length <= 1) return;

  const order = ['journaling', 'social', 'other', 'sleep_prep', 'supplement_pm', 'breathing', 'meditation', 'sleep'];
  nightActions.sort((a, b) => {
    const ta = classifyAction(a.name, a.category, a.scheduled_time);
    const tb = classifyAction(b.name, b.category, b.scheduled_time);
    return (order.indexOf(ta) === -1 ? 5 : order.indexOf(ta)) - (order.indexOf(tb) === -1 ? 5 : order.indexOf(tb));
  });

  // Reasignar horas con 15 min de separación
  const firstMin = Math.min(...nightActions.map(a => timeToMinutes(a.scheduled_time)));
  let cur = firstMin;
  for (const a of nightActions) {
    a.scheduled_time = minutesToTime(cur);
    cur += 15;
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = (time || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Mapear categorías del JSON de protocolos al sistema
function mapCategory(cat: string): string {
  const map: Record<string, string> = {
    optimizacion: 'optimization', nutricion: 'nutrition', mente: 'mind',
    fitness: 'fitness', metricas: 'metrics', descanso: 'rest',
  };
  return map[cat] || cat;
}

// === HELPERS ===

export function adjustTime(timeStr: string, offsetMinutes: number): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  let totalMinutes = hours * 60 + (minutes || 0) + offsetMinutes;
  if (totalMinutes < 0) totalMinutes += 1440;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(Math.abs(m)).padStart(2, '0')}`;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
