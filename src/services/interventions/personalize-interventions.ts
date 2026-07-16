/**
 * personalize-interventions — Motor de Personalización, núcleo determinístico
 * (arquitectura v1 §3-6). Convierte el fenotipo del user en un top 5 de
 * intervenciones prescritas con rationale "por qué a TI".
 *
 * CRÍTICO — INVARIANTES:
 *  · 100% determinístico. CERO imports de argos-proxy / Anthropic / red. Mismo
 *    fenotipo → mismo output, siempre (testeable, reproducible).
 *  · Contraindicaciones absolutas se respetan (string tags + excludeIf del
 *    catálogo, semántica OR: CUALQUIER contraindicación excluye — criterio
 *    clínico, no el AND literal del comentario de la interface).
 *  · Universales P1 nunca se excluyen sin razón absoluta (lift a 60).
 *  · Ciclo femenino BIDIRECCIONAL: folicular/ovulatoria intensifica (+),
 *    lútea/menstrual reduce (−) — no solo baja.
 *  · Gating clínico: requiresClinicalValidation NO entra a la prescripción
 *    (cero fuga clínica — mismo criterio que matchInterventions de Sprint 1.5).
 *  · Biomarcadores en Tier 1/2/3 (no cargar labs caros por default).
 *
 * DIVERGENCIAS spec↔catálogo real (documentadas, resueltas conservador):
 *  · La spec asume `user_dx_levels` (system→nivel 1-5); el catálogo real usa
 *    `dx_level` con vocabulario propio ('metabolismo','estres','sueno',
 *    'circadiano','digestion','inflamacion','cardiovascular','cognitivo',
 *    'hormonal','energia','inmunologico','movimiento'). El motor matchea contra
 *    ESE vocabulario (fuente de verdad = catálogo). El servicio deriva DXLevels
 *    en este vocabulario desde functional_dx.roots_detected.
 *  · `excludeIf` se evalúa OR (cualquier regla que matchee excluye) — el AND
 *    literal haría inútiles las listas de contraindicaciones múltiples.
 */
import {
  INTERVENTIONS_CATALOG,
  type Intervention,
  type RecommendationRule,
} from '@/src/constants/interventions-catalog';
import { displayLabel } from '@/src/constants/display-labels';
import type {
  UserPhenotype,
  PrescribedIntervention,
  RationaleReason,
  ScoredIntervention,
  SuggestedBiomarkers,
} from './personalize-types';

// ── Entry point ──────────────────────────────────────────────────────────────

/**
 * Prescribe el top 5 para un fenotipo. Determinístico y puro.
 * `catalog` inyectable para tests; default = catálogo completo (88).
 */
export function personalizeInterventions(
  phenotype: UserPhenotype,
  catalog: Intervention[] = INTERVENTIONS_CATALOG,
): PrescribedIntervention[] {
  // 1. Elegibles: fuera las gateadas clínicamente + las contraindicadas.
  const eligible = catalog.filter(
    (i) => !i.requiresClinicalValidation && !isContraindicated(i, phenotype),
  );

  // 2. Score + razones por intervención.
  const scored: ScoredIntervention[] = eligible.map((i) => ({
    intervention: i,
    score: computeScore(i, phenotype),
    matchReasons: findMatchReasons(i, phenotype),
  }));

  // 3. Universales P1 vs resto.
  const isUP1 = (s: ScoredIntervention) =>
    !!s.intervention.isUniversal && s.intervention.priority === 1;
  const universalsP1 = scored.filter(isUP1).sort((a, b) => b.score - a.score);
  const rest = scored.filter((s) => !isUP1(s)).sort((a, b) => b.score - a.score);

  // 4. Top 5 = universales P1 aplicables + top del resto (dedup por familia).
  const top5 = selectTop5(universalsP1, rest);

  // 5. contextNote global (doctrina Humby 9+ activas).
  const contextNote = buildContextNote(phenotype);

  // 6. Rationale personalizado por cada uno.
  return top5.map((s, idx) => ({
    intervention: s.intervention,
    score: s.score,
    rank: idx + 1,
    isUniversalP1: isUP1(s),
    rationale: generateRationale(s),
    cyclePhaseNote: getCyclePhaseNote(s.intervention, phenotype),
    contextNote,
    contraindicationChecked: getContraindicationsChecked(s.intervention),
    suggestedBiomarkers: categorizeBiomarkersByTier(
      s.intervention.epigeneticImpact?.biomarkers ?? [],
    ),
  }));
}

