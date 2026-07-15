# 🧠 MOTOR DE PERSONALIZACIÓN · Arquitectura v1

**Fecha:** 2026-07-14
**Autor:** Cowork (post-integración catálogo epigenético)
**Estado:** Arquitectura completa lista para implementación Fable
**Handoff:** Fable pass 3 · 12-20h estimadas

---

## 0 · Propósito en 1 frase

> Convertir el fenotipo epigenético del user (DX + Braverman + labs + cuestionario + ciclo + profile) en **5 intervenciones prescritas** con narrativa personalizada "por qué a TI", usando algoritmo determinístico + reglas ejecutables del catálogo enriquecido de 88 intervenciones.

**Este es el momento** en que ATP deja de ser "app con catálogo abrumador" y pasa a ser **"app de prescripción funcional personalizada"**. Es EL corazón del producto.

---

## 1 · Doctrinas raíz que lo gobiernan

Antes de tocar código, releer:

- `project_positioning_app_intervencion_epigenetica` — ATP = app de intervención epigenética
- `project_doctrina_registro_epigenetico_3_funciones` — rastreo diagnóstico + motivación + ruta
- `project_doctrina_hoy_agenda_protocolo_relacion` — Mi Protocolo = HOY cards = Agenda eventos
- `project_doctrina_dx_intervenciones_core` — DX → intervenciones → HOY
- `feedback_no_matar_placebo_seguros_no_ingenuos` — copy Nivel 1 sin controversias · ARGOS Nivel 2/3 si user pregunta
- `project_doctrina_ciclo_femenino_bidireccional_no_solo_baja` — modular hacia ambos lados
- `project_doctrina_promover_fiebre_no_antipireticos` (v2 cautelosa) — cold contraindicado fiebre viral
- `project_doctrina_plantas_tradicionales_vs_suplementos_comerciales` — vehículo importa
- `feedback_biomarcadores_costosos_default_no_solicitar` — Tier 1/2/3 selectivo

Todo el motor respeta estas 9 doctrinas raíz.

---

## 2 · Inputs del motor (fuentes de fenotipo)

El motor NO adivina · lee 7 fuentes de verdad del user:

### 2.1 · `user_dx_levels` (Levantamientos)
```ts
type SystemName =
  | 'circadiano' | 'metabolico' | 'digestivo' | 'inflamatorio'
  | 'estres_neuroendocrino' | 'sueno' | 'hormonal' | 'cognitivo'
  | 'cardiovascular' | 'composicion_corporal' | 'mitocondrial';

interface DXLevel {
  system: SystemName;
  level: 1 | 2 | 3 | 4 | 5; // 1=roto · 5=optimizado
  computedAt: Date;
  confidence: 'low' | 'medium' | 'high'; // cuánta data respalda
}
```

### 2.2 · `user_braverman_result`
```ts
interface BravermanResult {
  dopamine: 'low' | 'medium' | 'high';
  acetylcholine: 'low' | 'medium' | 'high';
  gaba: 'low' | 'medium' | 'high';
  serotonin: 'low' | 'medium' | 'high';
  computedAt: Date;
}
```

### 2.3 · `user_labs` (labs subidos)
```ts
interface UserLab {
  marker: string; // canonicalizado · ej. 'HbA1c'
  value: number;
  unit: string; // ej. '%'
  measuredAt: Date;
  tier: 1 | 2 | 3; // Tier 1=accesible · 3=sofisticado
  source: 'user_upload' | 'wearable' | 'partner_lab';
}
```

### 2.4 · `user_master_quiz` (Cuestionario Maestro)
```ts
interface QuizAnswer {
  section: string; // 'd1_estado_cuerpo' · 'd2_composicion' · etc.
  questionCode: string; // 'D1.1'
  answer: string | number | string[]; // depende de tipo
  skipped: boolean;
  answeredAt: Date;
}
// Vista consolidada: user_phenotype (jsonb_object_agg de respuestas)
```

### 2.5 · `user_chronotype`
```ts
interface UserChronotype {
  type: 'leon' | 'oso' | 'lobo';
  transitionalState: 'delfin' | null; // NO es cronotipo · estado transitorio hacia madre
  wakeTime: string; // '06:30'
  sleepTime: string; // '22:30'
  peakFocusWindow: [string, string];
  computedAt: Date;
}
```

