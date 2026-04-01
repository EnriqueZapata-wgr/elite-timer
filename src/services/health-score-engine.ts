/**
 * Motor Maestro de Salud — Recolecta TODAS las fuentes, produce scores unificados.
 */
import { supabase } from '@/src/lib/supabase';
import { getLatestMeasurement, type HealthMeasurement } from './health-measurement-service';
import { getLatestScore } from './health-score-service';
import type { HealthScore } from '@/src/data/functional-health-engine';

// ═══ TIPOS ═══

export interface HealthDataSource {
  id: string;
  name: string;
  icon: string;
  hasData: boolean;
  lastUpdated: string | null;
  impact: 'critical' | 'high' | 'medium' | 'low';
  actionRoute: string;
  actionLabel: string;
}

export interface DomainScore {
  domain: string;
  label: string;
  score: number;
  color: string;
  icon: string;
  sources: string[];
}

export interface MasterHealthReport {
  biologicalAge: {
    value: number | null;
    chronologicalAge: number;
    delta: number | null;
    confidence: number;
  };
  agingRate: {
    value: number | null;
    label: string;
    color: string;
  };
  evaluationQuality: {
    score: number;
    level: string;
    sources: HealthDataSource[];
    completedSources: number;
    totalSources: number;
    nextBestAction: { source: string; impact: string; route: string } | null;
  };
  functionalHealth: {
    value: number;
    level: string;
    color: string;
    domains: DomainScore[];
  };
  recommendations: {
    toImproveEvaluation: Recommendation[];
    toImproveHealth: Recommendation[];
    protocolImpact: ProtocolImpact[];
  };
  lastUpdated: string;
}

export interface Recommendation {
  id: string;
  icon: string;
  title: string;
  description: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  impactLabel: string;
  route: string;
  routeLabel: string;
}

export interface ProtocolImpact {
  protocolName: string;
  isActive: boolean;
  targetDomains: string[];
  estimatedImpact: string;
  timeToImpact: string;
  templateId?: string;
}

// ═══ GENERAR REPORTE ═══