// ── Contraindicaciones (hard exclude) ────────────────────────────────────────

/**
 * Excluye si CUALQUIER contraindicación (string tag) matchea el estado del user
 * O CUALQUIER regla de excludeIf matchea. Semántica OR — criterio clínico:
 * una sola contraindicación absoluta basta para excluir.
 */
export function isContraindicated(intervention: Intervention, phenotype: UserPhenotype): boolean {
  const state = buildUserState(phenotype);

  const tags = intervention.contraindications ?? [];
  const tagHit = tags.some((c) => c !== 'ninguna_absoluta' && matchesUserState(c, state));
  if (tagHit) return true;

  const excludeIf = intervention.recommendationRules?.excludeIf ?? [];
  return excludeIf.some((rule) => matchesRule(rule, phenotype));
}

/** Estado del user como set de flags string (para match de contraindicaciones tag). */
export function buildUserState(phenotype: UserPhenotype): Set<string> {
  const state = new Set<string>();
  const p = phenotype.profile;

  p.conditions.forEach((c) => state.add(c));
  if (p.pregnancy) state.add('embarazo');
  if (p.lactancia) state.add('lactancia');
  if (p.age < 16) state.add('menor_de_16_anos');
  if (p.age < 18) state.add('menor_de_18_anos');
  if (p.age >= 65) state.add('adulto_mayor_65');
  if (p.age >= 70) state.add('adulto_mayor_70');
  if (p.age >= 85) state.add('insuficiencia_termorregulatoria_geriatrica');

  if (p.feverViralActive) {
    state.add('fiebre_viral_activa_37_8_o_mas');
    state.add('infeccion_respiratoria_aguda_fase_temprana');
    state.add('recuperacion_covid_gripe_severa_primeras_2_semanas');
  }

  p.medications.forEach((m) => state.add(`medication_${m}`));
  if (phenotype.cyclePhase?.regularity === 'perimenopausal') state.add('perimenopausia');
  if (phenotype.cyclePhase) state.add(`cycle_${phenotype.cyclePhase.currentPhase}`);

  return state;
}

/** Match directo o parcial (embarazo matchea embarazo_1er_trimestre y viceversa). */
export function matchesUserState(contra: string, userState: Set<string>): boolean {
  if (userState.has(contra)) return true;
  return Array.from(userState).some((s) => s.includes(contra) || contra.includes(s));
}

// ── Scoring (arquitectura §4) ────────────────────────────────────────────────

/**
 * score = base(20) + boostBonus + relevance(pain) + cycleBoost − noise.
 * Universales P1 con piso 60. Cap [0,100].
 */
export function computeScore(intervention: Intervention, phenotype: UserPhenotype): number {
  let score = 20;

  const rules = intervention.recommendationRules;
  const boostWeight = rules?.boostWeight ?? 1;

  if (rules?.boostIf) {
    for (const rule of rules.boostIf) {
      // TODO (Mega-Sprint A · task #130 · PENDIENTE validación Mariana): el
      // multiplicador ×10 satura el score a 100 y el top 5 pierde discriminación.
      // Code recomendó bajar a ×5. NO aplicar hasta que Enrique valide con Mariana.
      if (matchesRule(rule, phenotype)) score += boostWeight * 10;
    }
  }

  if (intervention.isUniversal && intervention.priority === 1) {
    score = Math.max(score, 60);
  }

  score += matchesUserPain(intervention, phenotype) * 30;
  score += getCyclePhaseBoost(intervention, phenotype);
  score -= getNoiseFactor(intervention, phenotype);

  return Math.min(Math.max(Math.round(score), 0), 100);
}

/** Aplica un operador comparador numérico. */
export function applyOperator(actual: number, op: string, expected: number): boolean {
  switch (op) {
    case '<': return actual < expected;
    case '<=': return actual <= expected;
    case '=': return actual === expected;
    case '>=': return actual >= expected;
    case '>': return actual > expected;
    default: return false;
  }
}

