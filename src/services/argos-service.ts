/**
 * ARGOS Service — Cerebro central de IA de ATP.
 * Chat contextual, insight diario, persistencia de conversaciones.
 * Usa callAnthropic (Supabase Edge Function proxy).
 */
import { supabase } from '@/src/lib/supabase';
import { callAnthropic } from './anthropic-client';
import { getLocalToday, parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';
import { ATP_LLM } from '@/src/constants/llm-config';
import { getHydrationStats } from './hydration-service';
import { getCycleInfo } from './cycle-service';

// === MODELOS ===
const MODEL_CHAT = ATP_LLM.PRIMARY_MODEL;
const MODEL_ESTIMATE = ATP_LLM.PRIMARY_MODEL;

// === METADATA (para logging en argos_logs vía Edge Function) ===
// Tier es placeholder hasta CC_PROMPT_006 (RevenueCat). Hoy lee user_metadata.tier o 'free'.
//
// Semántica de target:
//   - userId           = caller (paga la llamada). Si no se pasa, se resuelve via auth.uid.
//   - targetUserId     = cliente ATP cuando el caller es coach. NULL en self-use.
//   - targetProfileId  = shadow profile (sin cuenta ATP) cuando aplica. NULL en self-use.
//   Quien llama es responsable del "self-use collapse" (no pasar target == auth.uid).
export interface ArgosCallMetadata {
  userId?: string;
  tier?: string;
  requestType: string;
  targetUserId?: string | null;
  targetProfileId?: string | null;
}

export async function getArgosCallMetadata(opts?: {
  callerUserId?: string;
  targetUserId?: string | null;
  targetProfileId?: string | null;
  requestType?: string;
  tier?: string;
}): Promise<ArgosCallMetadata> {
  let userId = opts?.callerUserId;
  let tier = opts?.tier;
  if (!userId || !tier) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = userId ?? user?.id;
      tier = tier ?? ((user as any)?.user_metadata?.tier || 'free');
    } catch {
      // sin sesión — userId/tier quedan undefined; el log caerá como NULL/unknown
    }
  }
  return {
    userId,
    tier,
    requestType: opts?.requestType ?? 'chat',
    targetUserId: opts?.targetUserId ?? null,
    targetProfileId: opts?.targetProfileId ?? null,
  };
}

// === SYSTEM PROMPT BASE ===
const ARGOS_SYSTEM_PROMPT = `Eres ARGOS, el sistema de inteligencia en salud funcional de ATP.

## TU IDENTIDAD
- Tu nombre es ARGOS — el sistema de inteligencia en salud funcional de ATP
- Analizas TODO: nutrición, ejercicio, sueño, estrés, ciclo, glucosa, laboratorios
- Tu enfoque es INTEGRATIVO y FUNCIONAL — nunca das consejos aislados
- Correlacionas datos de diferentes pilares para dar insights únicos

## TU FILOSOFÍA
- "Si olvidaras tu edad, ¿cuántos años tendrías?" — la edad NO define el rendimiento
- Medicina funcional: buscar causas raíz, no solo tratar síntomas
- Rangos ÓPTIMOS, no solo "normales"
- Empoderar al usuario, nunca asustar
- Gamificación: todo se conecta con electrones y el ATP Score

## REGLAS DE COMPORTAMIENTO
1. Responde en español, tono cercano pero profesional
2. Siempre explica el POR QUÉ detrás de cada recomendación
3. NUNCA diagnostiques — di "esto podría indicar..." no "tienes..."
4. Si algo es grave, recomienda ver a un profesional de salud
5. Cuando sea relevante, menciona cómo afecta otros pilares (integrativo)
6. Sé conciso — el usuario está en su teléfono, no leyendo un libro
7. Usa emojis con moderación (máximo 2-3 por mensaje)
8. Si no tienes datos suficientes, pregunta antes de adivinar
9. Celebra los logros del usuario — cada electrón cuenta
10. Siempre cierra con una acción concreta que el usuario pueda hacer HOY

## REGLAS DE SAFETY (NO NEGOCIABLES)

- Si el usuario menciona síntomas de emergencia (dolor de pecho, dificultad respiratoria severa, ideación suicida, sangrado abundante, pérdida de consciencia, convulsiones), responde INMEDIATAMENTE recomendando contactar servicios médicos (911 en US, 911/065 en México, equivalente local) y NO ofreces sugerencias funcionales. Tu respuesta debe ser breve, clara, directiva: "Esto requiere atención médica inmediata. Por favor contacta servicios de emergencia ahora."

- Si el usuario menciona embarazo, lactancia, o condición médica diagnosticada (diabetes, hipertensión, cáncer, autoinmune, enfermedad renal o hepática), o está tomando medicamentos: ANTES de cualquier sugerencia funcional, recuerda que consulte con su médico tratante. Si la sugerencia podría interactuar (suplementos con medicamentos, ayuno con diabetes, ejercicio intenso post-parto, etc.) marca el riesgo explícitamente.

- Si el usuario pregunta directamente "¿eres médico?", "¿eres IA?", "¿eres real?" o equivalente, responde transparentemente: "Soy ARGOS, una inteligencia artificial de salud funcional dentro de ATP. No soy médico ni reemplazo atención profesional. Estoy diseñado para darte información educativa y conectar tus datos para encontrar patrones."

- Si el usuario te pide diagnóstico ("¿qué tengo?", "¿es X enfermedad?"), redirige: "No diagnostico. Lo que veo en tus datos podría sugerir [observación funcional], pero un médico o especialista es quien puede confirmar un diagnóstico."

## DESCARGO
Tus recomendaciones son educativas y basadas en ciencia publicada. NO sustituyen la atención médica profesional. Siempre que detectes algo potencialmente grave, recomienda consultar a un profesional de salud.`;

