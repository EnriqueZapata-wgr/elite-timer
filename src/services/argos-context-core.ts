/**
 * ARGOS Context — lógica pura del contexto del usuario (MB-21 Pieza 7).
 *
 * buildContextPrompt arma el prompt con ~25 bloques de datos del usuario
 * (nombre, labs, glucosa, ciclo, emociones...). Vivía privado en
 * argos-service sin un solo test; aquí es puro y testeable en node.
 *
 * También vive aquí LA decisión del gate de consentimiento de memoria:
 * canLoadRichContext. Ese gate es lo que impide mandar datos de salud al
 * modelo sin permiso — y su política ante fallo es FAIL-CLOSED.
 */

export interface PersonalRecord {
  exercise: string;
  estimated1rm: number;
  weight: number;
  reps: number;
}

export interface UserContext {
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
  /** H.4 (MB-10): el check-in de HOY entra al contexto — solo el de hoy.
   *  El expediente de otros días NO viaja (límite duro del módulo). */
  todayEmotion?: {
    quadrant: string;
    labels: string[];
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

/**
 * #132 F3.4 / MB-21 P7 — el gate de consentimiento de memoria persistente.
 *
 * FAIL-CLOSED: si el servicio de consentimiento falla (query rota, red, lo
 * que sea), NO se puede verificar el permiso → el contexto rico NO se carga.
 * Antes era fail-open ("consent default es ON"): un usuario que REVOCÓ su
 * consentimiento veía sus datos de salud viajar al modelo cada vez que la
 * query de consent fallara. El costo del cierre es un turno menos
 * personalizado; el costo de la apertura era mandar salud sin permiso.
 */
export async function canLoadRichContext(hasConsent: () => Promise<boolean>): Promise<boolean> {
  try {
    return await hasConsent();
  } catch {
    return false;
  }
}

export function buildContextPrompt(ctx: UserContext): string {
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
  if (ctx.todayEmotion) {
    // H.4 (MB-10): el estado de HOY calibra las recomendaciones — con límites
    // DUROS que viajan pegados al dato (no dependen del cerebro cacheado).
    parts.push(`Estado emocional de HOY (check-in): ${ctx.todayEmotion.labels.join(', ')} (zona ${ctx.todayEmotion.quadrant})`);
    parts.push(
      'REGLAS DEL DATO EMOCIONAL (obligatorias): usa el estado de HOY solo para calibrar tono y recomendaciones. ' +
      'NO diagnosticas ni interpretas patrones emocionales como condición clínica. ' +
      'NUNCA mencionas el historial o expediente emocional de otros días salvo que el cliente lo pregunte explícitamente. ' +
      'Si detectas señales sostenidas de malestar profundo, sugiere apoyo profesional — no lo resuelves tú.',
    );
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
    // E-9 (MB-12): ciclo y labs viajaban como dos líneas independientes — el
    // mismo patrón de reglas duras pegadas al dato que el estado emocional.
    if (ctx.cycleInfo) {
      parts.push(
        'REGLA LABS + CICLO (obligatoria): en mujeres con ciclo activo, interpreta los labs EN CONTEXTO de la fase ' +
        `del ciclo indicada arriba (fase ${ctx.cycleInfo.currentPhase}): hormonas (estradiol, progesterona, LH/FSH), ` +
        'ferritina/hierro y marcadores inflamatorios varían por fase. Si la fase hace ambiguo un valor, dilo y ' +
        'sugiere repetir la medición en la fase adecuada; no concluyas con un dato fuera de contexto.',
      );
    }
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