/** ¿La regla ejecutable matchea el fenotipo? */
export function matchesRule(rule: RecommendationRule, phenotype: UserPhenotype): boolean {
  switch (rule.source) {
    case 'dx_level': {
      const dx = phenotype.dxLevels.find((d) => d.system === rule.system);
      if (!dx) return false;
      return applyOperator(dx.level, rule.operator, rule.value);
    }
    case 'braverman': {
      if (!phenotype.braverman) return false;
      return phenotype.braverman[rule.neurotransmitter] === rule.threshold;
    }
    case 'lab': {
      const lab = phenotype.labs.find((l) => l.marker === rule.marker);
      if (!lab) return false;
      return applyOperator(lab.value, rule.operator, rule.value);
    }
    case 'profile':
      return matchesProfileRule(rule, phenotype);
    case 'quiz': {
      // Cuestionario Maestro aún sin persistencia (fetchUserPhenotype devuelve []).
      const ans = phenotype.quizAnswers.find((q) => q.section === rule.questionnaire && !q.skipped);
      return !!ans && (ans.answer as any) === rule.score;
    }
    case 'chronotype': {
      if (!phenotype.chronotype) return false;
      if (rule.type === 'delfin_transitional') return phenotype.chronotype.transitionalState === 'delfin';
      return phenotype.chronotype.type === rule.type;
    }
    case 'cycle_phase': {
      if (!phenotype.cyclePhase) return false;
      return phenotype.cyclePhase.currentPhase === rule.phase;
    }
    default:
      return false;
  }
}

/**
 * Reglas `profile`: el catálogo usa nombres de campo en español que no mapean 1:1
 * a Profile (embarazo→pregnancy, condiciones→conditions[], diabetes_tipo derivado,
 * edad_65_o_mas→age, etc). Este resolvedor traduce.
 */
function matchesProfileRule(
  rule: Extract<RecommendationRule, { source: 'profile' }>,
  phenotype: UserPhenotype,
): boolean {
  const p = phenotype.profile;
  const field = rule.field;

  // Campos-array: `in` = intersección no vacía.
  if (field === 'condiciones' || field === 'conditions') {
    if (rule.in) return rule.in.some((c) => p.conditions.includes(String(c)));
    if (rule.equals !== undefined) return p.conditions.includes(String(rule.equals));
    return false;
  }
  if (field === 'medicamentos' || field === 'medications') {
    if (rule.in) return rule.in.some((m) => p.medications.includes(String(m)));
    if (rule.equals !== undefined) return p.medications.includes(String(rule.equals));
    return false;
  }

  // Campos escalares derivados.
  let value: string | number | boolean | undefined;
  switch (field) {
    case 'embarazo': value = p.pregnancy; break;
    case 'lactancia': value = p.lactancia; break;
    case 'edad': case 'age': value = p.age; break;
    case 'edad_65_o_mas': value = p.age >= 65; break;
    case 'menor_de_18_anos': value = p.age < 18; break;
    case 'menor_de_16_anos': value = p.age < 16; break;
    case 'genero': case 'gender': value = p.gender; break;
    case 'diabetes_tipo':
      value = p.conditions.includes('diabetes_tipo_1') ? 1
        : p.conditions.includes('diabetes_tipo_2') ? 2 : 0;
      break;
    default:
      // Flags booleanos que viven como condición (trastorno_alimentario_activo…).
      if (rule.equals === true) return p.conditions.includes(field);
      value = (p as any)[field];
  }

  if (rule.equals !== undefined) return value === rule.equals;
  if (rule.in) return rule.in.includes(value as any);
  return false;
}

/** Boost bidireccional por fase del ciclo (doctrina §4.4). */
export function getCyclePhaseBoost(intervention: Intervention, phenotype: UserPhenotype): number {
  if (!phenotype.cyclePhase || phenotype.profile.gender !== 'female') return 0;

  const highIntensity = HIGH_INTENSITY_KEYS.has(intervention.key)
    || intervention.family === 'ayuno'
    || intervention.family === 'sardinas'
    || intervention.family === 'ejercicio_ayuno';
  if (!highIntensity) return 0;

  const phase = phenotype.cyclePhase.currentPhase;
  if (phase === 'follicular' || phase === 'ovulatory') return 20;  // intensificar
  if (phase === 'luteal' || phase === 'menstrual') return -15;     // escuchar
  return 0;
}

