/**
 * ATP AI Service — Análisis diagnóstico con IA del expediente del cliente.
 *
 * Recopila todos los datos del cliente y genera un prompt estructurado
 * para Claude, que retorna un reporte clínico.
 */
import { supabase } from '@/src/lib/supabase';
import Constants from 'expo-constants';

interface ClientFullData {
  profile: any;
  conditions: any[];
  latestMeasurements: any;
  latestLabs: any;
  medications: any[];
  supplements: any[];
  familyHistory: any[];
  recentCheckins: any[];
}

// Recopilar TODOS los datos del cliente en paralelo
async function gatherClientData(clientId: string): Promise<ClientFullData> {
  const [profileRes, conditionsRes, measurementsRes, labsRes, medsRes, suppsRes, familyRes, checkinsRes] = await Promise.all([
    supabase.from('client_profiles').select('*').eq('user_id', clientId).single(),
    supabase.from('condition_flags').select('*').eq('user_id', clientId),
    supabase.from('body_measurements').select('*').eq('user_id', clientId).order('measured_at', { ascending: false }).limit(1),
    supabase.from('lab_results').select('*').eq('user_id', clientId).order('lab_date', { ascending: false }).limit(1),
    supabase.from('medications').select('*').eq('user_id', clientId).eq('is_active', true),
    supabase.from('supplement_protocols').select('*').eq('user_id', clientId).eq('is_active', true),
    supabase.from('family_history').select('*').eq('user_id', clientId),
    supabase.from('emotional_checkins').select('*').eq('user_id', clientId).order('created_at', { ascending: false }).limit(10),
  ]);

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

/** Llamar a Claude API para análisis */
export async function askAtpAI(clientId: string, customQuestion?: string): Promise<string> {
  const apiKey = Constants.expoConfig?.extra?.anthropicApiKey
    || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  if (!apiKey) {
    return '⚠️ API key de Anthropic no configurada.\n\nAgrega EXPO_PUBLIC_ANTHROPIC_API_KEY a tu archivo .env para habilitar ATP AI.';
  }

  const data = await gatherClientData(clientId);
  const prompt = buildPrompt(data, customQuestion);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error de API: ${response.status} — ${err}`);
  }

  const result = await response.json();
  return result.content?.map((c: any) => c.text || '').join('\n') || 'No se pudo generar el análisis.';
}