### 2.6 · `user_cycle_phase` (solo mujeres pre-menopáusicas · si aplica)
```ts
interface UserCyclePhase {
  currentPhase: 'follicular' | 'ovulatory' | 'luteal' | 'menstrual';
  cycleDay: number; // 1-28+
  cycleLength: number; // típica
  lastPeriodStart: Date;
  regularity: 'regular' | 'irregular' | 'perimenopausal';
}
```

### 2.7 · `profiles` (perfil base)
```ts
interface Profile {
  age: number;
  gender: 'male' | 'female' | 'non_binary';
  pregnancy: boolean;
  lactancia: boolean;
  conditions: string[]; // ['diabetes_tipo_1', 'hashimoto', 'embarazo_1er_trimestre', ...]
  medications: string[]; // ['ozempic', 'metformina', ...]
  fitzpatrickType?: 1 | 2 | 3 | 4 | 5 | 6;
  weight_kg?: number;
  height_cm?: number;
  bodyFat_pct?: number;
}
```

### 2.8 · Fenotipo consolidado (input real del motor)

```ts
interface UserPhenotype {
  userId: string;
  dxLevels: DXLevel[];
  braverman: BravermanResult | null;
  labs: UserLab[];
  quizAnswers: QuizAnswer[];
  chronotype: UserChronotype | null;
  cyclePhase: UserCyclePhase | null;
  profile: Profile;
  fetchedAt: Date;
}
```

---

## 3 · Función core del motor

### 3.1 · Signature TypeScript

```ts
// src/services/interventions/personalize-interventions.ts

import type { UserPhenotype } from './types';
import type { Intervention } from '@/constants/interventions-catalog';

interface PrescribedIntervention {
  intervention: Intervention;
  score: number; // 0-100 · qué tan match es para este user
  rank: number; // 1-5
  isUniversalP1: boolean;
  rationale: {
    summary: string; // "Basado en tu Nivel 2 circadiano + acetilcolina baja..."
    reasons: RationaleReason[]; // desglose por qué
    epigeneticImpact: string; // 1 línea qué esperar
  };
  cyclePhaseNote?: string; // solo si intervencion cycle-modulated + user es mujer
  contraindicationChecked: string[]; // qué contraindicaciones verificamos
  suggestedBiomarkers: {
    tier1: string[]; // accesibles · pedir de default
    tier2: string[]; // pedir si señal específica
    tier3: string[]; // solo si diferencial crítico
  };
}

interface RationaleReason {
  source: 'dx_level' | 'braverman' | 'lab' | 'quiz' | 'chronotype' | 'cycle' | 'profile' | 'universal';
  detail: string; // "Nivel 2 circadiano" · "acetilcolina baja Braverman" · "vitamina D <30 ng/mL"
  impact: 'high' | 'medium' | 'low'; // peso en el score final
}

export function personalizeInterventions(
  phenotype: UserPhenotype,
  catalog: Intervention[] = INTERVENTIONS_CATALOG,
): PrescribedIntervention[] {
  // 1. Filtrar por contraindicaciones absolutas (hard exclude)
  const eligible = catalog.filter(i => !isContraindicated(i, phenotype));

  // 2. Calcular score para cada intervención elegible
  const scored = eligible.map(i => ({
    intervention: i,
    score: computeScore(i, phenotype),
    matchReasons: findMatchReasons(i, phenotype),
  }));

  // 3. Separar universales P1 (siempre elegibles) del resto
  const universalsP1 = scored.filter(s => s.intervention.isUniversal && s.intervention.priority === 1);
  const rest = scored.filter(s => !(s.intervention.isUniversal && s.intervention.priority === 1));

  // 4. Ordenar rest por score descendente
  rest.sort((a, b) => b.score - a.score);

  // 5. Top 5 = universales P1 aplicables + top rest hasta llenar 5
  const top5 = selectTop5(universalsP1, rest, phenotype);

  // 6. Generar rationale personalizado por cada uno
  return top5.map((s, idx) => ({
    intervention: s.intervention,
    score: s.score,
    rank: idx + 1,
    isUniversalP1: s.intervention.isUniversal && s.intervention.priority === 1,
    rationale: generateRationale(s, phenotype),
    cyclePhaseNote: getCyclePhaseNote(s.intervention, phenotype),
    contraindicationChecked: getContraindicationsChecked(s.intervention, phenotype),
    suggestedBiomarkers: categorizeBiomarkersByTier(s.intervention.epigeneticImpact?.biomarkers ?? []),
  }));
}
```