/** Intervenciones de alta intensidad (moduladas por ciclo · doctrina). */
export const HIGH_INTENSITY_KEYS = new Set<string>([
  'ayuno_18_6', 'ayuno_20_4_omad', 'ayuno_16_8', 'ayuno_14_10',
  'vo2max_training', 'levantamiento_compuesto', 'ejercicio_ayuno_fuerza',
  'cold_plunge_cns', 'bano_frio_hormesis', 'wim_hof_extendido', 'wim_hof_basico',
  'sauna_finlandesa', 'ducha_fria_nivel3',
]);

/** Mapeo objetivo del user → categorías/roots del catálogo (relevance multiplier §4.5). */
export const USER_GOAL_TO_CATEGORIES: Record<string, string[]> = {
  mas_energia: ['energia', 'mitocondrial', 'circadiano'],
  dormir_mejor: ['sueno', 'circadiano', 'estres'],
  bajar_grasa: ['metabolismo', 'mitocondrial', 'nutricion'],
  ganar_musculo: ['movimiento', 'sarcopenia', 'hormonal'],
  foco_concentracion: ['cognitivo', 'atencion', 'contemplativo'],
  salud_mental: ['cognitivo', 'contemplativo', 'estres', 'ansiedad'],
  longevidad: ['mitocondrial', 'metabolismo', 'inflamacion', 'sarcopenia'],
  mejor_libido: ['hormonal', 'metabolismo'],
  reducir_dolor: ['inflamacion', 'movimiento'],
  vitalidad_general: ['energia', 'mitocondrial', 'circadiano'],
};

/** Relevancia vs dolor mayor del user: 1 match completo, 0.5 parcial, 0 nada. */
export function matchesUserPain(intervention: Intervention, phenotype: UserPhenotype): number {
  const goals = phenotype.profile.goals ?? [];
  if (goals.length === 0) return 0;

  const targetCats = new Set<string>();
  for (const g of goals) (USER_GOAL_TO_CATEGORIES[g] ?? []).forEach((c) => targetCats.add(c));
  if (targetCats.size === 0) return 0;

  const ivCats = new Set<string>([
    ...intervention.categories.map(String),
    ...intervention.roots.map(String),
  ]);
  const overlap = [...targetCats].filter((c) => ivCats.has(c)).length;
  if (overlap === 0) return 0;
  return overlap >= 2 ? 1 : 0.5;
}

/**
 * Penalización por conflictos suaves. Único caso codificado hoy: intervención de
 * frío/hormesis intensa cuando el user entrena fuerza tarde (cold post-fuerza
 * embota la hipertrofia). Determinístico y acotado.
 */
export function getNoiseFactor(intervention: Intervention, phenotype: UserPhenotype): number {
  const isColdHormesis = intervention.family === 'bano_frio'
    || intervention.family === 'ducha_fria'
    || intervention.key === 'cold_plunge_cns';
  if (isColdHormesis && phenotype.profile.conditions.includes('entrena_fuerza_tarde')) {
    return 10;
  }
  return 0;
}

// ── Selección top 5 (§5) ─────────────────────────────────────────────────────

export function selectTop5(
  universalsP1: ScoredIntervention[],
  rest: ScoredIntervention[],
): ScoredIntervention[] {
  // Máx 3 universales P1 → deja ≥2 slots para específicas del fenotipo.
  const universalsToUse = deduplicateByFamily(universalsP1).slice(0, 3);
  const specificSlots = 5 - universalsToUse.length;

  const usedFamilies = new Set(
    universalsToUse.map((s) => s.intervention.family).filter(Boolean) as string[],
  );
  const specifics = deduplicateByFamily(rest, usedFamilies).slice(0, specificSlots);

  return [...universalsToUse, ...specifics];
}

/** Un solo representante por familia (el de mayor score, ya vienen ordenados). */
export function deduplicateByFamily(
  scored: ScoredIntervention[],
  seed: Set<string> = new Set(),
): ScoredIntervention[] {
  const seen = new Set<string>(seed);
  const out: ScoredIntervention[] = [];
  for (const s of scored) {
    const fam = s.intervention.family;
    if (fam && seen.has(fam)) continue;
    if (fam) seen.add(fam);
    out.push(s);
  }
  return out;
}

// ── Rationale (§6) ───────────────────────────────────────────────────────────

