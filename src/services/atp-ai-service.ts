/**
 * ATP AI Service — Análisis diagnóstico con IA del expediente del cliente.
 *
 * Recopila todos los datos del cliente y genera un prompt estructurado
 * para Claude, que retorna un reporte clínico.
 */
import { supabase } from '@/src/lib/supabase';
import { callAnthropic } from '@/src/services/anthropic-client';

interface ClientFullData {
  profile: any;
  conditions: any[];
  latestMeasurements: any;
  latestLabs: any;
  medications: any[];
  supplements: any[];
  familyHistory: any[];
  recentCheckins: any[];
  consultations: any[];
  dailyHabits: any[];
  clinicalStudies: any[];
  nutritionPlan: any;
  recentFoodLogs: any[];
  activeProtocols: any[];
  complianceStats: any;
}

// Recopilar TODOS los datos del cliente en paralelo
async function gatherClientData(clientId: string): Promise<ClientFullData> {
  const [profileRes, conditionsRes, measurementsRes, labsRes, medsRes, suppsRes, familyRes, checkinsRes, consultsRes, habitsRes, studiesRes, nutritionPlanRes, foodLogsRes] = await Promise.all([
    supabase.from('client_profiles').select('*').eq('user_id', clientId).single(),
    supabase.from('condition_flags').select('*').eq('user_id', clientId),
    supabase.from('body_measurements').select('*').eq('user_id', clientId).order('measured_at', { ascending: false }).limit(1),
    supabase.from('lab_results').select('*').eq('user_id', clientId).order('lab_date', { ascending: false }).limit(1),
    supabase.from('medications').select('*').eq('user_id', clientId).eq('is_active', true),
    supabase.from('supplement_protocols').select('*').eq('user_id', clientId).eq('is_active', true),
    supabase.from('family_history').select('*').eq('user_id', clientId),
    supabase.from('emotional_checkins').select('*').eq('user_id', clientId).order('created_at', { ascending: false }).limit(10),
    supabase.from('consultations').select('consultation_number, consultation_date, status, chief_complaint, assessment, plan, changes_summary, body_snapshot, conditions_snapshot').eq('client_id', clientId).eq('status', 'completed').order('consultation_date', { ascending: false }).limit(5),
    supabase.from('client_daily_habits').select('start_time, end_time, title, category').eq('user_id', clientId).eq('is_current', true).order('start_time'),
    supabase.from('clinical_studies').select('study_name, study_type, study_date, original_interpretation, findings, coach_notes').eq('user_id', clientId).order('study_date', { ascending: false }).limit(10),
    supabase.from('nutrition_plans').select('*').eq('user_id', clientId).eq('status', 'active').limit(1).single(),
    supabase.from('food_logs').select('date, meal_type, description, ai_analysis').eq('user_id', clientId).order('date', { ascending: false }).limit(21),
  ]);

  // Protocolos y compliance (tablas nuevas — pueden no existir aún)
  let activeProtocols: any[] = [];
  let complianceStats: any = null;
  try {
    const protRes = await supabase.from('user_protocols').select('name, status, current_phase, started_at, template:protocol_templates(name, tier, category)')
      .eq('user_id', clientId).eq('status', 'active');
    activeProtocols = protRes.data || [];

    const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const planRes = await supabase.from('daily_plans').select('date, compliance_pct, total_actions, completed_actions, actions')
      .eq('user_id', clientId).gte('date', twoWeeksAgo.toISOString().split('T')[0]).order('date');
    if (planRes.data?.length) {
      const plans = planRes.data;
      const avg = Math.round(plans.reduce((s: number, p: any) => s + (p.compliance_pct || 0), 0) / plans.length);
      let streak = 0;
      for (const p of [...plans].reverse()) { if (p.compliance_pct >= 75) streak++; else break; }
      complianceStats = { avgCompliance: avg, streak, days: plans.length };
    }
  } catch { /* tablas 029 aún no ejecutadas */ }

  const { data: profileBasic } = await supabase.from('profiles').select('full_name, email').eq('id', clientId).single();

  return {
    profile: { ...profileRes.data, ...profileBasic },
    conditions: conditionsRes.data || [],
    latestMeasurements: measurementsRes.data?.[0] || null,
    latestLabs: labsRes.data?.[0] || null,
    medications: medsRes.data || [],
    supplements: suppsRes.data || [],
    familyHistory: familyRes.data || [],
    recentCheckins: checkinsRes.data || [],
    consultations: consultsRes.data || [],
    dailyHabits: habitsRes.data || [],
    clinicalStudies: studiesRes.data || [],
    nutritionPlan: nutritionPlanRes.data ?? null,
    recentFoodLogs: foodLogsRes.data || [],
    activeProtocols,
    complianceStats,
  };
}