### 3.2 · Función helper `isContraindicated`

```ts
function isContraindicated(intervention: Intervention, phenotype: UserPhenotype): boolean {
  const contraindications = intervention.contraindications ?? [];
  if (contraindications.length === 0) return false;

  // Match string-based contra con profile.conditions + profile flags + fever recent + etc.
  const userState = buildUserState(phenotype);

  return contraindications.some(contra => matchesUserState(contra, userState));
}

function buildUserState(phenotype: UserPhenotype): Set<string> {
  const state = new Set<string>();

  // Profile conditions directos
  phenotype.profile.conditions.forEach(c => state.add(c));

  // Embarazo · lactancia
  if (phenotype.profile.pregnancy) state.add('embarazo');
  if (phenotype.profile.lactancia) state.add('lactancia');

  // Edad flags
  if (phenotype.profile.age < 18) state.add('menor_edad');
  if (phenotype.profile.age >= 65) state.add('adulto_mayor_65');
  if (phenotype.profile.age >= 70) state.add('adulto_mayor_70');

  // Fiebre viral activa (últimas 48h desde quiz diario o self-report)
  if (hasActiveFeverInLast48h(phenotype)) {
    state.add('fiebre_viral_activa_37_8_o_mas');
    state.add('infeccion_respiratoria_aguda_fase_temprana');
  }

  // Medicamentos flag
  phenotype.profile.medications.forEach(m => state.add(`medication_${m}`));

  // Antecedentes ciclo
  if (phenotype.cyclePhase?.regularity === 'perimenopausal') state.add('perimenopausia');

  // Cycle phase actual (para intervenciones cycle-modulated)
  if (phenotype.cyclePhase) {
    state.add(`cycle_${phenotype.cyclePhase.currentPhase}`);
  }

  return state;
}

function matchesUserState(contra: string, userState: Set<string>): boolean {
  // Match directo o parcial · ej. 'embarazo' match 'embarazo_1er_trimestre' también
  return userState.has(contra) || Array.from(userState).some(s => s.includes(contra) || contra.includes(s));
}
```

---

## 4 · Sistema de scoring (5-tier weighted)

### 4.1 · Fórmula de score

```
score = baseScore + boostBonus + relevanceMultiplier - noiseFactor

donde:
- baseScore = 20 (todas las intervenciones válidas empiezan con 20)
- boostBonus = suma de matches boostIf ejecutados (cada match aporta boostWeight × 10)
- relevanceMultiplier = qué tan alineado con dolor mayor del user (0-30 puntos extra)
- noiseFactor = penalización por conflictos suaves (cold post-fuerza si user entrena tarde, etc.) (0-10 penalidad)

score cap: 100
```

### 4.2 · Función `computeScore`

```ts
function computeScore(intervention: Intervention, phenotype: UserPhenotype): number {
  let score = 20; // base

  const rules = intervention.recommendationRules;
  const boostWeight = rules?.boostWeight ?? 1;

  // 4.2.1 · Match boostIf rules
  if (rules?.boostIf) {
    for (const rule of rules.boostIf) {
      if (matchesRule(rule, phenotype)) {
        score += boostWeight * 10;
      }
    }
  }

  // 4.2.2 · Universales P1 lift (always base 60 min · si contraindicado ya se filtró)
  if (intervention.isUniversal && intervention.priority === 1) {
    score = Math.max(score, 60);
  }

  // 4.2.3 · Relevance multiplier (basado en dolor mayor del user)
  const painMatch = matchesUserPain(intervention, phenotype);
  score += painMatch * 30;

  // 4.2.4 · Cycle phase boost (bidireccional · doctrina)
  const cycleBoost = getCyclePhaseBoost(intervention, phenotype);
  score += cycleBoost;

  // 4.2.5 · Noise factor (conflictos suaves)
  score -= getNoiseFactor(intervention, phenotype);

  return Math.min(Math.max(Math.round(score), 0), 100);
}
```

### 4.3 · `matchesRule` para cada tipo de `RecommendationRule`

