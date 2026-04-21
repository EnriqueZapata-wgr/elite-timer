/**
 * Onboarding Service — Lógica central del flujo de onboarding v2.
 * Routing, persistencia, cálculo de insights.
 */
import { supabase } from '@/src/lib/supabase';
import type { OnboardingStep, BlockAnswers, FunctionalFlags, FunctionalIssue } from '@/src/types/onboarding';

// === ROUTING ===

/** Dado el step actual del usuario, devuelve la ruta a donde debe ir */
export function getOnboardingRoute(step: OnboardingStep): string {
  switch (step) {
    case 'completed': return '/(tabs)';
    case 'context':   return '/onboarding/summary';
    case 'nutrition': return '/onboarding/context';
    case 'health':    return '/onboarding/nutrition';
    case 'chronotype': return '/onboarding/health';
    case 'goal':      return '/onboarding/chronotype';
    case 'basics':    return '/onboarding/goal';
    default:          return '/onboarding-basics';
  }
}

/** Marca el step completado y devuelve la siguiente ruta */
export async function completeStep(userId: string, step: OnboardingStep): Promise<string> {
  await supabase.from('profiles').update({ onboarding_step: step }).eq('id', userId);
  return getOnboardingRoute(step);
}

// === PERSISTENCIA ===

/** Guarda respuestas de un bloque en client_profiles.onboarding_answers */
export async function saveBlockAnswers(userId: string, blockKey: string, answers: BlockAnswers): Promise<void> {
  // Leer respuestas actuales
  const { data } = await supabase
    .from('client_profiles')
    .select('onboarding_answers')
    .eq('user_id', userId)
    .maybeSingle();

  const existing = (data?.onboarding_answers as Record<string, any>) ?? {};
  const updated = { ...existing, [blockKey]: answers };

  await supabase
    .from('client_profiles')
    .update({ onboarding_answers: updated })
    .eq('user_id', userId);
}

/** Guarda campos estructurados del bloque Goal */
export async function saveGoalData(userId: string, data: {
  primaryGoal: string;
  previousAttempts: string[];
  motivationLevel: number;
}): Promise<void> {
  await supabase.from('client_profiles').update({
    primary_goal: data.primaryGoal,
    previous_attempts: data.previousAttempts,
    motivation_level: data.motivationLevel,
  }).eq('user_id', userId);
}

/** Guarda campos del bloque Nutrition */
export async function saveNutritionData(userId: string, data: {
  mealsPerDay: string;
  proteinSources: string[];
  foodRestrictions: string[];
  fastingExperience: string;
  foodRelationship: string;
}): Promise<void> {
  await supabase.from('client_profiles').update({
    meals_per_day: data.mealsPerDay,
    protein_sources: data.proteinSources,
    food_allergies: data.foodRestrictions,
    fasting_protocol: data.fastingExperience,
    food_relationship: data.foodRelationship,
  }).eq('user_id', userId);
}

/** Guarda campos del bloque Context */
export async function saveContextData(userId: string, data: {
  sedentaryHours: number;
  equipmentAccess: string[];
  timeAvailableMin: number;
}): Promise<void> {
  await supabase.from('client_profiles').update({
    sedentary_hours: data.sedentaryHours,
    equipment_access: data.equipmentAccess,
    time_available_min: data.timeAvailableMin,
  }).eq('user_id', userId);
}

// === CÁLCULOS HEALTH BLOCK ===

