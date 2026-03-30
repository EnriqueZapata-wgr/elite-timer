/**
 * Protocol Builder Service — Generador de plan diario, toggle, compliance.
 *
 * Flujo: user_protocols activos → acciones ajustadas por cronotipo → daily_plan.
 * Compatible con sistema legacy (003_daily_protocols RPCs) como fallback.
 */
import { supabase } from '@/src/lib/supabase';

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
  const targetDate = date || new Date().toISOString().split('T')[0];

  // Verificar si ya existe
  if (!force) {
    const { data: existing } = await supabase
      .from('daily_plans').select('*')
      .eq('user_id', userId).eq('date', targetDate).single();
    if (existing) return existing as DailyPlan;
  }

  // Obtener protocolos activos
  const { data: activeProtocols } = await supabase
    .from('user_protocols').select('*, template:protocol_templates(*)')
    .eq('user_id', userId).eq('status', 'active');

  if (!activeProtocols?.length) return null;

  // Obtener cronotipo
  const { data: chrono } = await supabase
    .from('user_chronotype').select('chronotype')
    .eq('user_id', userId).single();
  const chronoType = chrono?.chronotype || 'bear';

  // Recopilar acciones de todos los protocolos
  let allActions: PlanAction[] = [];

  for (const up of activeProtocols) {
    const actions = up.custom_actions || up.template?.default_actions || [];
    const currentPhase = up.current_phase || 1;

    for (const action of actions) {
      if (action.phase && action.phase > currentPhase) continue;
      const offset = action.chronotype_offsets?.[chronoType] || 0;
      const adjustedTime = adjustTime(action.default_time || '08:00', offset);

      allActions.push({
        id: generateUUID(),
        name: action.name,
        category: action.category,
        scheduled_time: adjustedTime,
        duration_min: action.duration_min || 10,
        instructions: action.instructions || '',
        link_type: action.link_type || null,
        protocol_name: up.name,
        protocol_id: up.id,
        completed: false,
        completed_at: null,
        skipped: false,
        order: 0,
      });
    }
  }

  // Deduplicar
  allActions = deduplicateActions(allActions);

  // Ordenar por hora y asignar order
  allActions.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  allActions.forEach((a, i) => a.order = i + 1);

  // Guardar
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
  return data as DailyPlan;
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
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: plans } = await supabase
    .from('daily_plans').select('date, compliance_pct, total_actions, completed_actions, actions')
    .eq('user_id', userId).gte('date', startDate.toISOString().split('T')[0])
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

  // Racha
  let streak = 0;
  for (const plan of [...plans].reverse()) {
    if (plan.compliance_pct >= 75) streak++;
    else break;
  }

  return {
    daily: plans.map(p => ({ date: p.date, compliance: p.compliance_pct, completed: p.completed_actions, total: p.total_actions })),
    mostCompleted: sorted[0] ? { name: sorted[0].name, pct: sorted[0].pct } : null,
    leastCompleted: sorted.length > 1 ? { name: sorted[sorted.length - 1].name, pct: sorted[sorted.length - 1].pct } : null,
    streak,
    avgCompliance: Math.round(plans.reduce((s, p) => s + p.compliance_pct, 0) / plans.length),
  };
}

// === RESET DAY ===

export async function resetDay(userId: string, date: string): Promise<DailyPlan | null> {
  await supabase.from('daily_plans').delete().eq('user_id', userId).eq('date', date);
  return generateDailyPlan(userId, date, true);
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

function deduplicateActions(actions: PlanAction[]): PlanAction[] {
  const seen = new Map<string, boolean>();
  return actions.filter(a => {
    const key = a.name.toLowerCase().replace(/\d+\s*min/gi, '').trim() + '|' + a.category;
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