```ts
function matchesRule(rule: RecommendationRule, phenotype: UserPhenotype): boolean {
  switch (rule.source) {
    case 'dx_level': {
      const dxLevel = phenotype.dxLevels.find(d => d.system === rule.system);
      if (!dxLevel) return false;
      return applyOperator(dxLevel.level, rule.operator, rule.value);
    }
    case 'braverman': {
      if (!phenotype.braverman) return false;
      const nt = phenotype.braverman[rule.neurotransmitter];
      return nt === rule.threshold;
    }
    case 'lab': {
      const lab = phenotype.labs.find(l => l.marker === rule.marker);
      if (!lab) return false;
      return applyOperator(lab.value, rule.operator, rule.value);
    }
    case 'profile': {
      const value = (phenotype.profile as any)[rule.field];
      if (rule.equals !== undefined) return value === rule.equals;
      if (rule.in) return rule.in.includes(value);
      return false;
    }
    case 'quiz': {
      const answer = phenotype.quizAnswers.find(q =>
        q.section === rule.questionnaire && !q.skipped
      );
      if (!answer) return false;
      // Requiere lógica de scoring quiz → 'low'/'medium'/'high' por dimensión
      return computeQuizScore(rule.questionnaire, phenotype) === rule.score;
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
    default: return false;
  }
}
```

### 4.4 · `getCyclePhaseBoost` (doctrina bidireccional)

```ts
function getCyclePhaseBoost(intervention: Intervention, phenotype: UserPhenotype): number {
  if (!phenotype.cyclePhase || phenotype.profile.gender !== 'female') return 0;

  const cycleAware = intervention.recommendationRules?.boostIf?.some(r => r.source === 'cycle_phase');
  if (!cycleAware) return 0;

  const phase = phenotype.cyclePhase.currentPhase;
  const highIntensityInterventions = [
    'ayuno_18_6', 'ayuno_20_4_omad', 'vo2max_training', 'levantamiento_compuesto',
    'ejercicio_ayuno_fuerza', 'cold_plunge_cns', 'wim_hof_extendido',
  ];

  // Fase folicular + ovulatoria → INTENSIFICAR (boost +20)
  if ((phase === 'follicular' || phase === 'ovulatory') && highIntensityInterventions.includes(intervention.key)) {
    return 20;
  }

  // Fase lútea + menstrual → REDUCIR intensidad (penalty -15)
  if ((phase === 'luteal' || phase === 'menstrual') && highIntensityInterventions.includes(intervention.key)) {
    return -15;
  }

  return 0;
}
```

### 4.5 · `matchesUserPain` (relevance multiplier)

Cada objetivo declarado por el user en cuestionario B.1 (Objetivos) + B.2 (dolor mayor) mapea a categorías/roots del catálogo. Match completo = 1, parcial = 0.5, no match = 0.

```ts
const USER_GOAL_TO_CATEGORIES = {
  'mas_energia': ['energia', 'mitocondrial', 'circadiano'],
  'dormir_mejor': ['sueno', 'circadiano', 'estres'],
  'bajar_grasa': ['metabolismo', 'mitocondrial', 'nutricion'],
  'ganar_musculo': ['movimiento', 'sarcopenia', 'hormonal'],
  'foco_concentracion': ['cognitivo', 'atencion', 'contemplativo'],
  'salud_mental': ['cognitivo', 'contemplativo', 'estres', 'ansiedad'],
  'longevidad': ['mitocondrial', 'metabolismo', 'inflamacion', 'sarcopenia'],
  'mejor_libido': ['hormonal', 'metabolismo'],
  'reducir_dolor': ['inflamacion', 'movimiento'],
  'vitalidad_general': ['energia', 'mitocondrial', 'circadiano'],
};
```

---

## 5 · Selección top 5 (universales P1 primero)