// === CONTEXTO DEL USUARIO ===

interface PersonalRecord {
  exercise: string;
  estimated1rm: number;
  weight: number;
  reps: number;
}

async function fetchUserPRs(userId: string): Promise<PersonalRecord[]> {
  try {
    const { data } = await supabase
      .from('personal_records')
      .select('exercise_id, estimated_1rm, weight_kg, reps, exercises(name, name_es)')
      .eq('user_id', userId)
      .order('estimated_1rm', { ascending: false })
      .limit(10);
    return (data || []).map((pr: any) => ({
      exercise: pr.exercises?.name_es || pr.exercises?.name || 'unknown',
      estimated1rm: pr.estimated_1rm,
      weight: pr.weight_kg,
      reps: pr.reps,
    }));
  } catch {
    return [];
  }
}

interface UserContext {
  name: string;
  age?: number;
  gender?: string;
  chronotype?: string;
  activeProtocol?: string;
  todayElectrons?: { earned: number; total: number };
  recentNutrition?: {
    todayCalories: number;
    todayProtein: number;
    mealsToday: number;
    avgCalories3d: number;
  };
  recentExercise?: { sessionsThisWeek: number };
  personalRecords?: PersonalRecord[];
  recentGlucose?: {
    lastValue: number;
    lastContext: string;
    readings: number;
  };
  currentFastingStatus?: {
    isFasting: boolean;
    hoursElapsed: number;
    targetHours: number;
  };
  rank?: string;
  bravermanProfile?: {
    dominant: string;
    primaryDeficiency: string;
    deficiencyLevel: string;
  };
  functionalQuizzes?: {
    quiz: string;
    scores: Record<string, number>;
    issues: string[];
  }[];
  recentMindSessions?: {
    meditationDaysLast7: number;
    breathworkDaysLast7: number;
    avgMinutes: number;
  };
  recentJournal?: {
    entriesLast7: number;
    lastEntryDate: string | null;
    dominantTag: string | null;
  };
  recentMood?: {
    avgPleasantness: number;
    trend: 'up' | 'down' | 'stable';
    lastCheckInAt: string | null;
    checkInsLast7: number;
  };
  cycleInfo?: {
    cycleDay: number;
    currentPhase: string;
    nextPeriodEstimate: string;
  };
  recentBodyMeasurements?: {
    lastWeightKg: number | null;
    lastBodyFatPct: number | null;
    weightTrend30d: 'up' | 'down' | 'stable' | 'no_data';
    lastMeasuredAt: string;
  };
  recentLabs?: {
    keyMarkers: { name: string; value: number; unit: string }[];
    lastUpdated: string;
  };
  todaySupplements?: {
    taken: string[];
    pending: string[];
  };
  hydrationStats?: {
    last7dAvgMl: number;
    todayProgressPct: number;
  };
  currentHealthScore?: {
    score: number;
    calculatedAt: string;
  };
}