export async function generateMasterHealthReport(userId: string): Promise<MasterHealthReport> {
  // Recolectar todas las fuentes en paralelo
  const [hm, hs, quizRes, prs, foodCount, plans, protocols, profile] = await Promise.all([
    getLatestMeasurement(userId).catch(() => null),
    getLatestScore(userId).catch(() => null),
    supabase.from('quiz_responses').select('quiz_id, domain_scores, completed_at').eq('user_id', userId).order('completed_at', { ascending: false }).then(r => r.data ?? []),
    supabase.from('personal_records').select('exercise_name, weight_kg, reps, achieved_at').eq('user_id', userId).order('achieved_at', { ascending: false }).limit(15).then(r => r.data ?? []),
    supabase.from('food_logs').select('id', { count: 'exact' }).eq('user_id', userId).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()).then(r => r.count ?? 0),
    supabase.from('daily_plans').select('compliance_pct, date').eq('user_id', userId).order('date', { ascending: false }).limit(7).then(r => r.data ?? []),
    supabase.from('user_protocols').select('name, protocol_key, status, template:protocol_templates(category, duration_weeks)').eq('user_id', userId).eq('status', 'active').then(r => r.data ?? []),
    supabase.from('client_profiles').select('date_of_birth, biological_sex').eq('user_id', userId).single().then(r => r.data),
  ]);

  const hasLabs = hs && hs.functionalHealthScore > 0;
  const lifestyleQuiz = quizRes.find((q: any) => q.quiz_id === 'lifestyle_assessment');
  const chronAge = profile?.date_of_birth
    ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / 31557600000) : 0;

  // ── Fuentes de datos ──
  const sources: HealthDataSource[] = [
    { id: 'quiz', name: 'Quiz integral', icon: 'clipboard-outline', hasData: !!lifestyleQuiz, lastUpdated: lifestyleQuiz?.completed_at ?? null, impact: 'critical', actionRoute: '/quiz-take?quiz_id=lifestyle_assessment', actionLabel: 'Hacer quiz' },
    { id: 'labs', name: 'Laboratorios', icon: 'flask-outline', hasData: !!hasLabs, lastUpdated: null, impact: 'critical', actionRoute: '/my-health', actionLabel: 'Subir labs' },
    { id: 'body', name: 'Composición corporal', icon: 'body-outline', hasData: !!(hm?.weight_kg && hm?.body_fat_pct), lastUpdated: hm?.date ?? null, impact: 'high', actionRoute: '/health-input', actionLabel: 'Registrar medidas' },
    { id: 'cardio', name: 'Cardiovascular', icon: 'heart-outline', hasData: !!(hm?.systolic_bp), lastUpdated: hm?.date ?? null, impact: 'high', actionRoute: '/health-input', actionLabel: 'Registrar PA' },
    { id: 'grip', name: 'Fuerza de agarre', icon: 'hand-left-outline', hasData: !!(hm?.grip_strength_kg), lastUpdated: hm?.date ?? null, impact: 'high', actionRoute: '/health-input', actionLabel: 'Registrar grip' },
    { id: 'vo2', name: 'VO2max', icon: 'fitness-outline', hasData: !!(hm?.vo2max_estimate), lastUpdated: hm?.date ?? null, impact: 'high', actionRoute: '/health-input', actionLabel: 'Registrar VO2max' },
    { id: 'prs', name: 'Personal Records', icon: 'barbell-outline', hasData: prs.length > 0, lastUpdated: prs[0]?.achieved_at ?? null, impact: 'medium', actionRoute: '/log-exercise', actionLabel: 'Registrar PRs' },
    { id: 'food', name: 'Registro de comidas', icon: 'restaurant-outline', hasData: foodCount >= 3, lastUpdated: null, impact: 'medium', actionRoute: '/nutrition', actionLabel: 'Registrar comida' },
    { id: 'wellbeing', name: 'Bienestar subjetivo', icon: 'happy-outline', hasData: !!(hm?.energy_level), lastUpdated: hm?.date ?? null, impact: 'medium', actionRoute: '/health-input', actionLabel: 'Evaluar bienestar' },
    { id: 'sleep', name: 'Datos de sueño', icon: 'moon-outline', hasData: !!(hm?.sleep_hours), lastUpdated: hm?.date ?? null, impact: 'medium', actionRoute: '/health-input', actionLabel: 'Registrar sueño' },
  ];

  const completedSources = sources.filter(s => s.hasData).length;

  // ── Calidad de evaluación ──
  const evalWeights = sources.reduce((acc, s) => {
    const w = s.impact === 'critical' ? 3 : s.impact === 'high' ? 2 : 1.5;
    acc.total += w;
    if (s.hasData) acc.got += w;
    return acc;
  }, { got: 0, total: 0 });
  const evalScore = Math.round((evalWeights.got / evalWeights.total) * 100);
  const evalLevel = evalScore >= 90 ? 'Élite' : evalScore >= 75 ? 'Clínica' : evalScore >= 55 ? 'Completa' : evalScore >= 35 ? 'Buena' : 'Básica';

  const missingSources = sources.filter(s => !s.hasData).sort((a, b) => {
    const o = { critical: 0, high: 1, medium: 2, low: 3 };
    return o[a.impact] - o[b.impact];
  });
  const nextBest = missingSources[0] ?? null;

  // ── Dominios de salud ──
  const DOMAIN_DEFS = [
    { key: 'sleep', label: 'Sueño', icon: 'moon-outline' },
    { key: 'energy', label: 'Energía', icon: 'flash-outline' },
    { key: 'metabolic', label: 'Metabolismo', icon: 'flame-outline' },
    { key: 'inflammation', label: 'Inflamación', icon: 'shield-outline' },
    { key: 'hormonal', label: 'Hormonal', icon: 'pulse-outline' },
    { key: 'digestive', label: 'Digestión', icon: 'nutrition-outline' },
    { key: 'stress', label: 'Estrés', icon: 'thunderstorm-outline' },
    { key: 'fitness', label: 'Fitness', icon: 'barbell-outline' },
    { key: 'cognitive', label: 'Cognición', icon: 'bulb-outline' },
    { key: 'pain', label: 'Dolor', icon: 'bandage-outline' },
  ];

  const quizScores: Record<string, number> = lifestyleQuiz?.domain_scores ?? {};

  const domains: DomainScore[] = DOMAIN_DEFS.map(d => {
    const vals: { v: number; w: number; src: string }[] = [];

    // Quiz integral (peso 0.4)
    if (quizScores[d.key] !== undefined) vals.push({ v: quizScores[d.key], w: 0.4, src: 'Quiz' });

    // Labs engine scores (peso 0.3)
    if (hs?.domains) {
      const labDomain = (hs.domains as any[]).find((dd: any) => dd.key === d.key || domainAlias(dd.key) === d.key);
      if (labDomain && labDomain.evaluationQuality > 0) {
        vals.push({ v: labDomain.functionalScore, w: 0.3, src: 'Labs' });
      }
    }

    // Health measurements (peso 0.2)
    const hmScore = hmScoreForDomain(d.key, hm);
    if (hmScore !== null) vals.push({ v: hmScore, w: 0.2, src: 'Mediciones' });

    // PRs para fitness (peso 0.1)
    if (d.key === 'fitness' && prs.length > 0) {
      vals.push({ v: Math.min(90, 40 + prs.length * 5), w: 0.1, src: 'PRs' });
    }

    // Compliance para dominio relevante (peso 0.1)
    if (plans.length > 0) {
      const avgComp = plans.reduce((s: number, p: any) => s + (p.compliance_pct ?? 0), 0) / plans.length;
      vals.push({ v: avgComp, w: 0.1, src: 'Compliance' });
    }

    let score = 50;
    if (vals.length > 0) {
      const tw = vals.reduce((s, v) => s + v.w, 0);
      score = Math.round(vals.reduce((s, v) => s + v.v * v.w, 0) / tw);
    }
    score = Math.max(0, Math.min(100, score));

    return {
      domain: d.key, label: d.label, score, icon: d.icon,
      color: score >= 70 ? '#a8e02a' : score >= 40 ? '#EF9F27' : '#E24B4A',
      sources: vals.map(v => v.src),
    };
  });

  // Score funcional: usar el del motor de labs si existe (fuente de verdad), sino promediar dominios
  const labBasedScore = hs?.functionalHealthScore && hs.functionalHealthScore > 0
    ? Math.round(hs.functionalHealthScore) : null;
  const domainsWithData = domains.filter(d => d.sources.length > 0);
  const domainAvg = domainsWithData.length > 0
    ? Math.round(domainsWithData.reduce((s, d) => s + d.score, 0) / domainsWithData.length) : 50;
  const functionalValue = labBasedScore ?? domainAvg;
  const fhLevel = functionalValue >= 85 ? 'Élite' : functionalValue >= 70 ? 'Óptimo' : functionalValue >= 55 ? 'Bueno' : functionalValue >= 40 ? 'Aceptable' : functionalValue >= 25 ? 'En riesgo' : 'Crítico';
  const fhColor = functionalValue >= 70 ? '#a8e02a' : functionalValue >= 40 ? '#EF9F27' : '#E24B4A';

  // ── Edad biológica ──
  const bioAge = hs?.biologicalAge && hs.biologicalAge > 0 ? hs.biologicalAge : null;
  const agingRateVal = hs?.agingRate && hs.agingRate > 0 ? hs.agingRate : null;
  const arLabel = !agingRateVal ? 'Sin datos' : agingRateVal < 0.95 ? 'Lento' : agingRateVal < 1.05 ? 'Normal' : agingRateVal < 1.15 ? 'Acelerado' : 'Muy acelerado';
  const arColor = !agingRateVal ? '#555' : agingRateVal < 1.0 ? '#a8e02a' : agingRateVal < 1.1 ? '#EF9F27' : '#E24B4A';

  // ── Recomendaciones ──
  const toImproveEvaluation: Recommendation[] = missingSources.slice(0, 5).map(s => {
    const descs: Record<string, string> = {
      quiz: 'El quiz evalúa 10 áreas de salud en 10 min. Base de recomendaciones.',
      labs: 'Con labs la IA calcula tu edad biológica real con PhenoAge.',
      body: 'Peso, grasa, músculo. Báscula de bioimpedancia o medidas corporales.',
      cardio: 'PA y FC en reposo. Un baumanómetro digital, 5 min sentado.',
      grip: 'Predictor #1 de longevidad. Dinamómetro, 2 intentos.',
      vo2: 'Mejor predictor de mortalidad. Test de caminata o smartwatch.',
      prs: 'PRs en sentadilla, peso muerto y press revelan capacidad funcional.',
      food: '3+ días de registro de comidas para detectar patrones.',
      wellbeing: 'Energía, sueño, estrés en escala 1-10. Toma 1 minuto.',
      sleep: 'Horas de sueño y despertares. Modifican score de sueño y hormonal.',
    };
    const est = s.impact === 'critical' ? '+15-25 pts' : s.impact === 'high' ? '+8-15 pts' : '+3-8 pts';
    return {
      id: s.id, icon: s.icon, title: s.name,
      description: descs[s.id] ?? `Agrega ${s.name} para mejorar tu evaluación.`,
      impact: s.impact, impactLabel: est, route: s.actionRoute, routeLabel: s.actionLabel,
    };
  });

  const weakDomains = [...domains].sort((a, b) => a.score - b.score).filter(d => d.score < 50).slice(0, 3);
  const domainProtoMap: Record<string, string> = {
    sleep: 'Protocolo sueño profundo', energy: 'Protocolo energía y vitalidad',
    metabolic: 'Protocolo metabólico básico', inflammation: 'Protocolo anti-inflamatorio',
    hormonal: 'Protocolo optimización hormonal', digestive: 'Protocolo digestivo',
    stress: 'Protocolo anti-estrés', fitness: 'Protocolo pérdida de grasa',
    cognitive: 'Protocolo cognitivo — Focus', pain: 'Protocolo movilidad y dolor',
  };

  const toImproveHealth: Recommendation[] = weakDomains.map(d => ({
    id: `improve_${d.domain}`, icon: d.icon,
    title: `${d.label}: ${d.score}/100`,
    description: `Tu ${d.label.toLowerCase()} necesita atención. Un protocolo activo puede subirlo 15-30 pts.`,
    impact: d.score < 30 ? 'critical' as const : 'high' as const,
    impactLabel: '+15-30 pts con protocolo', route: '/protocol-explorer', routeLabel: 'Ver protocolo',
  }));

  const protocolImpact: ProtocolImpact[] = (protocols as any[]).map((p: any) => ({
    protocolName: p.name, isActive: true,
    targetDomains: [p.template?.category ?? 'general'],
    estimatedImpact: `+10-25 pts`, timeToImpact: `${Math.ceil((p.template?.duration_weeks ?? 8) / 2)}-${p.template?.duration_weeks ?? 8} sem`,
  }));

  // Sugerir protocolos para dominios débiles que no están activos
  for (const d of weakDomains) {
    const name = domainProtoMap[d.domain];
    if (name && !protocolImpact.some(p => p.protocolName === name)) {
      protocolImpact.push({
        protocolName: name, isActive: false,
        targetDomains: [d.domain], estimatedImpact: `+15-30 pts en ${d.label}`,
        timeToImpact: '4-8 semanas',
      });
    }
  }

  return {
    biologicalAge: { value: bioAge, chronologicalAge: chronAge, delta: bioAge && chronAge ? Math.round((bioAge - chronAge) * 10) / 10 : null, confidence: evalScore },
    agingRate: { value: agingRateVal, label: arLabel, color: arColor },
    evaluationQuality: { score: evalScore, level: evalLevel, sources, completedSources, totalSources: sources.length, nextBestAction: nextBest ? { source: nextBest.name, impact: nextBest.impact === 'critical' ? 'Desbloquea edad biológica' : `+8-15 pts estimados`, route: nextBest.actionRoute } : null },
    functionalHealth: { value: functionalValue, level: fhLevel, color: fhColor, domains: domains.sort((a, b) => b.score - a.score) },
    recommendations: { toImproveEvaluation, toImproveHealth, protocolImpact },
    lastUpdated: new Date().toISOString(),
  };
}