```ts
function selectTop5(
  universalsP1: ScoredIntervention[],
  rest: ScoredIntervention[],
  phenotype: UserPhenotype,
): ScoredIntervention[] {
  // 5.1 · Universales P1 aplicables (no contraindicados · ya filtrados) siempre entran
  // Hasta max 3 universales P1 para dejar espacio a especificas del user
  const universalsToUse = universalsP1.slice(0, 3);

  // 5.2 · Espacio restante para especificas
  const specificSlots = 5 - universalsToUse.length;

  // 5.3 · Top especificas (evitando duplicar familia si posible · ej. no 2 ayunos)
  const specifics = deduplicateByFamily(rest).slice(0, specificSlots);

  return [...universalsToUse, ...specifics];
}

function deduplicateByFamily(scored: ScoredIntervention[]): ScoredIntervention[] {
  const seenFamilies = new Set<string>();
  const result: ScoredIntervention[] = [];

  for (const s of scored) {
    const family = s.intervention.family;
    if (family && seenFamilies.has(family)) continue;
    if (family) seenFamilies.add(family);
    result.push(s);
  }

  return result;
}
```

---

## 6 · Generación de rationale (narrativa "por qué a TI")

Este es el bloque que hace que el user sienta que ATP entendió su fenotipo específico. **Determinístico** (no LLM en el core) · ARGOS puede narrar encima opcional (V1.5).

```ts
function generateRationale(
  scored: ScoredIntervention,
  phenotype: UserPhenotype,
): PrescribedIntervention['rationale'] {
  const reasons = scored.matchReasons.map(reasonToText);
  const summary = buildSummarySentence(reasons, scored.intervention);
  const epigeneticImpact = buildEpigeneticImpactSentence(scored.intervention, phenotype);

  return { summary, reasons, epigeneticImpact };
}

function buildSummarySentence(
  reasons: RationaleReason[],
  intervention: Intervention,
): string {
  // Ejemplo output:
  // "Basado en tu Nivel 2 circadiano, tu acetilcolina baja (Braverman) y tu
  //  vitamina D en 22 ng/mL, ATP prioriza esta intervención para ti."

  if (intervention.isUniversal && intervention.priority === 1) {
    return `Base innegociable · Universal P1 para todos. En tu perfil aporta especialmente por: ${reasons.slice(0, 2).map(r => r.detail).join(' + ')}.`;
  }

  const topReasons = reasons.filter(r => r.impact === 'high').slice(0, 3);
  const reasonsList = topReasons.map(r => r.detail).join(' + ');
  return `Basado en tu ${reasonsList}, ATP prioriza esta intervención para ti.`;
}

function buildEpigeneticImpactSentence(
  intervention: Intervention,
  phenotype: UserPhenotype,
): string {
  const impact = intervention.epigeneticImpact;
  if (!impact) return '';

  // Ejemplo output:
  // "Esperado: activa SIRT1 y AMPK · reduce PCR-hs · mejora HRV. Biomarcadores
  //  a monitorear: HbA1c, insulina ayunas."

  const activates = (impact.activates ?? []).slice(0, 2).join(' + ');
  const modulates = (impact.modulates ?? []).slice(0, 2).join(' + ');
  const biomarkersTier1 = (impact.biomarkers ?? []).filter(b => isTier1Biomarker(b)).slice(0, 3).join(', ');

  let sentence = '';
  if (activates) sentence += `Activa ${activates}. `;
  if (modulates) sentence += `Modula ${modulates}. `;
  if (biomarkersTier1) sentence += `Monitorear: ${biomarkersTier1}.`;

  return sentence.trim();
}
```

### 6.1 · Ejemplo de output completo

**User:** mujer 34 años, folicular día 8, Nivel 2 circadiano, Nivel 3 estrés, Braverman acetilcolina low + dopamine low, PCR 1.8 (elevada), vitamina D 25 (baja), objetivo "más energía + foco".

**Top 5 prescritas:**

1. **Exposición solar matutina** (Score 92 · Universal P1)
   - Rationale summary: *"Base innegociable · Universal P1 para todos. En tu perfil aporta especialmente por: tu Nivel 2 circadiano + tu vitamina D en 25 ng/mL (bajo)."*
   - Epigenético: *"Activa PER1 + CRY2 (photoentrainment) + síntesis endógena vitamina D3. Modula cortisol_ritmo + serotonina baseline. Monitorear: 25-OH-vitamina D, cortisol matutino, sueño profundo horas."*

2. **Hidratación matutina 500ml** (Score 78 · Universal P1)
   - Rationale summary: *"Base innegociable · en tu perfil aporta por: tu Nivel 2 circadiano + tu digestión_estres_autonomico activa (dispepsia funcional en quiz)."*
   - Epigenético: *"Activa peristalsis colónica + AQP4 cerebral. Modula cortisol_ritmo matutino sano."*