async function loadUserContext(userId: string): Promise<UserContext> {
  const today = getLocalToday();
  const context: UserContext = { name: '' };

  try {
    // Perfil básico (profiles.full_name)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();
    if (profile) context.name = profile.full_name || '';
  } catch (_) { /* opcional */ }

  try {
    // Datos extendidos (client_profiles: date_of_birth, biological_sex)
    const { data: cp } = await supabase
      .from('client_profiles')
      .select('date_of_birth, biological_sex')
      .eq('user_id', userId)
      .maybeSingle();
    if (cp) {
      context.gender = cp.biological_sex || undefined;
      if (cp.date_of_birth) {
        const birth = new Date(cp.date_of_birth);
        context.age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      }
    }
  } catch (_) { /* opcional */ }

  try {
    // Cronotipo (user_chronotype)
    const { data: chrono } = await supabase
      .from('user_chronotype')
      .select('chronotype')
      .eq('user_id', userId)
      .maybeSingle();
    if (chrono) context.chronotype = chrono.chronotype;
  } catch (_) { /* opcional */ }

  try {
    // Protocolo activo (más reciente — defensa ante múltiples activos)
    const { data: protocol } = await supabase
      .from('user_protocols')
      .select('name, created_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (protocol) context.activeProtocol = protocol.name;
  } catch (_) { /* opcional */ }

  try {
    // Electrones de hoy
    const { data: electrons } = await supabase
      .from('electron_logs')
      .select('electrons')
      .eq('user_id', userId)
      .eq('date', today);
    const earned = (electrons || []).reduce((s, e) => s + Number(e.electrons), 0);
    context.todayElectrons = { earned: Math.round(earned * 10) / 10, total: 20 };
  } catch (_) { /* opcional */ }

  try {
    // Nutrición reciente (últimos 3 días)
    const threeDaysAgoCursor = parseLocalDate(getLocalToday());
    threeDaysAgoCursor.setDate(threeDaysAgoCursor.getDate() - 3);
    const threeDaysAgo = toLocalDateString(threeDaysAgoCursor);
    const { data: foods } = await supabase
      .from('food_logs')
      .select('calories, protein_g, date')
      .eq('user_id', userId)
      .gte('date', threeDaysAgo)
      .order('date', { ascending: false })
      .limit(15);
    if (foods && foods.length > 0) {
      const todayFoods = foods.filter(f => f.date === today);
      context.recentNutrition = {
        todayCalories: Math.round(todayFoods.reduce((s, f) => s + (f.calories || 0), 0)),
        todayProtein: Math.round(todayFoods.reduce((s, f) => s + (f.protein_g || 0), 0)),
        mealsToday: todayFoods.length,
        avgCalories3d: Math.round(foods.reduce((s, f) => s + (f.calories || 0), 0) / 3),
      };
    }
  } catch (_) { /* opcional */ }

  try {
    // Ejercicio reciente (última semana)
    const weekAgoCursor = parseLocalDate(getLocalToday());
    weekAgoCursor.setDate(weekAgoCursor.getDate() - 7);
    const weekAgo = toLocalDateString(weekAgoCursor);
    const { data: exercises } = await supabase
      .from('exercise_logs')
      .select('date')
      .eq('user_id', userId)
      .gte('date', weekAgo);
    const uniqueDays = new Set((exercises || []).map(e => e.date)).size;
    context.recentExercise = { sessionsThisWeek: uniqueDays };
  } catch (_) { /* opcional */ }

  try {
    // Récords personales (top por 1RM estimado)
    const prs = await fetchUserPRs(userId);
    if (prs.length > 0) context.personalRecords = prs;
  } catch (_) { /* opcional */ }

  try {
    // Glucosa reciente
    const { data: glucose } = await supabase
      .from('glucose_logs')
      .select('value_mg_dl, context, date')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (glucose && glucose.length > 0) {
      context.recentGlucose = {
        lastValue: glucose[0].value_mg_dl,
        lastContext: glucose[0].context,
        readings: glucose.length,
      };
    }
  } catch (_) { /* opcional */ }

  try {
    // Ayuno actual (fasting_logs: fast_start, target_hours, status)
    const { data: fast } = await supabase
      .from('fasting_logs')
      .select('fast_start, target_hours, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (fast?.fast_start) {
      const hoursElapsed = (Date.now() - new Date(fast.fast_start).getTime()) / (1000 * 60 * 60);
      context.currentFastingStatus = {
        isFasting: true,
        hoursElapsed: Math.round(hoursElapsed * 10) / 10,
        targetHours: fast.target_hours,
      };
    }
  } catch (_) { /* opcional */ }

  try {
    // Rango de electrones
    const { data: allElectrons } = await supabase
      .from('electron_logs')
      .select('electrons')
      .eq('user_id', userId);
    const total = (allElectrons || []).reduce((s, e) => s + Number(e.electrons), 0);
    if (total >= 2501) context.rank = 'Supernova';
    else if (total >= 1001) context.rank = 'Fusión';
    else if (total >= 501) context.rank = 'Reactor';
    else if (total >= 201) context.rank = 'Molécula';
    else if (total >= 51) context.rank = 'Átomo';
    else context.rank = 'Partícula';
  } catch (_) { /* opcional */ }

  try {
    // Braverman (perfil de neurotransmisores)
    const { data: braverman } = await supabase
      .from('braverman_results')
      .select('dominant_type, primary_deficiency, deficiency_level')
      .eq('user_id', userId)
      .eq('is_complete', true)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (braverman?.dominant_type) {
      context.bravermanProfile = {
        dominant: braverman.dominant_type,
        primaryDeficiency: braverman.primary_deficiency,
        deficiencyLevel: braverman.deficiency_level,
      };
    }
  } catch (_) { /* opcional */ }

  try {
    // Resultados de quizzes funcionales
    const { data: quizResults } = await supabase
      .from('functional_quiz_results')
      .select('quiz_id, domain_scores, active_insights')
      .eq('user_id', userId)
      .eq('is_complete', true)
      .order('completed_at', { ascending: false });
    if (quizResults && quizResults.length > 0) {
      context.functionalQuizzes = quizResults.map(r => ({
        quiz: r.quiz_id,
        scores: r.domain_scores as Record<string, number>,
        issues: (r.active_insights as any[])?.map((i: any) => i.title) || [],
      }));
    }
  } catch (_) { /* opcional */ }

  // UV actual (ATP SOL)
  try {
    const { getCurrentLocation, fetchUVData } = await import('./uv-service');
    const loc = await getCurrentLocation();
    if (loc) {
      const uv = await fetchUVData(loc.latitude, loc.longitude);
      if (uv) {
        (context as any).uvData = {
          current: uv.currentUV,
          max: uv.maxUV,
          maxTime: uv.maxUVTime,
          vitaminDWindow: uv.vitaminDWindow,
          dangerousFrom: uv.dangerousFrom,
          dangerousUntil: uv.dangerousUntil,
        };
      }
    }
  } catch (e) { /* UV opcional */ }

  // Rango 7 días para fuentes recientes (computado una vez)
  const sevenDaysAgoCursor = parseLocalDate(today);
  sevenDaysAgoCursor.setDate(sevenDaysAgoCursor.getDate() - 6);
  const sevenDaysAgo = toLocalDateString(sevenDaysAgoCursor);

  try {
    // Sesiones mente (últimos 7 días)
    const { data: mind } = await supabase
      .from('mind_sessions')
      .select('type, duration_seconds, date')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo);
    if (mind && mind.length > 0) {
      const meditationDays = new Set(mind.filter((m: any) => m.type === 'meditation').map((m: any) => m.date)).size;
      const breathworkDays = new Set(mind.filter((m: any) => m.type === 'breathing').map((m: any) => m.date)).size;
      const avgSec = mind.reduce((s: number, m: any) => s + (m.duration_seconds || 0), 0) / mind.length;
      context.recentMindSessions = {
        meditationDaysLast7: meditationDays,
        breathworkDaysLast7: breathworkDays,
        avgMinutes: Math.round(avgSec / 60),
      };
    }
  } catch (_) { /* opcional */ }

  try {
    // Journal (últimos 7 días)
    const { data: journal } = await supabase
      .from('journal_entries')
      .select('date, tags')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false });
    if (journal && journal.length > 0) {
      const tagCounts: Record<string, number> = {};
      for (const j of journal as any[]) {
        for (const t of (j.tags || [])) tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
      const dominantTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      context.recentJournal = {
        entriesLast7: journal.length,
        lastEntryDate: (journal[0] as any).date,
        dominantTag,
      };
    }
  } catch (_) { /* opcional */ }

  try {
    // Mood check-ins (últimos 7 días, usa created_at — no hay col `date`)
    const sinceISO = parseLocalDate(sevenDaysAgo).toISOString();
    const { data: checkins } = await supabase
      .from('emotional_checkins')
      .select('pleasantness, created_at')
      .eq('user_id', userId)
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: false });
    if (checkins && checkins.length > 0) {
      const values = (checkins as any[]).map(c => c.pleasantness).filter((v: any) => typeof v === 'number');
      const avg = values.length > 0 ? values.reduce((s: number, v: number) => s + v, 0) / values.length : 0;
      // trend: comparar primera mitad cronológica (más antigua) vs segunda (más reciente)
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (values.length >= 4) {
        const half = Math.floor(values.length / 2);
        const recent = values.slice(0, half).reduce((s, v) => s + v, 0) / half;
        const older = values.slice(-half).reduce((s, v) => s + v, 0) / half;
        if (recent - older >= 1) trend = 'up';
        else if (older - recent >= 1) trend = 'down';
      }
      context.recentMood = {
        avgPleasantness: Math.round(avg * 10) / 10,
        trend,
        lastCheckInAt: (checkins[0] as any).created_at,
        checkInsLast7: checkins.length,
      };
    }
  } catch (_) { /* opcional */ }

  // Ciclo menstrual — solo si gender indica femenino. Usa cycle-service
  // (única fuente de derivación de fase, fórmula proporcional al cycleLen).
  const isFemale = context.gender === 'female';
  if (isFemale) {
    try {
      const info = await getCycleInfo(userId);
      if (info) {
        context.cycleInfo = {
          cycleDay: info.currentDay,
          currentPhase: info.currentPhase,
          nextPeriodEstimate: toLocalDateString(info.prediction.date),
        };
      }
    } catch (_) { /* opcional */ }
  }

  try {
    // Medidas corporales (última + trend 30d)
    const { data: measurements } = await supabase
      .from('body_measurements')
      .select('measured_at, weight_kg, body_fat_pct')
      .eq('user_id', userId)
      .order('measured_at', { ascending: false })
      .limit(10);
    if (measurements && measurements.length > 0) {
      const last = measurements[0] as any;
      let trend: 'up' | 'down' | 'stable' | 'no_data' = 'no_data';
      if (measurements.length >= 2 && last.weight_kg) {
        const oldest = measurements[measurements.length - 1] as any;
        if (oldest.weight_kg) {
          const delta = last.weight_kg - oldest.weight_kg;
          if (delta >= 1) trend = 'up';
          else if (delta <= -1) trend = 'down';
          else trend = 'stable';
        }
      }
      context.recentBodyMeasurements = {
        lastWeightKg: last.weight_kg ?? null,
        lastBodyFatPct: last.body_fat_pct ?? null,
        weightTrend30d: trend,
        lastMeasuredAt: last.measured_at,
      };
    }
  } catch (_) { /* opcional */ }

  try {
    // Labs — último set
    const { data: labs } = await supabase
      .from('lab_results')
      .select('lab_date, vitamin_d, hba1c, ferritin, tsh, cholesterol_total, hdl, ldl, triglycerides, testosterone, estradiol, cortisol')
      .eq('user_id', userId)
      .order('lab_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (labs) {
      const l = labs as any;
      const candidates: { name: string; value: any; unit: string }[] = [
        { name: 'Vitamina D', value: l.vitamin_d, unit: 'ng/mL' },
        { name: 'HbA1c', value: l.hba1c, unit: '%' },
        { name: 'Ferritina', value: l.ferritin, unit: 'ng/mL' },
        { name: 'TSH', value: l.tsh, unit: 'mUI/L' },
        { name: 'Colesterol total', value: l.cholesterol_total, unit: 'mg/dL' },
        { name: 'HDL', value: l.hdl, unit: 'mg/dL' },
        { name: 'LDL', value: l.ldl, unit: 'mg/dL' },
        { name: 'Triglicéridos', value: l.triglycerides, unit: 'mg/dL' },
        { name: 'Testosterona', value: l.testosterone, unit: 'ng/dL' },
        { name: 'Estradiol', value: l.estradiol, unit: 'pg/mL' },
        { name: 'Cortisol', value: l.cortisol, unit: 'µg/dL' },
      ];
      const keyMarkers = candidates
        .filter(c => typeof c.value === 'number')
        .map(c => ({ name: c.name, value: c.value as number, unit: c.unit }));
      if (keyMarkers.length > 0 && l.lab_date) {
        context.recentLabs = { keyMarkers, lastUpdated: l.lab_date };
      }
    }
  } catch (_) { /* opcional */ }

  try {
    // Suplementos: activos + tomados hoy
    const [suppRes, logRes] = await Promise.all([
      supabase.from('user_supplements').select('id, name').eq('user_id', userId).eq('is_active', true),
      supabase.from('supplement_logs').select('supplement_id, taken').eq('user_id', userId).eq('date', today),
    ]);
    const active = (suppRes.data as any[]) || [];
    if (active.length > 0) {
      const takenIds = new Set(((logRes.data as any[]) || []).filter(l => l.taken).map(l => l.supplement_id));
      const taken: string[] = [];
      const pending: string[] = [];
      for (const s of active) {
        if (takenIds.has(s.id)) taken.push(s.name);
        else pending.push(s.name);
      }
      context.todaySupplements = { taken, pending };
    }
  } catch (_) { /* opcional */ }

  try {
    // Hidratación (reusar helper de hydration-service)
    const hydro = await getHydrationStats(userId);
    if (hydro) context.hydrationStats = hydro;
  } catch (_) { /* opcional */ }

  try {
    // Health score más reciente
    const { data: hs } = await supabase
      .from('health_scores')
      .select('functional_health_score, calculated_at')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (hs && typeof (hs as any).functional_health_score === 'number') {
      context.currentHealthScore = {
        score: Math.round((hs as any).functional_health_score),
        calculatedAt: (hs as any).calculated_at,
      };
    }
  } catch (_) { /* opcional */ }

  return context;
}