function buildPrompt(data: ClientFullData, customQuestion?: string): string {
  const { profile, conditions, latestMeasurements, latestLabs, medications, supplements, familyHistory, recentCheckins } = data;

  let p = `Eres ATP AI, asistente de análisis clínico y rendimiento humano para coaches de salud y nutriólogos. Analiza el expediente y genera un reporte estructurado.

IMPORTANTE: Herramienta de apoyo para el profesional, NO sustituto. Usa rangos funcionales (medicina funcional), no solo convencionales. Responde en español.

## PACIENTE
Nombre: ${profile?.full_name || profile?.email || 'No registrado'}
Nacimiento: ${profile?.date_of_birth || 'No registrada'}
Sexo biológico: ${profile?.biological_sex || 'No registrado'}
Ocupación: ${profile?.occupation || 'No registrada'}
Objetivo: ${profile?.primary_goal || 'No definido'}
Secundarios: ${profile?.secondary_goals?.join(', ') || 'No definidos'}
Banderas rojas: ${profile?.red_flags || 'Ninguna'}
Estrés: ${profile?.stress_level || '—'}/10
Actividad: ${profile?.activity_level || '—'} | Ejercicio: ${profile?.exercise_type || '—'} ${profile?.exercise_frequency || '—'}d/sem
Dieta: ${profile?.diet_type || '—'} | Comidas: ${profile?.meals_per_day || '—'}/día | Ayuno: ${profile?.fasting_protocol || 'No'}
Agua: ${profile?.water_liters_day || '—'}L | Cafeína: ${profile?.caffeine_cups_day || '—'} tazas | Alcohol: ${profile?.alcohol_frequency || '—'}
Sueño: ${profile?.sleep_time_usual || '—'}-${profile?.wake_time_usual || '—'} (${profile?.sleep_hours_avg || '—'}h) Calidad: ${profile?.sleep_quality || '—'}/10
`;

  // Contexto de peso
  if (profile?.weight_highest_kg || profile?.weight_lowest_kg || profile?.weight_ideal_kg) {
    p += `\n## CONTEXTO DE PESO\n`;
    if (profile.weight_highest_kg) p += `Más alto: ${profile.weight_highest_kg}kg${profile.weight_highest_year ? ` (${profile.weight_highest_year})` : ''}\n`;
    if (profile.weight_lowest_kg) p += `Más bajo: ${profile.weight_lowest_kg}kg${profile.weight_lowest_year ? ` (${profile.weight_lowest_year})` : ''}\n`;
    if (profile.weight_ideal_kg) p += `Ideal (coach): ${profile.weight_ideal_kg}kg${profile.weight_ideal_notes ? ` — ${profile.weight_ideal_notes}` : ''}\n`;
    if (data.latestMeasurements?.weight_kg && profile.weight_ideal_kg) {
      p += `Diferencia actual vs ideal: ${(Number(data.latestMeasurements.weight_kg) - Number(profile.weight_ideal_kg)).toFixed(1)}kg\n`;
    }
  }

  if (profile?.grip_strength_kg || profile?.vo2_max || profile?.blood_pressure_sys) {
    p += `\n## BIOMARCADORES\n`;
    if (profile.grip_strength_kg) p += `Agarre: ${profile.grip_strength_kg}kg | `;
    if (profile.blood_pressure_sys) p += `PA: ${profile.blood_pressure_sys}/${profile.blood_pressure_dia} | `;
    if (profile.vo2_max) p += `VO2: ${profile.vo2_max} | `;
    if (profile.metabolic_age_impedance) p += `Edad metab: ${profile.metabolic_age_impedance}`;
    p += '\n';
  }

  if (latestMeasurements) {
    p += `\n## COMPOSICIÓN (${latestMeasurements.measured_at})\n`;
    const m = latestMeasurements;
    p += [m.weight_kg && `Peso:${m.weight_kg}kg`, m.body_fat_pct && `Grasa:${m.body_fat_pct}%`, m.muscle_mass_pct && `Músculo:${m.muscle_mass_pct}%`, m.visceral_fat && `Visceral:${m.visceral_fat}`, m.waist_cm && `Cintura:${m.waist_cm}cm`, m.body_water_pct && `Agua:${m.body_water_pct}%`].filter(Boolean).join(' | ') + '\n';
  }

  const active = conditions.filter(c => c.status !== 'not_evaluated');
  if (active.length > 0) {
    p += `\n## CONDICIONES\n`;
    const sm: Record<string, string> = { normal: '✓', observation: '⚠️', present: '🔴' };
    active.forEach(c => { p += `${sm[c.status] || ''} ${c.condition_key}${c.notes ? ` (${c.notes})` : ''}${c.medication ? ` [med:${c.medication}]` : ''}\n`; });
  }

  if (latestLabs) {
    p += `\n## LABS (${latestLabs.lab_date})\n`;
    const fields: [string, string, string][] = [
      ['glucose', 'Glucosa', 'mg/dL'], ['hba1c', 'HbA1c', '%'], ['insulin', 'Insulina', 'μUI/mL'], ['homa_ir', 'HOMA-IR', ''],
      ['cholesterol_total', 'Col.Total', 'mg/dL'], ['hdl', 'HDL', 'mg/dL'], ['ldl', 'LDL', 'mg/dL'], ['triglycerides', 'TG', 'mg/dL'],
      ['tsh', 'TSH', 'mUI/L'], ['t3_free', 'T3L', 'pg/mL'], ['t4_free', 'T4L', 'ng/dL'],
      ['testosterone', 'Testo', 'ng/dL'], ['cortisol', 'Cortisol', 'μg/dL'], ['vitamin_d', 'VitD', 'ng/mL'],
      ['ferritin', 'Ferritina', 'ng/mL'], ['pcr', 'PCR', 'mg/L'], ['homocysteine', 'Homocist', 'μmol/L'],
      ['alt', 'ALT', 'U/L'], ['ast', 'AST', 'U/L'], ['creatinine', 'Creat', 'mg/dL'], ['uric_acid', 'Ac.úrico', 'mg/dL'],
      ['hemoglobin', 'Hb', 'g/dL'],
    ];
    fields.forEach(([k, l, u]) => { if (latestLabs[k] != null) p += `${l}:${latestLabs[k]}${u} | `; });
    p += '\n';
  }

  if (medications.length > 0) {
    p += `\n## MEDICAMENTOS\n`;
    medications.forEach(m => { p += `- ${m.name}${m.dose ? ` ${m.dose}` : ''}${m.frequency ? ` (${m.frequency})` : ''}\n`; });
  }

  if (supplements.length > 0) {
    p += `\n## SUPLEMENTOS\n`;
    supplements.forEach(s => { p += `- ${s.name}${s.dose ? ` ${s.dose}` : ''}${s.frequency ? ` (${s.frequency})` : ''}\n`; });
  }

  if (familyHistory.length > 0) {
    p += `\n## ANTECEDENTES FAMILIARES\n`;
    familyHistory.forEach(f => { p += `- ${f.relation}: ${f.condition}\n`; });
  }

  if (recentCheckins.length > 0) {
    p += `\n## ESTADO EMOCIONAL RECIENTE\n`;
    recentCheckins.slice(0, 5).forEach(c => { p += `- ${c.quadrant} | ${c.emotions?.join(', ')} | ${new Date(c.created_at).toLocaleDateString()}\n`; });
  }

  if (profile?.coach_notes || profile?.nutrition_notes || profile?.action_plan) {
    p += `\n## NOTAS\n`;
    if (profile.coach_notes) p += `Coach: ${profile.coach_notes}\n`;
    if (profile.nutrition_notes) p += `Nutrición: ${profile.nutrition_notes}\n`;
    if (profile.action_plan) p += `Plan: ${profile.action_plan}\n`;
  }

  // Hábitos diarios
  if (data.dailyHabits.length > 0) {
    p += `\n## RUTINA DIARIA ACTUAL\n`;
    data.dailyHabits.forEach((h: any) => {
      p += `${h.start_time?.slice(0, 5)} - ${h.end_time?.slice(0, 5)}: ${h.title} (${h.category})\n`;
    });
    p += `\nAnaliza ventanas de oportunidad, hábitos perjudiciales, horarios de comida, sueño y oportunidades de biohacking.\n`;
  }

  // Histórico de consultas
  if (data.consultations.length > 0) {
    p += `\n## HISTÓRICO DE CONSULTAS\n`;
    data.consultations.forEach((c: any) => {
      const ch = c.changes_summary;
      p += `Consulta #${c.consultation_number} (${c.consultation_date})`;
      if (ch?.weight_change != null) p += ` | Peso: ${ch.weight_change > 0 ? '+' : ''}${ch.weight_change}kg`;
      if (ch?.fat_change != null) p += ` | Grasa: ${ch.fat_change > 0 ? '+' : ''}${ch.fat_change}%`;
      if (ch?.is_first) p += ' | Primera consulta';
      p += '\n';
      if (c.chief_complaint) p += `  Motivo: ${c.chief_complaint}\n`;
      if (c.assessment) p += `  Análisis: ${c.assessment.substring(0, 200)}\n`;
      if (c.plan) p += `  Plan: ${c.plan.substring(0, 200)}\n`;
    });
  }

  // Nutrición
  if (data.nutritionPlan) {
    const np = data.nutritionPlan;
    p += `\n## NUTRICIÓN\nPlan activo: ${np.name} (${np.diet_type ?? 'general'})`;
    if (np.calorie_target) p += `\nObjetivo: ${np.calorie_target}kcal, ${np.protein_target ?? '?'}g prot, ${np.carb_target ?? '?'}g carb, ${np.fat_target ?? '?'}g grasa`;
    if (np.fasting_hours) p += `\nAyuno: ${np.fasting_hours}h (${np.feeding_window_start ?? '?'}-${np.feeding_window_end ?? '?'})`;
    if (np.foods_to_avoid?.length) p += `\nEvitar: ${np.foods_to_avoid.join(', ')}`;
    if (np.foods_to_prioritize?.length) p += `\nPriorizar: ${np.foods_to_prioritize.join(', ')}`;
  }
  if (data.recentFoodLogs.length > 0) {
    p += `\n\nRegistro alimentario reciente (últimos 7 días):\n`;
    data.recentFoodLogs.slice(0, 14).forEach(f => {
      p += `- ${f.date} ${f.meal_type}: ${f.description}`;
      if (f.ai_analysis?.score) p += ` (score: ${f.ai_analysis.score}/100)`;
      if (f.ai_analysis?.red_flags?.length) p += ` ⚠️ ${f.ai_analysis.red_flags.join(', ')}`;
      p += '\n';
    });
  }

  // Protocolos activos y compliance
  if (data.activeProtocols.length > 0) {
    p += `\n## PROTOCOLOS ACTIVOS\n`;
    data.activeProtocols.forEach((up: any) => {
      p += `- ${up.name} (Fase ${up.current_phase}, desde ${new Date(up.started_at).toLocaleDateString()})`;
      if (up.template?.category) p += ` [${up.template.category}]`;
      p += '\n';
    });
    if (data.complianceStats) {
      p += `\nCompliance promedio 14 días: ${data.complianceStats.avgCompliance}%\n`;
      p += `Racha actual: ${data.complianceStats.streak} días\n`;
    }
  }

  // Estudios clínicos
  if (data.clinicalStudies.length > 0) {
    p += `\n## ESTUDIOS CLÍNICOS\nConsidera la fecha de cada estudio. Información más reciente tiene mayor relevancia clínica. Si un estudio tiene más de 1 año, señala que podría necesitar actualización.\n`;
    data.clinicalStudies.forEach(s => {
      p += `\n### ${s.study_name} (${s.study_date})\n`;
      if (s.original_interpretation) p += `Interpretación: ${s.original_interpretation.substring(0, 500)}\n`;
      if (s.findings?.length > 0) p += `Hallazgos: ${s.findings.join(', ')}\n`;
      if (s.coach_notes) p += `Notas del coach: ${s.coach_notes}\n`;
    });
  }

  if (customQuestion) {
    p += `\n## PREGUNTA DEL COACH\n${customQuestion}\nResponde específicamente basándote en el expediente.`;
  } else {
    p += `\n## GENERA REPORTE:
1. **RESUMEN CLÍNICO** (3-5 líneas)
2. **HALLAZGOS RELEVANTES** (priorizado, rangos funcionales)
3. **CONEXIONES Y PATRONES** (relaciones entre condiciones)
4. **SUGERENCIAS DE PROTOCOLO** (nutrición, ejercicio, suplementación, hábitos, monitoreo)
5. **ALERTAS** (banderas rojas, derivaciones)

Sé directo y concreto. Sin disclaimers genéricos.`;
  }

  return p;
}

