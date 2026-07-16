/**
 * personalize-types — tipos del Motor de Personalización (arquitectura v1 §2).
 *
 * El fenotipo consolidado (UserPhenotype) es el ÚNICO input del motor: 7 fuentes
 * de verdad del user. El output es PrescribedIntervention[] (top 5 con rationale
 * determinístico "por qué a TI"). Cero dependencias de react-native/supabase —
 * este archivo es puro types, importable desde tests node-only.
 */
import type { Intervention } from '@/src/constants/interventions-catalog';

// ── 2.1 · DX (Levantamientos) ────────────────────────────────────────────────

export type SystemName =
  | 'circadiano' | 'metabolico' | 'digestivo' | 'inflamatorio'
  | 'estres_neuroendocrino' | 'sueno' | 'hormonal' | 'cognitivo'
  | 'cardiovascular' | 'composicion_corporal' | 'mitocondrial';

export interface DXLevel {
  /**
   * Sistema en el vocabulario REAL del catálogo ('metabolismo','estres','sueno',
   * 'circadiano','digestion','inflamacion','cardiovascular','cognitivo','hormonal',
   * 'energia','inmunologico','movimiento','composicion_corporal','mitocondrial').
   * Es `string` (no SystemName) porque el catálogo — fuente de verdad de las reglas
   * dx_level — usa un vocabulario más amplio/distinto que el SystemName aspiracional.
   */
  system: string;
  level: 1 | 2 | 3 | 4 | 5; // 1=roto · 5=optimizado
  computedAt: Date;
  confidence: 'low' | 'medium' | 'high';
}

// ── 2.2 · Braverman ──────────────────────────────────────────────────────────

export type NeurotransmitterLevel = 'low' | 'medium' | 'high';

export interface BravermanResult {
  dopamine: NeurotransmitterLevel;
  acetylcholine: NeurotransmitterLevel;
  gaba: NeurotransmitterLevel;
  serotonin: NeurotransmitterLevel;
  computedAt: Date;
}

// ── 2.3 · Labs ───────────────────────────────────────────────────────────────

export interface UserLab {
  marker: string; // canonicalizado · ej. 'HbA1c'
  value: number;
  unit: string;
  measuredAt: Date;
  tier: 1 | 2 | 3; // Tier 1=accesible · 3=sofisticado
  source: 'user_upload' | 'wearable' | 'partner_lab';
}

// ── 2.4 · Cuestionario Maestro ───────────────────────────────────────────────

export interface QuizAnswer {
  section: string; // 'd1_estado_cuerpo' · 'b1_objetivos' · etc.
  questionCode: string; // 'D1.1'
  answer: string | number | string[];
  skipped: boolean;
  answeredAt: Date;
}

// ── 2.5 · Cronotipo ──────────────────────────────────────────────────────────

export interface UserChronotype {
  type: 'leon' | 'oso' | 'lobo';
  /** Delfín NO es cronotipo — estado transitorio hacia el tipo madre. */
  transitionalState: 'delfin' | null;
  wakeTime: string; // '06:30'
  sleepTime: string; // '22:30'
  peakFocusWindow: [string, string];
  computedAt: Date;
}

// ── 2.6 · Ciclo (solo mujeres pre-menopáusicas) ─────────────────────────────

export type CyclePhaseName = 'follicular' | 'ovulatory' | 'luteal' | 'menstrual';

export interface UserCyclePhase {
  currentPhase: CyclePhaseName;
  cycleDay: number;
  cycleLength: number;
  lastPeriodStart: Date;
  regularity: 'regular' | 'irregular' | 'perimenopausal';
}

// ── 2.7 · Profile base ───────────────────────────────────────────────────────

export interface Profile {
  age: number;
  gender: 'male' | 'female' | 'non_binary';
  pregnancy: boolean;
  lactancia: boolean;
  conditions: string[]; // ['diabetes_tipo_1', 'hashimoto', ...]
  medications: string[]; // ['ozempic', 'metformina', ...]
  /** Objetivos declarados del user (cuestionario B.1/B.2 · onboarding goal). */
  goals?: string[]; // ['mas_energia', 'foco_concentracion', ...]
  /** Fiebre viral activa reportada en las últimas 48h (quiz diario / self-report). */
  feverViralActive?: boolean;
  fitzpatrickType?: 1 | 2 | 3 | 4 | 5 | 6;
  weight_kg?: number;
  height_cm?: number;
  bodyFat_pct?: number;
}

// ── 2.8 · Fenotipo consolidado (input real del motor) ───────────────────────

export interface UserPhenotype {
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

// ── Output del motor ─────────────────────────────────────────────────────────

export type RationaleSource =
  | 'dx_level' | 'braverman' | 'lab' | 'quiz' | 'chronotype' | 'cycle' | 'profile' | 'universal';

export interface RationaleReason {
  source: RationaleSource;
  detail: string; // "Nivel 2 circadiano" · "vitamina D en 25 ng/mL (bajo)"
  impact: 'high' | 'medium' | 'low';
}

export interface SuggestedBiomarkers {
  tier1: string[]; // accesibles · pedir de default
  tier2: string[]; // pedir si señal específica
  tier3: string[]; // solo si diferencial crítico
}

export interface PrescribedIntervention {
  intervention: Intervention;
  score: number; // 0-100
  rank: number; // 1-5
  isUniversalP1: boolean;
  rationale: {
    summary: string;
    reasons: RationaleReason[];
    epigeneticImpact: string;
  };
  cyclePhaseNote?: string;
  /** Warning del motor (doctrina Humby 9+ activas) — la UI lo muestra si viene. */
  contextNote?: string;
  contraindicationChecked: string[];
  suggestedBiomarkers: SuggestedBiomarkers;
}

/** Intervención con score intermedio (pre-rationale) — interno del motor. */
export interface ScoredIntervention {
  intervention: Intervention;
  score: number;
  matchReasons: RationaleReason[];
}