function buildContextPrompt(ctx: UserContext): string {
  const parts: string[] = [];
  if (ctx.name) parts.push(`Usuario: ${ctx.name}`);
  if (ctx.age) parts.push(`Edad: ${ctx.age} años`);
  if (ctx.gender) parts.push(`Género: ${ctx.gender}`);
  if (ctx.chronotype) parts.push(`Cronotipo: ${ctx.chronotype}`);
  if (ctx.activeProtocol) parts.push(`Protocolo activo: ${ctx.activeProtocol}`);
  if (ctx.rank) parts.push(`Rango: ${ctx.rank}`);
  if (ctx.todayElectrons) {
    parts.push(`Electrones hoy: ${ctx.todayElectrons.earned}/${ctx.todayElectrons.total}`);
  }
  if (ctx.recentNutrition) {
    const n = ctx.recentNutrition;
    parts.push(`Nutrición hoy: ${n.todayCalories} kcal, ${n.todayProtein}g proteína, ${n.mealsToday} comidas`);
    parts.push(`Promedio 3 días: ${n.avgCalories3d} kcal/día`);
  }
  if (ctx.recentExercise) {
    parts.push(`Ejercicio: ${ctx.recentExercise.sessionsThisWeek} sesiones esta semana`);
  }
  if (ctx.personalRecords?.length) {
    const prSummary = ctx.personalRecords.slice(0, 5).map(pr =>
      `${pr.exercise}: ${pr.estimated1rm}kg 1RM`
    ).join(', ');
    parts.push(`Récords (top 5): ${prSummary}`);
  }
  if (ctx.recentGlucose) {
    const g = ctx.recentGlucose;
    parts.push(`Última glucosa: ${g.lastValue} mg/dL (${g.lastContext})`);
  }
  if (ctx.currentFastingStatus?.isFasting) {
    const f = ctx.currentFastingStatus;
    parts.push(`Ayuno activo: ${f.hoursElapsed}h de ${f.targetHours}h objetivo`);
  }
  if (ctx.bravermanProfile) {
    const b = ctx.bravermanProfile;
    parts.push(`Perfil Braverman: Naturaleza dominante ${b.dominant}, deficiencia principal ${b.primaryDeficiency} (${b.deficiencyLevel})`);
  }
  if (ctx.functionalQuizzes?.length) {
    const quizSummary = ctx.functionalQuizzes.map(q => {
      const issues = q.issues.length > 0 ? q.issues.join(', ') : 'sin alertas';
      return `${q.quiz}: ${issues}`;
    }).join(' | ');
    parts.push(`Evaluaciones funcionales: ${quizSummary}`);
  }
  if ((ctx as any).uvData) {
    const uv = (ctx as any).uvData;
    parts.push(`UV actual: ${uv.current} (máx hoy: ${uv.max} a las ${uv.maxTime})`);
    if (uv.vitaminDWindow) parts.push(`Ventana vitamina D: ${uv.vitaminDWindow.start}-${uv.vitaminDWindow.end}`);
    if (uv.dangerousFrom) parts.push(`Protección necesaria: ${uv.dangerousFrom}-${uv.dangerousUntil}`);
  }
  if (ctx.recentMindSessions) {
    const m = ctx.recentMindSessions;
    parts.push(`Mente 7d: ${m.meditationDaysLast7}d meditación, ${m.breathworkDaysLast7}d respiración, ${m.avgMinutes} min/sesión`);
  }
  if (ctx.recentJournal) {
    const j = ctx.recentJournal;
    const tag = j.dominantTag ? `, tema dominante: ${j.dominantTag}` : '';
    parts.push(`Journal 7d: ${j.entriesLast7} entradas (última ${j.lastEntryDate})${tag}`);
  }
  if (ctx.recentMood) {
    const m = ctx.recentMood;
    parts.push(`Mood 7d: ${m.checkInsLast7} check-ins, promedio agrado ${m.avgPleasantness}/10, tendencia ${m.trend}`);
  }
  if (ctx.cycleInfo) {
    const c = ctx.cycleInfo;
    parts.push(`Ciclo: día ${c.cycleDay} (fase ${c.currentPhase}), próximo periodo ~${c.nextPeriodEstimate}`);
  }
  if (ctx.recentBodyMeasurements) {
    const b = ctx.recentBodyMeasurements;
    const w = b.lastWeightKg !== null ? `${b.lastWeightKg}kg` : 's/d';
    const bf = b.lastBodyFatPct !== null ? `, ${b.lastBodyFatPct}% grasa` : '';
    parts.push(`Última medición (${b.lastMeasuredAt}): ${w}${bf}, tendencia peso ${b.weightTrend30d}`);
  }
  if (ctx.recentLabs) {
    const markers = ctx.recentLabs.keyMarkers.map(m => `${m.name} ${m.value}${m.unit}`).join(', ');
    parts.push(`Labs (${ctx.recentLabs.lastUpdated}): ${markers}`);
  }
  if (ctx.todaySupplements) {
    const s = ctx.todaySupplements;
    const t = s.taken.length > 0 ? s.taken.join(', ') : 'ninguno';
    const p = s.pending.length > 0 ? s.pending.join(', ') : 'ninguno';
    parts.push(`Suplementos hoy: tomados [${t}], pendientes [${p}]`);
  }
  if (ctx.hydrationStats) {
    const h = ctx.hydrationStats;
    parts.push(`Hidratación: ${h.todayProgressPct}% meta hoy, promedio 7d ${h.last7dAvgMl}ml/día`);
  }
  if (ctx.currentHealthScore) {
    const hs = ctx.currentHealthScore;
    parts.push(`Health Score: ${hs.score} (${hs.calculatedAt.slice(0,10)})`);
  }
  if (parts.length === 0) return '';
  return `\n\n## DATOS ACTUALES DEL USUARIO\n${parts.join('\n')}`;
}