/** Llamar a Claude via Edge Function proxy */
export async function askAtpAI(clientId: string, customQuestion?: string): Promise<string> {
  const data = await gatherClientData(clientId);
  const prompt = buildPrompt(data, customQuestion);

  const result = await callAnthropic(
    [{ role: 'user', content: prompt }],
    4000,
  );

  return result.content?.map((c: any) => c.text || '').join('\n') || 'No se pudo generar el análisis.';
}

// === AI REPORTS CRUD ===

export interface AiReport {
  id: string;
  client_id: string;
  coach_id: string;
  question: string | null;
  report: string;
  created_at: string;
}

/** Guardar reporte de IA */
export async function saveAiReport(clientId: string, report: string, question?: string): Promise<AiReport> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data, error } = await supabase
    .from('ai_reports')
    .insert({ client_id: clientId, coach_id: user.id, report, question: question || null })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as AiReport;
}

/** Obtener historial de reportes IA de un cliente */
export async function getAiReports(clientId: string, limit = 20): Promise<AiReport[]> {
  const { data } = await supabase
    .from('ai_reports')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as AiReport[];
}

/** Eliminar reporte IA */
export async function deleteAiReport(reportId: string): Promise<void> {
  const { error } = await supabase.from('ai_reports').delete().eq('id', reportId);
  if (error) throw new Error(error.message);
}