3. **Grounding 10-15 min** (Score 86 · Universal P1)
   - Rationale summary: *"Base innegociable · en tu perfil aporta por: tu PCR en 1.8 (inflamación silenciosa activa) + tu Nivel 3 estrés + tu HRV baja crónica reportada."*
   - Epigenético: *"Inhibe NF-κB + estrés oxidativo. Modula HRV + cortisol. Monitorear: PCR-hs, IL-6, HRV RMSSD."*

4. **Coherencia cardíaca 5-5** (Score 88)
   - Rationale summary: *"Basado en tu Nivel 3 estrés + tu HRV baja crónica + tu Braverman dopamine low, ATP prioriza esta intervención para ti."*
   - Cycle note: *"Ideal en tu fase folicular actual — máximo aprovechamiento del entrenamiento vagal."*
   - Epigenético: *"Activa tono vagal + baroreflex. Modula HRV RMSSD. Monitorear: HRV RMSSD, cortisol_salival_curva."*

5. **Ventana de alimentación 16:8 cycle-aware** (Score 76 · Universal P1 con boost cycle)
   - Rationale summary: *"Base innegociable · en tu fase folicular actual, ventana ampliada 16:8 es óptima. Cambiar a 14:10 en fase lútea (día ~22)."*
   - Cycle note: *"Folicular = intensificar OK. Lútea = escuchar tu cuerpo, ampliar ventana."*
   - Epigenético: *"Activa autofagia + SIRT1 + BMAL1 hepático. Modula sensibilidad insulina. Monitorear: HbA1c, insulina ayunas, glucosa."*

**Nota importante para user:** *"Estas 5 son tus prescritas hoy. Ya activas grounding · perfecto. Considera agregar coherencia cardíaca esta semana (5-10 min AM). Las otras 83 intervenciones del catálogo existen pero para tu perfil hoy no mueven la aguja tanto. Cuando subas de nivel, ATP recalcula."*

---

## 7 · Schema SQL nueva tabla

```sql
-- Migración 200_user_prescribed_interventions.sql

CREATE TABLE user_prescribed_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intervention_key VARCHAR(100) NOT NULL, -- FK conceptual a interventions-catalog.ts
  rank INTEGER NOT NULL, -- 1-5
  score INTEGER NOT NULL, -- 0-100
  is_universal_p1 BOOLEAN NOT NULL DEFAULT false,
  rationale JSONB NOT NULL, -- summary + reasons + epigeneticImpact
  cycle_phase_note TEXT NULL,
  contraindication_checked TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  suggested_biomarkers_tier1 TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  suggested_biomarkers_tier2 TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  suggested_biomarkers_tier3 TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Versión + timestamps
  phenotype_snapshot_hash VARCHAR(64) NOT NULL, -- hash del UserPhenotype al momento
  prescribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  superseded_at TIMESTAMPTZ NULL, -- cuando el motor recalcula y esta prescripción deja de ser vigente

  CONSTRAINT rank_range CHECK (rank BETWEEN 1 AND 5),
  CONSTRAINT score_range CHECK (score BETWEEN 0 AND 100)
);

-- Índices
CREATE INDEX idx_user_prescribed_current
  ON user_prescribed_interventions(user_id, prescribed_at DESC)
  WHERE superseded_at IS NULL;

CREATE INDEX idx_user_prescribed_history
  ON user_prescribed_interventions(user_id, prescribed_at DESC);

-- RLS
ALTER TABLE user_prescribed_interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_prescribed_own_data ON user_prescribed_interventions
  FOR ALL USING (auth.uid() = user_id);

-- Vista "current top 5" para el motor + Mi Protocolo
CREATE VIEW user_current_prescription AS
SELECT *
FROM user_prescribed_interventions
WHERE superseded_at IS NULL
ORDER BY user_id, rank;
```

---

## 8 · Casos sintéticos de prueba (test fixtures)

Fable debe implementar tests con estos 6 perfiles para validar el motor.