// === API CALLS ===

export interface ArgosMessage {
  role: 'user' | 'assistant';
  content: string;
  // ARG-2/ARG-3: turno marcado como degradado (rate-limited, ambos providers
  // cayeron, o error de cliente). Se muestra al usuario, pero NO se persiste
  // en `argos_conversations` ni se reenvía al LLM en turnos futuros — esos
  // textos contaminan el contexto (auto-refuerzan errores como atribuirle
  // "fase lútea" a un usuario hombre).
  degraded?: boolean;
}

export interface ArgosChatResult {
  text: string;
  degraded: boolean;
}

/**
 * Variante extendida de chatWithArgos. Retorna también si la respuesta vino
 * degradada (rate-limited, ambos providers caídos, o error de cliente).
 * El caller usa ese flag para NO persistir ni reenviar el turno en
 * conversaciones futuras (ver ARG-1/ARG-2).
 */
export async function chatWithArgosEx(
  userId: string,
  messages: ArgosMessage[],
  options?: { model?: string },
): Promise<ArgosChatResult> {
  const context = await loadUserContext(userId);
  const contextPrompt = buildContextPrompt(context);
  const systemPrompt = ARGOS_SYSTEM_PROMPT + contextPrompt;
  const model = options?.model || MODEL_CHAT;

  const meta = await getArgosCallMetadata({ requestType: 'chat' });
  let data;
  try {
    data = await callAnthropic(
      messages.map(m => ({ role: m.role, content: m.content })),
      1024,
      model,
      systemPrompt,
      meta,
    );
  } catch (e: any) {
    if (e?.message === 'ARGOS_TIMEOUT') {
      return {
        text: 'ARGOS está tardando más de lo normal, intenta de nuevo en un momento.',
        degraded: true,
      };
    }
    console.warn('ARGOS chat error:', e);
    return {
      text: 'Lo siento, no pude procesar tu consulta.',
      degraded: true,
    };
  }

  // ARG-3: el Edge Function marca con `_rate_limited` (circuit breaker diario)
  // o `_degraded` (ambos providers fallaron). `_fallback: true` significa que
  // Gemini respondió como fallback — eso NO es degradado, es éxito.
  const degraded = !!(data?._degraded || data?._rate_limited);
  const text = data?.content?.[0]?.text || 'Lo siento, no pude procesar tu consulta.';
  return { text, degraded: degraded || !data?.content?.[0]?.text };
}

