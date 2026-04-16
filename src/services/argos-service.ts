/**
 * ARGOS Service — Cerebro central de IA de ATP.
 * Chat contextual, insight diario, persistencia de conversaciones.
 * Usa callAnthropic (Supabase Edge Function proxy).
 */
import { supabase } from '@/src/lib/supabase';
import { callAnthropic } from './anthropic-client';
import { getLocalToday } from '@/src/utils/date-helpers';

// === MODELOS ===
const MODEL_CHAT = 'claude-sonnet-4-20250514';
const MODEL_ESTIMATE = 'claude-haiku-4-5-20251001';

// === SYSTEM PROMPT BASE ===
const ARGOS_SYSTEM_PROMPT = `Eres ARGOS, el sistema de inteligencia en salud funcional de ATP.

## TU IDENTIDAD
- Tu nombre es ARGOS (como el gigante de 100 ojos de la mitología griega)
- Ves TODO: nutrición, ejercicio, sueño, estrés, ciclo, glucosa, laboratorios
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

## DESCARGO
Tus recomendaciones son educativas y basadas en ciencia publicada. NO sustituyen la atención médica profesional. Siempre que detectes algo potencialmente grave, recomienda consultar a un profesional de salud.`;

// === CONTEXTO DEL USUARIO ===

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
    // Protocolo activo
    const { data: protocol } = await supabase
      .from('user_protocols')
      .select('name')
      .eq('user_id', userId)
      .eq('status', 'active')
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
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
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
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: exercises } = await supabase
      .from('exercise_logs')
      .select('date')
      .eq('user_id', userId)
      .gte('date', weekAgo);
    const uniqueDays = new Set((exercises || []).map(e => e.date)).size;
    context.recentExercise = { sessionsThisWeek: uniqueDays };
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
  if (ctx.recentGlucose) {
    const g = ctx.recentGlucose;
    parts.push(`Última glucosa: ${g.lastValue} mg/dL (${g.lastContext})`);
  }
  if (ctx.currentFastingStatus?.isFasting) {
    const f = ctx.currentFastingStatus;
    parts.push(`Ayuno activo: ${f.hoursElapsed}h de ${f.targetHours}h objetivo`);
  }
  if (parts.length === 0) return '';
  return `\n\n## DATOS ACTUALES DEL USUARIO\n${parts.join('\n')}`;
}

// === API CALLS ===

export interface ArgosMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatWithArgos(
  userId: string,
  messages: ArgosMessage[],
  options?: { model?: string },
): Promise<string> {
  const context = await loadUserContext(userId);
  const contextPrompt = buildContextPrompt(context);
  const systemPrompt = ARGOS_SYSTEM_PROMPT + contextPrompt;
  const model = options?.model || MODEL_CHAT;

  const data = await callAnthropic(
    messages.map(m => ({ role: m.role, content: m.content })),
    1024,
    model,
    systemPrompt,
  );

  return data?.content?.[0]?.text || 'Lo siento, no pude procesar tu consulta.';
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
    const data = await callAnthropic(
      [{ role: 'user', content: 'Dame el insight más relevante para hoy.' }],
      200,
      MODEL_ESTIMATE,
      insightSystem,
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
  return (data?.messages as ArgosMessage[]) || [];
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
  let prInfo = '';
  try {
    const { data: prs } = await supabase
      .from('personal_records')
      .select('exercise_id, estimated_1rm, weight_kg, exercises(name, name_es)')
      .eq('user_id', userId)
      .limit(10);
    if (prs && prs.length > 0) {
      prInfo = '\n\nRÉCORDS DEL USUARIO:\n' + prs.map((pr: any) =>
        `${pr.exercises?.name_es || pr.exercises?.name}: ${pr.estimated_1rm}kg 1RM (último: ${pr.weight_kg}kg)`
      ).join('\n');
    }
  } catch (_) { /* opcional */ }

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
    const data = await callAnthropic(
      [{ role: 'user', content: `Genera lista de super para ${days} días.` }],
      1500,
      MODEL_CHAT,
      systemPrompt,
    );
    const text = data?.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as ShoppingList;
  } catch (e) {
    console.error('ARGOS shoppingList error:', e);
    return null;
  }
}