/** Razones concretas del match, ordenadas por impacto. */
export function findMatchReasons(intervention: Intervention, phenotype: UserPhenotype): RationaleReason[] {
  const reasons: RationaleReason[] = [];
  const rules = intervention.recommendationRules;

  if (rules?.boostIf) {
    for (const rule of rules.boostIf) {
      if (!matchesRule(rule, phenotype)) continue;
      reasons.push(ruleToReason(rule, phenotype));
    }
  }

  if (intervention.isUniversal && intervention.priority === 1) {
    reasons.unshift({ source: 'universal', detail: 'Universal P1 · base innegociable', impact: 'high' });
  }

  // Relevancia por objetivo declarado.
  if (matchesUserPain(intervention, phenotype) > 0 && (phenotype.profile.goals?.length ?? 0) > 0) {
    reasons.push({
      source: 'quiz',
      detail: `alineado con tu objetivo (${(phenotype.profile.goals ?? []).join(', ')})`,
      impact: 'medium',
    });
  }

  return reasons;
}

function ruleToReason(rule: RecommendationRule, phenotype: UserPhenotype): RationaleReason {
  switch (rule.source) {
    case 'dx_level': {
      const dx = phenotype.dxLevels.find((d) => d.system === rule.system);
      return { source: 'dx_level', detail: `Nivel ${dx?.level ?? '?'} ${rule.system}`, impact: 'high' };
    }
    case 'braverman':
      return { source: 'braverman', detail: `${rule.neurotransmitter} ${rule.threshold} (Braverman)`, impact: 'high' };
    case 'lab': {
      const lab = phenotype.labs.find((l) => l.marker === rule.marker);
      return { source: 'lab', detail: `${rule.marker} en ${lab?.value ?? '?'}${lab?.unit ? ` ${lab.unit}` : ''}`, impact: 'high' };
    }
    case 'cycle_phase':
      return { source: 'cycle', detail: `fase ${rule.phase} actual`, impact: 'medium' };
    case 'chronotype':
      return { source: 'chronotype', detail: `cronotipo ${rule.type}`, impact: 'medium' };
    case 'profile':
      return { source: 'profile', detail: `perfil: ${rule.field}`, impact: 'medium' };
    case 'quiz':
      return { source: 'quiz', detail: `cuestionario ${rule.questionnaire}`, impact: 'medium' };
    default:
      return { source: 'profile', detail: 'match de fenotipo', impact: 'low' };
  }
}

export function generateRationale(scored: ScoredIntervention): PrescribedIntervention['rationale'] {
  const reasons = scored.matchReasons;
  return {
    summary: buildSummarySentence(reasons, scored.intervention),
    reasons,
    epigeneticImpact: buildEpigeneticImpactSentence(scored.intervention),
  };
}

export function buildSummarySentence(reasons: RationaleReason[], intervention: Intervention): string {
  const concrete = reasons.filter((r) => r.source !== 'universal');
  const isUP1 = intervention.isUniversal && intervention.priority === 1;

  if (isUP1) {
    const detail = concrete.slice(0, 2).map((r) => r.detail).join(' + ');
    return detail
      ? `Base innegociable · Universal P1 para todos. En tu perfil aporta especialmente por: ${detail}.`
      : 'Base innegociable · Universal P1 para todos. Fundamento para cualquier fenotipo.';
  }

  const top = concrete.filter((r) => r.impact === 'high').slice(0, 3);
  const list = (top.length ? top : concrete.slice(0, 3)).map((r) => r.detail).join(' + ');
  return list
    ? `Basado en tu ${list}, ATP prioriza esta intervención para ti.`
    : 'ATP la incluye como complemento válido para tu perfil general.';
}

export function buildEpigeneticImpactSentence(intervention: Intervention): string {
  const impact = intervention.epigeneticImpact;
  if (!impact) return '';

  // B1.2: legibiliza los términos técnicos (cortisol_ritmo → "ritmo de cortisol",
  // presion_arterial_matutina → "presión arterial matutina") — el dato interno
  // sigue snake_case, solo el texto que ve el user se legibiliza.
  const activates = (impact.activates ?? []).slice(0, 2).map((m) => displayLabel(shortMechanism(m))).join(' + ');
  const modulates = (impact.modulates ?? []).slice(0, 2).map((m) => displayLabel(shortMechanism(m))).join(' + ');
  const tier1 = (impact.biomarkers ?? []).filter(isTier1Biomarker).slice(0, 3).map(displayLabel).join(', ');

  let s = '';
  if (activates) s += `Activa ${activates}. `;
  if (modulates) s += `Modula ${modulates}. `;
  if (tier1) s += `Monitorear: ${tier1}.`;
  return s.trim();
}