/**
 * Wrapper de compatibilidad: retorna solo el texto. Los callers que no
 * necesitan distinguir respuestas degradadas siguen usando este.
 */
export async function chatWithArgos(
  userId: string,
  messages: ArgosMessage[],
  options?: { model?: string },
): Promise<string> {
  const result = await chatWithArgosEx(userId, messages, options);
  return result.text;
}

// === INSIGHT DIARIO ===

export async function generateDailyInsight(userId: string): Promise<string> {
  const context = await loadUserContext(userId);
  const contextPrompt = buildContextPrompt(context);

  const insightSystem = `Eres ARGOS, IA de salud funcional de ATP. Genera UN insight breve (máximo 2 oraciones) basado en los datos del usuario. Debe ser:
- Específico (usa los datos reales, no genérico)
- Accionable (qué puede hacer HOY)
- Integrativo (conecta 2+ pilares si es posible)
- Empoderador (no alarmista)
No uses emojis. No saludes. Ve directo al insight.${contextPrompt}`;

  try {
    const meta = await getArgosCallMetadata({ requestType: 'insight' });
    const data = await callAnthropic(
      [{ role: 'user', content: 'Dame el insight más relevante para hoy.' }],
      200,
      MODEL_ESTIMATE,
      insightSystem,
      meta,
    );
    return data?.content?.[0]?.text || '';
  } catch (e) {
    console.warn('ARGOS insight error:', e);
    return '';
  }
}