/** Calcula flags funcionales a partir de respuestas del bloque 3 */
export function calculateFunctionalFlags(answers: BlockAnswers): FunctionalFlags {
  const flags: FunctionalFlags = {
    insulin_resistance: 0,
    adrenal_fatigue: 0,
    gut_dysbiosis: 0,
    chronic_inflammation: 0,
    high_stress: 0,
    sleep_disruption: 0,
    hormonal_imbalance: 0,
  };

  // Cada pregunta contribuye a ciertos flags según la respuesta
  // Las opciones van de 'a' (peor) a 'd' (mejor)
  // Score: a=90, b=60, c=30, d=10 (severidad — alto = detectado)
  const severityMap: Record<string, number> = { a: 90, b: 60, c: 30, d: 10 };

  const mapping: Record<string, FunctionalIssue[]> = {
    h1: ['sleep_disruption', 'adrenal_fatigue'],           // Despertar 1-3 AM
    h2: ['adrenal_fatigue', 'hormonal_imbalance'],         // Necesita café
    h3: ['insulin_resistance', 'gut_dysbiosis'],           // Sueño post-comida
    h4: ['insulin_resistance', 'gut_dysbiosis'],           // Antojos azúcar
    h5: ['gut_dysbiosis', 'chronic_inflammation'],         // Hinchazón abdominal
    h6: ['high_stress', 'adrenal_fatigue'],                // Mente no para
    h7: [],                                                 // Ejercicio (no mapea directamente)
    h8: ['chronic_inflammation', 'gut_dysbiosis'],         // Dolor crónico
    h9: ['hormonal_imbalance', 'chronic_inflammation', 'gut_dysbiosis'], // Piel
    h10: ['chronic_inflammation', 'hormonal_imbalance'],   // Se enferma seguido
  };

  for (const [qId, issues] of Object.entries(mapping)) {
    const answer = answers[qId] as string;
    if (!answer || issues.length === 0) continue;
    const score = severityMap[answer] ?? 0;
    for (const issue of issues) {
      flags[issue] = Math.max(flags[issue], score);
    }
  }

  return flags;
}

/** Detecta issues con severidad */
export function detectIssues(flags: FunctionalFlags): { key: FunctionalIssue; label: string; severity: 'low' | 'medium' | 'high' }[] {
  const labels: Record<FunctionalIssue, string> = {
    insulin_resistance: 'Posible resistencia a insulina',
    adrenal_fatigue: 'Fatiga adrenal',
    gut_dysbiosis: 'Disbiosis intestinal',
    chronic_inflammation: 'Inflamacion cronica',
    high_stress: 'Estres elevado',
    sleep_disruption: 'Sueno interrumpido',
    hormonal_imbalance: 'Desbalance hormonal',
  };

  const issues: { key: FunctionalIssue; label: string; severity: 'low' | 'medium' | 'high' }[] = [];

  for (const [key, score] of Object.entries(flags)) {
    if (score >= 60) {
      issues.push({
        key: key as FunctionalIssue,
        label: labels[key as FunctionalIssue] || key,
        severity: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
      });
    }
  }

  return issues.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}

/** Guarda los flags funcionales en client_profiles */
export async function saveHealthData(userId: string, flags: FunctionalFlags, issues: string[]): Promise<void> {
  await supabase.from('client_profiles').update({
    functional_flags: flags,
    detected_issues: issues,
  }).eq('user_id', userId);
}

// === PROTOCOL RECOMMENDATION ===

/** Mapea detected issues a protocolos recomendados */
export function recommendProtocols(detectedIssues: FunctionalIssue[]): string[] {
  const protocolMap: Record<FunctionalIssue, string> = {
    insulin_resistance: 'protocolo_metabolico_basico',
    adrenal_fatigue: 'protocolo_energia_vitalidad',
    gut_dysbiosis: 'protocolo_digestivo',
    chronic_inflammation: 'protocolo_antiinflamatorio',
    high_stress: 'protocolo_antiestres',
    sleep_disruption: 'protocolo_sueno_profundo',
    hormonal_imbalance: 'protocolo_optimizacion_hormonal',
  };

  const protocols = new Set<string>();
  for (const issue of detectedIssues) {
    const p = protocolMap[issue];
    if (p) protocols.add(p);
  }
  return [...protocols].slice(0, 3); // Max 3 protocolos
}