/** Recorta el paréntesis explicativo largo de un mecanismo para la 1-línea. */
function shortMechanism(m: string): string {
  const paren = m.indexOf(' (');
  return (paren > 0 ? m.slice(0, paren) : m).trim();
}

// ── Ciclo · nota fase (§6) ───────────────────────────────────────────────────

export function getCyclePhaseNote(intervention: Intervention, phenotype: UserPhenotype): string | undefined {
  if (!phenotype.cyclePhase || phenotype.profile.gender !== 'female') return undefined;

  const boost = getCyclePhaseBoost(intervention, phenotype);
  if (boost === 0) return undefined;

  const phase = phenotype.cyclePhase.currentPhase;
  if (boost > 0) {
    return `Ideal en tu fase ${phaseLabel(phase)} actual — máximo aprovechamiento. En lútea, escucha tu cuerpo y baja la intensidad.`;
  }
  return `Estás en fase ${phaseLabel(phase)} — reduce la intensidad o pospón a folicular. Prioriza recuperación.`;
}

function phaseLabel(phase: string): string {
  return phase === 'follicular' ? 'folicular'
    : phase === 'ovulatory' ? 'ovulatoria'
    : phase === 'luteal' ? 'lútea'
    : 'menstrual';
}

// ── Contraindicaciones verificadas (transparencia) ──────────────────────────

export function getContraindicationsChecked(intervention: Intervention): string[] {
  const tags = (intervention.contraindications ?? []).filter((c) => c !== 'ninguna_absoluta');
  const excludeFields = (intervention.recommendationRules?.excludeIf ?? [])
    .map((r) => (r.source === 'profile' ? r.field : r.source));
  return Array.from(new Set([...tags, ...excludeFields]));
}

// ── Biomarcadores por Tier (§6 · doctrina no cargar labs caros) ─────────────

/** Tier 1 = accesible/barato (panel básico común en México). */
const TIER1_MARKERS = [
  'hba1c', 'glucosa', 'colesterol', 'hdl', 'ldl', 'trigliceridos', 'pcr', 'proteina c',
  'vitamina d', '25-oh', 'tsh', 'ferritina', 'hierro', 'hemoglobina', 'presion',
  'peso', 'imc', 'perimetro', 'cintura', 'ac. urico', 'acido urico', 'creatinina',
  'ast', 'alt', 'ggt', 'bilirrubina',
];
/** Tier 2 = intermedio (requiere señal o panel ampliado). */
const TIER2_MARKERS = [
  'insulina', 'homa', 'apob', 'apo b', 'apolipo', 'cortisol', 'hrv', 'homocisteina',
  't3', 't4', 'testosterona', 'estradiol', 'progesterona', 'dhea', 'igf', 'omega',
  'magnesio', 'b12', 'folato', 'zinc', 'vo2', 'oura', 'variabilidad',
];
// Todo lo demás cae a Tier 3 (sofisticado/costoso: IL-6, metilación, GlycanAge…).

export function isTier1Biomarker(marker: string): boolean {
  const m = marker.toLowerCase();
  return TIER1_MARKERS.some((t) => m.includes(t));
}
function isTier2Biomarker(marker: string): boolean {
  const m = marker.toLowerCase();
  return TIER2_MARKERS.some((t) => m.includes(t));
}

export function categorizeBiomarkersByTier(biomarkers: string[]): SuggestedBiomarkers {
  const tier1: string[] = [];
  const tier2: string[] = [];
  const tier3: string[] = [];
  for (const b of biomarkers) {
    if (isTier1Biomarker(b)) tier1.push(b);
    else if (isTier2Biomarker(b)) tier2.push(b);
    else tier3.push(b);
  }
  return { tier1, tier2, tier3 };
}

// ── contextNote (doctrina Humby 9+ activas) ─────────────────────────────────

/** Nº de intervenciones activas se pasa por profile (fetchUserPhenotype lo llena). */
export function buildContextNote(phenotype: UserPhenotype): string | undefined {
  const active = (phenotype.profile as any).activeInterventionCount as number | undefined;
  if (typeof active === 'number' && active >= 9) {
    return `Trabajas ${active} intervenciones. ATP recomienda menos, mejor: considera pausar algunas para lograr consistencia real antes de agregar más.`;
  }
  return undefined;
}