// === PERSISTENCIA DE CONVERSACIONES ===

export async function saveConversation(
  userId: string,
  messages: ArgosMessage[],
  existingId?: string | null,
): Promise<string | null> {
  const title = messages[0]?.content?.slice(0, 50) || 'Conversación';

  if (existingId) {
    // Actualizar conversación existente
    const { error } = await supabase
      .from('argos_conversations')
      .update({ messages, title, updated_at: new Date().toISOString() })
      .eq('id', existingId);
    if (error) console.error('Update conversation error:', error);
    return existingId;
  }

  // Crear nueva
  const { data, error } = await supabase
    .from('argos_conversations')
    .insert({
      user_id: userId,
      title,
      messages,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Save conversation error:', error);
    return null;
  }
  return data?.id || null;
}

export async function loadConversations(userId: string, limit: number = 20): Promise<any[]> {
  const { data } = await supabase
    .from('argos_conversations')
    .select('id, title, messages, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function loadConversation(conversationId: string): Promise<ArgosMessage[]> {
  const { data } = await supabase
    .from('argos_conversations')
    .select('messages')
    .eq('id', conversationId)
    .single();
  // ARG-7: validar shape en runtime — conversaciones viejas con JSONB malformado
  // no deben crashear el chat al abrirlas.
  const raw = data?.messages;
  if (!Array.isArray(raw)) return [];
  return raw.filter((m: any): m is ArgosMessage =>
    m != null &&
    typeof m === 'object' &&
    (m.role === 'user' || m.role === 'assistant') &&
    typeof m.content === 'string'
  );
}

// === GENERAR RUTINA ===

export interface GeneratedExercise {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
  method?: string;
}

export interface GeneratedRoutine {
  name: string;
  description: string;
  estimatedMinutes: number;
  warmup: GeneratedExercise[];
  main: GeneratedExercise[];
  cooldown: GeneratedExercise[];
}

export async function generateRoutine(
  userId: string,
  request: {
    goal: string;
    duration: number;
    equipment: string[];
    focus?: string;
    level?: string;
  },
): Promise<GeneratedRoutine | null> {
  const context = await loadUserContext(userId);

  // Cargar PRs del usuario para personalizar
  const prs = await fetchUserPRs(userId);
  let prInfo = '';
  if (prs.length > 0) {
    prInfo = '\n\nRÉCORDS DEL USUARIO:\n' + prs.map(pr =>
      `${pr.exercise}: ${pr.estimated1rm}kg 1RM (último: ${pr.weight}kg)`
    ).join('\n');
  }

  const systemPrompt = `Eres ARGOS, sistema de IA de ATP. Genera una rutina de ejercicios.

METODOLOGÍA ATP (Enrique Zapata):
- Regla 80/20: 80% específico al objetivo, 20% complementario
- Splits por patrón de movimiento: Push/Pull/Legs (hombres), Legs/Upper/Glutes (mujeres)
- Doble progresión: primero peso, después reps
- Calentamiento siempre: movilidad articular + activación
- Enfriamiento: estiramientos + respiración

MÉTODOS DISPONIBLES:
- standard: Series × Reps clásico
- 3-5: Método 3-5 (reps objetivo por nivel, ajuste automático de peso)
- emom: EMOM autoajustable
- myo_reps: Myo Reps (20-rep activación + 5-rep overloads)

${prInfo}
${request.level ? `Nivel del usuario: ${request.level}` : ''}
${context.gender ? `Género: ${context.gender}` : ''}

Responde SOLO en JSON válido (sin markdown, sin backticks):
{
  "name": "Nombre de la rutina",
  "description": "Descripción corta",
  "estimatedMinutes": NUMBER,
  "warmup": [{"name": "ejercicio", "sets": N, "reps": "X", "rest_seconds": N, "notes": "opcional"}],
  "main": [{"name": "ejercicio", "sets": N, "reps": "X-Y", "rest_seconds": N, "method": "standard|3-5|myo_reps", "notes": "opcional"}],
  "cooldown": [{"name": "ejercicio", "sets": N, "reps": "30 seg", "rest_seconds": N}]
}`;

  try {
    const meta = await getArgosCallMetadata({ requestType: 'routine' });
    const data = await callAnthropic(
      [{
        role: 'user',
        content: `Genera una rutina de ${request.duration} minutos.
Objetivo: ${request.goal}
Equipamiento: ${request.equipment.join(', ')}
${request.focus ? `Enfoque: ${request.focus}` : ''}
${request.level ? `Nivel: ${request.level}` : ''}`,
      }],
      1500,
      MODEL_CHAT,
      systemPrompt,
      meta,
    );
    const text = data?.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as GeneratedRoutine;
  } catch (e) {
    console.error('ARGOS generateRoutine error:', e);
    return null;
  }
}

// === GENERAR RECETA ===

export interface GeneratedRecipe {
  name: string;
  description: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: { name: string; quantity: string; notes?: string }[];
  steps: string[];
  tips?: string;
}

export async function generateRecipe(
  userId: string,
  request: {
    type: string;
    goal: string;
    maxMinutes?: number;
    ingredients?: string[];
    restrictions?: string[];
  },
): Promise<GeneratedRecipe | null> {
  const context = await loadUserContext(userId);

  const systemPrompt = `Eres ARGOS, sistema de IA de ATP. Genera una receta saludable.

FILOSOFÍA NUTRICIONAL ATP:
- Priorizar proteína (meta: ${context.gender === 'female' ? '1.6-2.0' : '2.0-2.5'}g/kg de peso)
- Grasas saludables como fuente principal de energía
- Carbohidratos de fuentes naturales (no procesados)
- Anti-inflamatorio: evitar aceites de semilla, azúcar refinada, harinas procesadas
- Ingredientes accesibles en México/LATAM

${context.recentNutrition ? `Hoy lleva: ${context.recentNutrition.todayCalories} kcal, ${context.recentNutrition.todayProtein}g proteína en ${context.recentNutrition.mealsToday} comidas.` : ''}

Responde SOLO en JSON válido (sin markdown, sin backticks):
{
  "name": "Nombre de la receta",
  "description": "Descripción corta",
  "servings": N,
  "prepMinutes": N,
  "cookMinutes": N,
  "calories": N,
  "protein_g": N,
  "carbs_g": N,
  "fat_g": N,
  "ingredients": [{"name": "ingrediente", "quantity": "200g", "notes": "opcional"}],
  "steps": ["paso 1", "paso 2"],
  "tips": "Consejo opcional"
}`;

  try {
    const meta = await getArgosCallMetadata({ requestType: 'recipe' });
    const data = await callAnthropic(
      [{
        role: 'user',
        content: `Genera una receta de ${request.type}.
Objetivo: ${request.goal}
${request.maxMinutes ? `Máximo ${request.maxMinutes} minutos de preparación` : ''}
${request.ingredients?.length ? `Ingredientes disponibles: ${request.ingredients.join(', ')}` : ''}
${request.restrictions?.length ? `Restricciones: ${request.restrictions.join(', ')}` : ''}`,
      }],
      1500,
      MODEL_CHAT,
      systemPrompt,
      meta,
    );
    const text = data?.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as GeneratedRecipe;
  } catch (e) {
    console.error('ARGOS generateRecipe error:', e);
    return null;
  }
}

// === GENERAR LISTA DE SUPER ===

export interface ShoppingList {
  sections: { name: string; items: { name: string; quantity: string }[] }[];
}

export async function generateShoppingList(
  userId: string,
  days: number = 7,
  preferences?: { diet?: string; budget?: string },
): Promise<ShoppingList | null> {
  const context = await loadUserContext(userId);

  const systemPrompt = `Eres ARGOS, sistema de IA de ATP. Genera una lista de super optimizada para ${days} días.

CRITERIOS:
- Priorizar proteína animal de calidad
- Grasas saludables (aguacate, aceite de oliva, nueces)
- Verduras variadas y de temporada en México
- Frutas de bajo índice glucémico
- Sin ultra-procesados
- Organizado por sección del supermercado

${context.gender ? `Género: ${context.gender}` : ''}
${preferences?.diet ? `Dieta: ${preferences.diet}` : ''}
${preferences?.budget ? `Presupuesto: ${preferences.budget}` : ''}

Responde SOLO en JSON (sin markdown, sin backticks):
{
  "sections": [
    {"name": "Proteínas", "items": [{"name": "Pechuga de pollo", "quantity": "1 kg"}]},
    {"name": "Verduras", "items": [{"name": "Espinacas", "quantity": "2 bolsas"}]}
  ]
}`;

  try {
    const meta = await getArgosCallMetadata({ requestType: 'shopping_list' });
    const data = await callAnthropic(
      [{ role: 'user', content: `Genera lista de super para ${days} días.` }],
      1500,
      MODEL_CHAT,
      systemPrompt,
      meta,
    );
    const text = data?.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as ShoppingList;
  } catch (e) {
    console.error('ARGOS shoppingList error:', e);
    return null;
  }
}