### 8.1 · Perfil A · Hombre 45 años, sedentario, obesidad grado 1
- DX: metabolismo Nivel 1, mitocondrial Nivel 2, sueño Nivel 3
- Braverman: dopamine low, GABA medium
- Labs: HbA1c 6.1, insulina 15, HOMA-IR 3.2, TG 180, HDL 38, PCR 2.3
- Objetivos: bajar grasa + más energía
- **Esperado:** top 5 debe incluir ventana alimentación + zona 2 aeróbica + sol matutino + eliminar aceites vegetales + grounding

### 8.2 · Perfil B · Mujer 34 años, folicular, biohacker principiante
- DX: circadiano Nivel 2, estrés Nivel 3
- Braverman: acetylcholine low, dopamine low
- Labs: PCR 1.8, vit D 25, cortisol AM alto
- Cycle: folicular día 8
- Objetivos: más energía + foco
- **Esperado:** top 5 debe incluir sol matutino + coherencia cardíaca + grounding + ventana 16:8 (con boost cycle) + hidratación matutina

### 8.3 · Perfil C · Mujer 34 años, lútea (mismo user día 22)
- Todo igual que Perfil B pero cycle: luteal día 22
- **Esperado:** top 5 debe REDUCIR intensidad · ayuno 14:10 en vez de 16:8 · no VO2max · sí caminar postprandial · agregar respiración nocturna

### 8.4 · Perfil D · Adulto mayor 68 años, sarcopenia inicial
- DX: composición_corporal Nivel 2, cardiovascular Nivel 3, cognitivo Nivel 4
- Labs: HbA1c 5.8, apoB alto, DHEA-S bajo
- **Esperado:** top 5 debe incluir levantamiento compuesto + farmers walk + zona 2 + sardinas + coherencia cardíaca (evitar ayuno OMAD por edad, evitar cold plunge intenso)

### 8.5 · Perfil E · Embarazada 2do trimestre
- Profile: pregnancy=true, gender=female
- **Esperado:** motor debe EXCLUIR toda intervención con contraindicación embarazo (OMAD, ayuno prolongado, sardinas grandes dosis, sauna intensa, cold plunge, Wim Hof, etc.). Top 5 debe ser suave: sol matutino + hidratación + grounding + coherencia cardíaca + caminata postprandial

### 8.6 · Perfil F · User con fiebre viral activa (reportada quiz diario)
- Base: cualquier perfil
- Estado agudo: fever_viral_active=true (últimas 48h)
- **Esperado:** motor debe EXCLUIR todas las cold interventions. Top 5 debe favorecer: descanso implícito, hidratación matutina (con nota de tés funcionales), sol matutino ventana corta OK, respiración nocturna, journal PM

---

## 9 · Reglas de negocio adicionales

### 9.1 · Recálculo del top 5

El motor recalcula automáticamente cuando:
- User completa nuevo cuestionario o levantamiento
- User sube nuevos labs
- User cambia perfil (embarazo declarado, condición nueva)
- Cambio de fase del ciclo (si mujer)
- Trigger manual del user ("recalcular mi protocolo")
- **NUNCA recalcular por default cada apertura de app** — respetar consistencia

Marca las prescripciones anteriores con `superseded_at = now()`.

### 9.2 · Interacción con `user_interventions` (activas del user)

El motor SUGIERE top 5. El user decide qué ACTIVAR (queda en `user_interventions`). El motor NO auto-activa. Doctrina: guiado no prisionero.

Si user ya tiene N intervenciones activas:
- Si N < 5 → sugerencias completan a 5 (excluyendo las ya activas)
- Si N ≥ 5 → sugerencias siguen visibles pero con label "considera activar en vez de X"

### 9.3 · Universales P1 tratamiento especial

Los 7 universales P1 siempre son elegibles a menos que contraindicación absoluta aplique. En perfiles muy comprometidos (nivel 1 en 3+ sistemas), motor da EXTRA lift a universales P1 vs específicas.

### 9.4 · Copy anti-abrumar

Cuando el user tiene 9+ intervenciones activas, motor emite warning en `PrescribedIntervention.contextNote`:
- *"Trabajas 9+ intervenciones. Doctrina Humby: menos, mejor. Considera pausar algunas para lograr consistencia."*

---

## 10 · Extensibilidad V1.5 (ARGOS narrativa encima)

En V1.5, ARGOS agrega una capa de narrativa cálida encima del rationale determinístico. Signature:

```ts
async function argosEnhanceRationale(
  prescription: PrescribedIntervention,
  phenotype: UserPhenotype,
): Promise<string> {
  // Prompt determinístico enviado a argos-proxy con contexto completo
  // Devuelve prosa cálida que integra los factors del rationale con tono ARGOS
  // Fallback: si ARGOS falla o rate limit → usa summary determinístico raw
}
```

El motor **NO depende de LLM** para funcionar. LLM es solo capa de narrativa opcional.

---

## 11 · Test guards obligatorios (Fable implementa)

- ✅ 6 perfiles sintéticos (arriba) devuelven top 5 esperado
- ✅ Contraindicaciones absolutas se respetan (embarazo, fiebre viral, diabetes 1)
- ✅ Universales P1 nunca se excluyen sin razón absoluta
- ✅ Cycle bidireccional: mismo user en folicular vs lútea recibe recomendaciones distintas
- ✅ Fiebre viral activa filtra todas las cold interventions
- ✅ Deduplicación por familia (no 2 ayunos en top 5 simultáneos)
- ✅ Rationale summary tiene ≥1 razón concreta al fenotipo (no genérico)
- ✅ suggested_biomarkers respeta Tier 1/2/3 correctamente
- ✅ Recálculo genera nueva versión + superseded_at correcto
- ✅ Motor no llama LLM en el core (verificar puro determinismo)

---

## 12 · Handoff a Fable · lo que Fable implementa

### Fase A (8-12h estimadas)
1. **Migración 200** — tabla `user_prescribed_interventions` + vista `user_current_prescription`
2. **`src/services/interventions/personalize-interventions.ts`** — función `personalizeInterventions()` completa con helpers
3. **`src/services/interventions/prescription-service.ts`** — servicio Supabase que persiste + versiona prescripciones
4. **Tests unitarios** con los 6 perfiles sintéticos
5. **Edge Function `motor-personalization`** (opcional · si Enrique quiere runtime server-side) — llama función core, persiste en DB

### Fase B (4-8h estimadas)
6. **UI Mi Protocolo** consume `user_current_prescription` en vez de mostrar catálogo completo
7. **Botón "Recalcular mi protocolo"** dispara el motor
8. **Cards con rationale visible + biomarcadores sugeridos** (Tier 1/2/3 tabs)
9. **Copy "estas otras 83 intervenciones existen pero para ti hoy no mueven la aguja tanto"**

### Fase C (V1.5 · post-beta)
10. **ARGOS narrativa** encima (task #47 ya cerrada · reactivar con argos-proxy)
11. **Recálculo automático triggers** (cuestionario nuevo, labs nuevos, cambio fase ciclo)

---

## 13 · Fuentes de verdad (para que Fable no invente)

- `src/constants/interventions-catalog.ts` — catálogo enriquecido (88 intervenciones)
- `src/constants/intervention-vocab.ts` — categorías + roots
- `R and D/MAPEO_EPIGENETICO_INTERVENCIONES_v1.md` — doctrina + jerarquía multi-paradigma
- `R and D/CUESTIONARIO_MAESTRO_ATP_v1.md` — dimensiones scoring quiz
- Memoria: 11 doctrinas raíz (posicionamiento + epigenética + no matar placebo + ciclo bidireccional + fiebre v2 + plantas vs suplementos + biomarcadores tier + etc.)
- `R and D/RESEARCH_MAPEO_BATCH_A/B/C_2026-07-14.md` — mapeo por intervención

---

## 14 · Sinopsis para Enrique

Este motor toma el fenotipo epigenético COMPLETO del user (DX + Braverman + labs + cuestionario + ciclo + profile) y devuelve **5 prescritas con narrativa "por qué a TI"**. Determinístico (reproducible, testeable), transparente (rationale visible), personalizado (no catálogo abierto), respeta las 11 doctrinas raíz.

Universales P1 siempre primero cuando aplican. Específicas al fenotipo llenan el resto. Cycle bidireccional en mujeres. Fiebre viral filtra cold. Biomarcadores en tiers para no cargar labs caros por default.

Cuando Fable lo implemente + Cuestionario Maestro tenga UI, ATP pasa de "app con catálogo" a **"app de prescripción funcional personalizada real"**. Ese es el edge que hace ATP diferente del wellness pop.

Firma clínica: Mariana + Enrique 2026-07-14 (via delivery integración catálogo).

— Cowork