// ═══ HELPERS ═══

function domainAlias(key: string): string {
  const map: Record<string, string> = {
    metabolismo: 'metabolic', cardiovascular: 'metabolic', habits: 'fitness',
    vitality: 'energy', body_composition: 'metabolic', renal_micronutrients: 'inflammation',
    immunity: 'inflammation',
  };
  return map[key] ?? key;
}

function hmScoreForDomain(domain: string, hm: HealthMeasurement | null): number | null {
  if (!hm) return null;
  switch (domain) {
    case 'sleep': return hm.sleep_quality ? hm.sleep_quality * 10 : hm.sleep_hours ? (hm.sleep_hours >= 7 && hm.sleep_hours <= 9 ? 85 : hm.sleep_hours >= 6 ? 55 : 25) : null;
    case 'energy': return hm.energy_level ? hm.energy_level * 10 : null;
    case 'stress': return hm.stress_level ? (10 - hm.stress_level) * 10 : null;
    case 'fitness': {
      const s: number[] = [];
      if (hm.vo2max_estimate) s.push(hm.vo2max_estimate >= 50 ? 90 : hm.vo2max_estimate >= 40 ? 70 : hm.vo2max_estimate >= 30 ? 50 : 30);
      if (hm.grip_strength_kg) s.push(Math.min(100, (hm.grip_strength_kg / 40) * 70));
      if (hm.exercise_min_weekly) s.push(hm.exercise_min_weekly >= 300 ? 95 : hm.exercise_min_weekly >= 150 ? 70 : hm.exercise_min_weekly >= 75 ? 45 : 20);
      return s.length > 0 ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null;
    }
    case 'metabolic': {
      const s: number[] = [];
      if (hm.body_fat_pct) s.push(hm.body_fat_pct < 18 ? 90 : hm.body_fat_pct < 25 ? 70 : hm.body_fat_pct < 30 ? 45 : 20);
      if (hm.visceral_fat) s.push(hm.visceral_fat <= 9 ? 85 : hm.visceral_fat <= 14 ? 55 : 25);
      return s.length > 0 ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null;
    }
    case 'inflammation': return hm.systolic_bp ? (hm.systolic_bp < 120 ? 85 : hm.systolic_bp < 140 ? 55 : 25) : null;
    default: return hm.mood_level ? hm.mood_level * 10 : null;
  }
}
